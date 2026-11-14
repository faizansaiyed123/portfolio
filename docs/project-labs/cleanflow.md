# CleanFlow — source audit and recruiter demo design

Audit date: 14 November 2026

Repositories:
- Frontend: https://github.com/faizansaiyed123/cleanflow_frontend
- Backend: https://github.com/faizansaiyed123/cleanflow_backend

## Product understood from source

CleanFlow is a commercial-cleaning operations product connecting customer intake and quoting to recurring service delivery and billing. It has three distinct experiences:
- Public prospect website and quote-request form.
- Internal operations workspace for owners/managers and field employees.
- Customer portal for customers to review quotes, contracts, schedules, job history and invoices.

Its central domain workflow is:

**Public quote request → lead → customer/property → priced quote → customer acceptance → contract → recurring schedule → generated jobs → employee field execution → completion/checklist/photos → invoice → manual payment record → customer history/feedback.**

Additional capabilities include service catalog/pricing rules, quote PDFs, contract lifecycle, schedule exceptions, calendar, employee/role management, analytics/reporting, audit logs, in-app notifications, feature flags, search, uploads and outbound webhooks.

## Architecture verified from source

- Frontend: React + Vite SPA with role-aware routes for Owner/Manager, Employee and Customer.
- Backend: FastAPI, SQLAlchemy 2, Pydantic 2 and Alembic.
- Configured database default is local SQLite (`sqlite:///./cleanflow.db`); the application can be pointed at another SQLAlchemy-supported database via `DATABASE_URL`.
- Application startup calls `Base.metadata.create_all`, initializes default feature flags and rebuilds the search index.
- Authentication uses bcrypt password hashes and JWT bearer tokens.
- Frontend stores the bearer token in `localStorage` and attaches it as an Authorization header.
- Role/customer authorization is applied in FastAPI dependencies and object-level access checks.
- APScheduler runs an in-process background worker. It drains the transactional domain-event outbox, generates recurring jobs, expires quotes/refreshes invoice status, sends webhook deliveries and refreshes search/analytics.
- Uploads are stored on local disk under `UPLOAD_ROOT`; configured limit defaults to 8 MB and allowed MIME types default to JPEG, PNG and WebP.
- PDF generation uses ReportLab; metrics are exposed in Prometheus format.
- No Dockerfile, Compose stack or production deployment manifest was found in the inspected repository trees.

## Important findings from source inspection

### This is a single-company application, not a multi-tenant SaaS

- The domain models and routers use global company data rather than an `organization_id`/tenant ID on each record.
- Owner and Manager roles can access internal operational data; Employee has a narrower field role; Customer routes check the record's `customer_id` against the authenticated user's linked customer.
- The quote, contract, invoice and job routes explicitly enforce customer ownership for Customer users. Tests verify a customer cannot list all customers or read another customer's record.
- Owner-only access is enforced for user administration, audit logs, webhooks and other sensitive settings.
- There is no organisation/tenant abstraction that can safely partition several recruiters inside one shared database.

Consequently, a single shared public login or shared writable seed database is unsafe. A visitor could see other visitors' leads, customers, quotes, schedules, jobs, invoices and uploads, and concurrent edits could interfere.

**Recommended isolation:** create a fresh disposable database/data-store for each visitor session from a known synthetic baseline, then bind the session to that store at the API layer. Alternatively, add a proper first-class tenant/company boundary throughout models, queries and authorization before sharing one database. Do not fake tenant isolation by hiding frontend rows.

### Public intake and account provisioning

- `POST /api/public/quote-requests` is intentionally unauthenticated and rate-limited. It creates a Lead, records an audit event and publishes a `LEAD_CREATED` outbox event.
- The frontend exposes this public quote form; public service/marketing pages are not a backend simulation.
- Internal staff accounts are created through the owner-only user administration endpoint. There is no public signup endpoint.
- When staff creates a quote from a lead, `_ensure_customer_for_quote` converts/links the lead to a Customer and automatically provisions a Customer portal user if no account already exists.
- That portal user currently receives the hard-coded temporary password `Welcome123!`. The code comments describe this as a demo simplification in place of a real set-password invitation flow.
- This is not appropriate for a public recruiter environment. Generate a unique random, single-use activation/reset path per synthetic customer or provision temporary per-session credentials; never reuse a universal portal password.

### Quote generation and acceptance are real domain logic

- The pricing engine loads the configured active pricing rule for the property's type and combines base rate, square footage, bathrooms, floors, supplies, frequency adjustments, special-condition surcharges and selected add-on services.
- It persists the pricing breakdown on the Quote so historical quotes do not change when future pricing settings change.
- Quote state moves through Draft, Sent, Viewed, Accepted/Rejected/Expired. Customer users may only access their own quote.
- Quote acceptance checks its current state and validity period, then activates a Contract, copies service lines, creates the recurring schedule (or one-time job), and generates the first jobs.
- The contract provisioning routine is explicitly idempotent: the originating quote has a unique contract relationship and accepting an already accepted quote returns the existing contract rather than creating another.
- This is the strongest real recruiter workflow and is supported by an integration test that submits a public quote request, creates a quote, signs in as the auto-provisioned customer, accepts it twice, and verifies one contract plus generated jobs.

### Recurring schedules preserve generated work

- The schedule generator supports weekly/biweekly/monthly and other frequency patterns, schedule exceptions to skip or move occurrences, and a configurable generation horizon.
- It only creates future Job occurrences; it does not rewrite existing jobs just because a recurring schedule changes.
- It uses the schedule's `last_generated_through` cursor and an exact contract/start-time duplicate check so reruns do not create duplicate jobs.
- Contract pause/cancel/resume/renew operations update schedule activity and future jobs in accordance with the contract state.
- Tests cover frequency calculations, skipped/moved occurrences and idempotent generation.

### Field execution, photos and completion

- Employees have a separate mobile-oriented job view and can check in/out, work through required checklist items, add notes and upload job photos.
- Job completion can be gated on required checklist/proof conditions.
- The event handler for job completion may create an invoice from the completed job and publish invoice notifications; this is part of the actual workflow and should be tested end to end.
- Photos are stored on local disk and served through an authenticated API route that checks the job/customer relationship; they are not public static files.

### Invoices and payments are recordkeeping, not a payment gateway

- Invoices can be manually created or created automatically from completed jobs. They support PDF rendering, due dates, overdue state, CSV export and customer visibility.
- Payments are entered by a staff user into the database. The backend checks that the invoice is payable and prevents overpayment unless an explicit overpayment flag is provided.
- Payment recording uses an idempotency key so a retry does not create a duplicate payment row.
- The inspected payment service does not connect to Stripe, a card processor, a bank or a payment network. A PaymentMethod enum is only a recorded payment method.
- The recruiter demo must call these **manual/sample payment records**. It should not request real card/bank credentials or claim to move money.

### Background events and notifications

- Domain events are inserted into a database outbox from the same transaction as the business action.
- The in-process APScheduler worker drains the outbox, dispatches in-app notifications, generates scheduled jobs, refreshes analytics/search and performs overdue/expiry sweeps.
- Event failures are retried with backoff and eventually moved to a dead-letter state.
- The inspected notification handlers create in-app notifications for staff/customers. Quote send changes quote state and raises an event; the source does not show a real SMTP quote-send action.
- Invoice creation/send operations similarly publish events for in-app notification. No SMTP delivery provider is configured in the settings model.

The public demo needs the real background scheduler active, but it must run as exactly one worker per isolated store. Running multiple API replicas with each starting its own APScheduler instance can duplicate outbox processing/job generation unless the deployment adds a distributed scheduler/claim lock. Keep one controlled scheduler process or move to a properly claimed external worker.

### Webhooks are a critical public-demo security blocker

- The owner-only webhook endpoint creation validates subscribed event names and only checks that the URL begins with `http://` or `https://`.
- The sender uses `httpx.post(endpoint.url, ...)` from the backend worker.
- The inspected webhook service does not reject loopback/private/link-local/cloud-metadata IPs, does not resolve/pin DNS, does not enforce HTTPS, and does not set a custom redirect policy at the call site.
- This means exposing arbitrary webhook URL configuration in a public demo creates a server-side request forgery (SSRF) surface.
- Do not let recruiters enter webhook URLs. In demo mode, disable endpoint creation or allow only one hard-coded portfolio-owned HTTPS capture receiver. If the general product feature remains open later, add strict URL/DNS/IP validation, DNS pinning/egress filtering, redirects disabled and a short timeout before deployment.

### Upload size and storage boundaries

- The upload helper checks MIME type and a byte-size limit, reads the uploaded file into memory, and then writes it below `UPLOAD_ROOT`.
- The file API routes require auth and check customer/job access before returning photo bytes.
- Because the route reads the complete upload before the size check, enforce a reverse-proxy/request-body cap and bounded streaming read before public use. Restrict the initial recruiter flow to small synthetic photos.
- Local filesystem storage needs a persistent volume, not an ephemeral serverless filesystem, and each isolated demo store needs a separate file root or object-storage prefix.
- The default 8 MB limit and MIME allowlist are useful constraints but there is no image malware scanning/defence in depth visible in the inspected storage helper.

### Seed script is destructive and contains shared demo credentials

The included `seed.py`:
- Calls `Base.metadata.drop_all(bind=engine)` and `create_all` before adding sample records.
- Creates an owner and manager with the shared password `Demo1234!`.
- Creates sample employees and a customer portal login.
- Seeds fictional leads, customers, properties, quotes, contracts, recurring jobs, completed-job records, invoices, payments and feedback.
- Uses a customer test password `Welcome123!` from the quote-provisioning flow.

This makes the script useful only for a disposable development/test database. **Never run it against a public/shared/prod database.** The public demo needs a separate database instance created from scratch or a safe, non-destructive, idempotent demo fixture loader that is isolated per visitor. Never expose the fixed seed credentials as a common public account.

### Deployment and production configuration are not yet established

- The configured defaults are development-oriented: SQLite, a weak placeholder JWT signing secret, 12-hour access tokens, local disk uploads and local Vite API URL.
- Settings do not perform a production-mode validation that rejects the development secret or forces HTTPS/secure cookie behavior.
- CORS is driven by an environment list and defaults to localhost development origins.
- The frontend API client defaults to `http://localhost:8000`, stores JWTs in localStorage and calls the API directly; no same-origin proxy is configured in its Vite config.
- The product frontend README is still the stock “React + Vite” starter README; the separate visual walkthrough documents the real application UI instead.
- No verified public frontend/backend deployment or live database/worker was found in the inspected project source. The screenshots document a local seeded experience, not a current live production service.

Before a public deployment, configure a strong non-default JWT secret, explicit HTTPS CORS origins, a production PostgreSQL database, persistent storage and a stable HTTPS API origin; then verify the exact deployed frontend/API/worker combination.

## Recruiter demo experience to build

1. Open the public CleanFlow marketing surface and submit a clearly synthetic quote request through the real public API.
2. Enter a unique temporary operations workspace. The backend creates/loads a disposable per-visitor database with its own synthetic owner/manager/employee/customer users, pricing rules, service catalog and example records.
3. Convert the new lead into a quote and display the real pricing calculation breakdown (base rate, property inputs, frequency, surcharges and add-ons).
4. Send the quote (state transition and in-app event), then switch to the synthetic customer portal identity and review/accept or reject it.
5. On acceptance, show the actual contract, recurring schedule and generated jobs. Repeat acceptance to demonstrate idempotency.
6. Change one future schedule exception, show the generated calendar/jobs, assign a synthetic employee and complete a field checklist with one small test photo.
7. Create/render an invoice from the completed job and record a fictional manual payment. Do not imply a payment gateway was called.
8. Inspect customer history, notifications, analytics and audit trail.
9. Disable arbitrary webhook configuration; show only the event/outbox record or an owned capture endpoint.
10. Reset/expire the whole visitor database and its upload root. Never run the destructive global seed script against another visitor's store.

## Security and engineering gates

Before marking CleanFlow demo-ready:
- Add a dedicated DemoSession record and opaque session identity with creation/last-seen/expiry/revocation; map it to an isolated DB/data store and isolated upload root.
- Do not use a single shared database with the current single-company schema for concurrent recruiter sessions. Implement per-session database isolation or first-class tenant/company scoping across every model/query/route.
- Never expose `owner@cleanflow.demo`, `customer@cleanflow.demo`, `Demo1234!` or `Welcome123!` as common production demo credentials.
- Replace the hard-coded `Welcome123!` customer password with a one-time activation flow or unique per-session credentials that expire.
- Keep all normal auth/role/customer ownership checks active. Add two independent recruiter-session tests proving one visitor cannot see or mutate another visitor's users, leads, customers, properties, quotes, contracts, jobs, invoices, payments, uploads, notifications or audit logs.
- Replace the destructive public/demo seed with a clean-database fixture bootstrap that cannot drop tables outside the current isolated demo DB. Keep the original `seed.py` restricted to local disposable development.
- Configure PostgreSQL or another explicitly supported persistent database for the demo; ensure schema migrations have one authoritative startup/deploy path and do not rely on an accidental in-memory/ephemeral DB.
- Require strong JWT secrets, explicit HTTPS CORS/API origins, sensible token expiry and a production configuration validator. Consider HttpOnly secure cookie sessions or another mitigation for localStorage-held bearer tokens in the public demo.
- Disable public webhook URL entry. Permit only a fixed owner-controlled capture destination, or completely suppress outbound webhook delivery. Do not accept visitor-controlled HTTP destinations.
- If general webhooks are opened beyond the fixed demo endpoint, implement SSRF defenses: HTTPS-only; reject IP literals/private/loopback/link-local/reserved/metadata destinations; resolve and pin DNS at connection time; disable redirects; short timeouts; egress firewall; and regression tests for DNS rebinding.
- Use one controlled scheduler/worker per demo runtime. If scaling the API horizontally, move to a separately supervised worker and add atomic claims/locks so outbox events and schedules cannot be processed twice by independent replicas.
- Add request-body and streaming upload caps before buffering the whole file; keep the 8 MB MIME allowlist, validate file content/signatures and isolate stored objects by demo session. Use persistent volume/object storage and expire blobs.
- Keep payments as synthetic manual records only. Disable any live processor integration should one be added in future.
- Bound public quote-request rate, generated rows, quote/contract/job count, schedule horizon, photos, outbox/webhook deliveries and worker concurrency.
- Expire the demo database, session, queued jobs, audit history and upload root safely. Verify no worker can recreate or mutate records after the demo session is expired.
- Run the complete real-browser flow from public quote request through customer acceptance, recurring job generation, employee completion, invoice/payment/history, and verify read-after-write against the isolated DB.

## Existing verification evidence

- Backend test fixture uses a temporary SQLite database and temporary upload root, disables the scheduler during tests, and resets in-memory login/public-quote rate limiters.
- The source tree includes focused test modules for RBAC/customer isolation, quote→contract→schedule→jobs, recurring schedule generation/exceptions/idempotency, contract lifecycle, job completion gating, payments, pricing, concurrency/idempotency, webhooks/search/feature flags and newer functionality.
- The visual walkthrough states that its 16 captures show the application with live seeded data and documents the main customer, staff, employee and billing journeys.
- The quote-to-contract test performs a real public lead request, creates a priced quote, authenticates the customer account, accepts twice and asserts one contract plus generated jobs.
- These tests establish meaningful local source behavior, but no test evidence or deployment verification here proves a currently reachable public API/database/worker stack.

## Current status

**Source audit complete; per-visitor database isolation, destructive-seed guard, safe portal credentials, webhook SSRF prevention, upload hardening and public deployment verification pending.** CleanFlow has a meaningful real domain workflow and focused tests, but its current single-company schema and public webhook configuration are not safe to expose as a shared recruiter sandbox.
