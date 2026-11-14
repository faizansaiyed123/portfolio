# AutoFix — source audit and recruiter demo design

Audit date: 14 November 2026

Repositories:
- Frontend: https://github.com/faizansaiyed123/autofix_frontend
- Backend: https://github.com/faizansaiyed123/autofix_backend

## Product understood from source

AutoFix is an automotive workshop management application with a connected customer and staff experience. It takes a vehicle from customer request through inspection, estimate, repair, independent quality control, invoice and settlement, while tracking the parts and supplier activity needed to complete the work.

Its core workflow is:

**Customer portal request → workshop triage → appointment → vehicle check-in → digital inspection → estimate → customer line-by-line decision → repair order → technician tasks/labour/parts → independent quality control → invoice → payment record → customer portal history.**

Additional real capabilities include:
- Staff administration, role/permission management and a technician-specific “My Work” queue.
- Customer/vehicle/mileage history, appointment calendar and conflict checks.
- Inspection findings, severity/recommendation levels, and URL-referenced inspection photos.
- Repair-order tasks, technician labour, parts requests and approvals.
- QC checklists, automatic verification against operational records, inspector overrides, photo evidence references, re-verification and rework.
- Parts catalogue, inventory receipt/issue ledger, low-stock alerts, suppliers, purchase orders and goods receiving.
- Invoices, append-only payment records, payment voiding, reports, notifications and audit events.
- Customer portal for the customer’s own vehicles, appointments, requests, estimate decisions, invoices and payment history.

## Architecture verified from source

- Frontend: Next.js App Router, React/TypeScript, Playwright and a Docker standalone runtime.
- Backend: Python 3.11+, FastAPI, async SQLAlchemy, PostgreSQL and Alembic.
- Authentication: bcrypt passwords, JWT access and refresh tokens, user-level session-generation/revocation checks and database-backed rate limiting.
- Role-based permission checks are backed by persisted role/permission records. Roles include Owner, Service Advisor, Technician, Parts Staff and Customer.
- All shop-wide staff routers sit behind an explicit `require_staff()` gate. This is important because Customer users legitimately hold some similar permissions (such as reading their own invoices/payments); permission names alone are not enough to determine staff access.
- Customer portal requests derive the customer record from the authenticated user’s linked customer row. The request does not let a customer pick an arbitrary customer ID.
- PostgreSQL stores the operational records. Alembic is the schema migration system.
- The API starts a PostgreSQL-backed email-outbox worker in its FastAPI lifespan. The outbox uses row locks and `SKIP LOCKED` claims, expiring claims, bounded batches, retry/backoff and terminal failure state. Multiple workers can safely share outbox rows.
- No general-purpose job queue or scheduled maintenance worker was found in the inspected tree; workshop state changes are API-driven and the email outbox is the explicit background process.
- Inspection/QC photos are represented by `photo_url` fields in the inspected models. No separate general binary attachment/upload module or object-storage adapter was found in the backend tree.
- The frontend API client sends bearer tokens from browser `localStorage` and stores both access and refresh tokens there. The backend supports token rotation/revocation, but the current browser storage design increases the impact of an XSS issue.
- The frontend is built with a browser-visible `NEXT_PUBLIC_API_URL`, which defaults to `http://localhost:8000`. Its Docker image requires the browser-reachable URL at image-build time; Docker-only internal hostnames are not valid browser targets.

## Important findings from source inspection

### This is a single-workshop database, not a multi-tenant product

- Core workshop entities (customers, vehicles, appointments, inspections, estimates, repair orders, invoices, parts, suppliers, users, payments and audit rows) are not partitioned by a company/tenant ID.
- Company name, currency and tax rate are global application settings. The application is modelled as one garage/workshop.
- Staff access is protected by the staff-only route dependency; roles and permissions further restrict which staff operations are allowed.
- Customer access is intentionally different: the portal service resolves the Customer through the authenticated User link and applies `customer_id` filters for vehicles, appointments, service requests, estimates, invoices and payment history.
- Tests explicitly sweep more than 60 shop-wide read endpoints and verify a Customer token receives 403. Separate tests confirm the customer can still use their own portal and notifications, but cannot read the workshop-wide invoice/payment books or create arbitrary customer service records.

A single shared public demo login or shared demo database is therefore unsafe. Every visitor would be using the same workshop-wide customer book, inventory, repair orders, payments and reports. There is no native company/tenant boundary that makes a shared multi-visitor database safe.

**Required isolation:** provision a disposable PostgreSQL database (or a fully separate database instance) for each recruiter session, initialise it from the approved demo fixture, and route the temporary session to that database. The alternative is a substantial first-class tenant refactor across all models, foreign keys, services, queries and permissions. Simply giving each visitor a separate customer account inside the current shared database does not isolate the shop-wide records.

### Demo fixtures are unusually thorough—but use shared credentials

The backend deliberately separates RBAC/demo login seeding from business data:
- `seed_all()` creates persisted roles, permissions and five fixed users.
- The published seed logins are `owner@autofix.demo`, `manager@autofix.demo`, `tech@autofix.demo`, `parts@autofix.demo` and `customer@autofix.demo`.
- All five share the password `demo1234`.
- `seed_demo_data()` then creates the synthetic business history: six customers, eight vehicles, three suppliers, ten parts, four estimates, eight repair orders, seven invoices, inventory ledger movements, appointments, check-ins, inspections, work-in-progress, payment states and notifications.
- Only one seeded customer is linked to a login. This is deliberate: the portal derives a single customer from the user token and must not choose between several unrelated customer records.
- The seed is idempotent and checks the presence of its linked portal customer before writing a second copy. It is not a `drop_all` script; the developer CLI applies migrations then seeds RBAC/demo rows.
- The fixture is designed to make reports and financial calculations coherent: line totals and tax match, invoice balances reconcile to payments, stock on hand is built from receipt/issue movements and each repair order’s vehicle belongs to its customer.

The seed is excellent for creating a known demo baseline in a disposable database, but the shared public credentials cannot be published or used by many recruiters at once. Keep them local/CI only. For the portfolio, generate unique session credentials, seed a unique database, and expire it as a unit.

### Authentication and email verification are real, but require delivery

- Customer registration is public; it creates a Customer role and linked Customer row, but the account remains `email_verified=false` until the one-time verification link is consumed.
- Login rejects unverified accounts. Registration and login use database-backed IP/email rate limits and enumeration-safe responses.
- Email verification and password-reset tokens are generated by the outbox worker just before sending. The database stores token hashes/expiry, not the raw link. The outbox row itself stores only user ID and message type.
- The worker sends mail through configured SMTP using exactly one TLS mode (STARTTLS or SMTP-over-SSL), records delivery attempts, retries with backoff and marks exhausted rows failed.
- The worker is started by the FastAPI application. It claims rows under row locks and `SKIP LOCKED`, then performs SMTP sends outside the DB claim transaction.
- Production validation in `create_app()` rejects wildcard/missing CORS origins, debug mode, a signing secret shorter than 32 bytes, and missing explicit trusted-proxy configuration for authentication rate limits.
- The frontend persists both access and refresh JWTs in localStorage. The API client implements a single-flight refresh and clears them on failed refresh. This is a real token lifecycle, but not an HttpOnly-cookie browser session.

A recruiter should not be asked to use their own email or wait for email verification. Add a demo bootstrap that creates temporary staff/customer identities and establishes their session directly through a dedicated trusted server path. Preserve normal authentication for ordinary accounts. For email workflow demonstrations, route SMTP to a private no-relay capture inbox and scope the inbox display to the current demo database.

### Customer and staff ownership are separate boundaries

- Customers have a nullable `user_id` link. A portal request resolves the customer from the signed-in user and then scopes each operation to that customer.
- The customer portal exposes only the customer’s own vehicles, appointments, estimates, invoices, payments, service requests and history.
- The portal can create a booking request, submit a service request, decide estimate line items and record a payment on the customer’s own invoice.
- Shop-wide endpoints are gated by `require_staff()`; tests prove the customer cannot access the shop’s all-customer data or financial reports even when the Customer role has selected individual read/write permissions.
- A technician is staff (and can reach permitted workshop routes) but has a narrower role permission set than an owner/advisor.
- This enables a useful recruiter journey with separate temporary owner/advisor, technician, parts staff and customer logins—provided they are created inside one visitor-specific database and no fixed public credentials are shared.

### Inspection and QC workflows are real; photo storage is a separate limitation

- Inspections have a validated state machine and detailed inspection items with severity, measurement, notes and recommendations.
- Inspection photos are separate rows linked to an inspection/item and store a `photo_url` string.
- Quality control is created only after a Repair Order reaches COMPLETED. The QC service automatically evaluates checks against real operational records such as required repair tasks, labour, outstanding part requests and existing inspection/QC photo counts.
- Inspectors can override an automated check with a recorded reason/notes, request rework, re-verify, pass or fail. Passing updates the Repair Order to QC_PASSED; failing sends it back to IN_PROGRESS.
- QC photo rows likewise store `photo_url` and caption. The backend tree does not expose a general file upload endpoint or storage adapter in the inspected revision.
- The frontend walkthrough includes a “photo attached” demonstration and QC uses photo evidence as one check, but do not claim AutoFix provides a hosted file-upload/storage service until the source adds one. For the portfolio lab, either use fixed synthetic image URLs from a portfolio-controlled static asset host or implement a safe binary upload/storage service separately.

### Estimate, repair, quality and financial state transitions are enforced

- Estimates have explicit status transitions. Only DRAFT estimates are editable; sent/decided estimates cannot be silently rewritten.
- Customers can approve or reject individual estimate line items. The total is recalculated from the approved lines; declined optional work does not leak into the repair order/invoice.
- Repair-order progression enforces the work/labour/parts prerequisites. It cannot be treated as completed just because the UI button was clicked.
- Quality control is independent from the technician’s repair task: the technician who performed the work cannot run QC on their own order. Blocking checks must pass or be explicitly overridden with recorded evidence; a failed check routes the repair order back for rework.
- Invoice issue is blocked until required repair/QC completion conditions are satisfied. The walkthrough includes an explicit blocked-before-QC example.
- Payments are append-only. A payment records amount, method, date and optional external reference; cash, card, bank transfer, cheque and other are method labels. Bank transfer/cheque require a reference.
- There is **no payment gateway integration** in the inspected backend: no Stripe/Adyen/PayPal/PaymentIntent/client-secret/provider webhook. The portal's “pay invoice” endpoint calls the same internal PaymentService that writes a Payment database row and updates the invoice's outstanding balance. The model docs explain that the payment row records the payment taken at the till/bank, not an online processor transaction.
- Voiding a payment does not delete it; the row remains with a void timestamp/reason and the amount is restored to the invoice balance.

The portfolio should describe payments as **manual/sample payment records**, not online card processing or real transfers. No card/bank details should be collected. Use synthetic payments only in a disposable database.

### Email delivery and test evidence

- SMTP is a real external side effect in production. The test workflow starts Mailpit with TLS/STARTTLS and configures AutoFix to send into that local capture inbox.
- The outbox stores no raw verification or reset token; a worker generates the token in process memory, persists only its hash and sends the link. It records status/attempts/backoff without retaining link contents.
- The FastAPI startup starts the email outbox worker. If the service runs more than one API replica, row locking/`SKIP LOCKED` protects concurrent claims, but the worker lifecycle and graceful shutdown should be verified in the deployment topology.
- CI uses a disposable PostgreSQL 16 database, runs Alembic migrations, calls `scripts/seed.py`, starts TLS-enabled Mailpit, launches the real FastAPI backend, builds the production Next.js frontend and runs real Playwright tests. Screenshots are generated from that local full-stack run.
- The complete lifecycle test drives a customer from a portal request through workshop actions, appointment, check-in, inspection, estimate/customer line decisions, repair order, technician labour, QC, invoice, payment and customer portal read-back. Other suites cover part approvals, purchasing/receiving/cancellation, vehicle/check-in, auth, rate limits, RBAC, audit, notifications and migrations.
- The CI workflow publishes up-to-date visual screenshots when main passes. This is meaningful real-API evidence, but it does not establish that the public URL, a hosted database or production SMTP is currently healthy. No hosted end-to-end AutoFix deployment was verified in this source audit.

### Deployment and demo constraints

- The backend Docker entrypoint applies Alembic migrations and can optionally seed demo data via `AUTOFIX_SEED=1`.
- The backend repository has no Docker Compose file. The frontend Docker image builds a standalone Next.js runtime; `NEXT_PUBLIC_API_URL` is baked into the browser bundle and defaults to localhost. A public demo needs a browser-reachable HTTPS API URL, explicit backend CORS origin and a correctly routed PostgreSQL service.
- Configuration defaults include development APP_ENV/debug, wildcard CORS, localhost API and local currency/company values. Main does enforce strong secret length, debug false and explicit origins in production, but those production environment values must be configured.
- No tenant, demo session, auto-expiry or per-visitor database routing exists in the inspected source.
- The demo must be self-contained: every recruiter’s business data, seeded identities, auth state and financial records live in a separate disposable database. Expiry cleanup must drop only the specific demo database after the session is revoked and workers stop; never run destructive reset/drop commands against a shared production database.

## Recruiter demo experience to build

1. Open the AutoFix public product introduction. It should explain that this is a single-workshop automotive system and that all customer, vehicle, VIN/plate, estimate, repair, invoice and payment data in the lab is synthetic.
2. Choose “Enter demo workshop”. A server-side demo bootstrap creates an isolated disposable PostgreSQL database, runs Alembic, provisions unique short-lived owner/advisor/technician/parts/customer identities and seeds the known coherent fixture. No shared `demo1234` password or common database.
3. Open the workshop dashboard and attention centre. Let the recruiter search a fictional customer and vehicle, inspect mileage and linked history.
4. Start at the customer portal: file a synthetic service request or request an appointment for the customer’s own vehicle. Switch to the staff advisor session, convert the request to a booking and check in the vehicle.
5. Create/complete a real inspection with findings (Good/Attention/Recommended/Urgent). Show the resulting estimate, approve/reject individual estimate lines as the customer, and verify only approved work is moved into the repair order.
6. Assign the repair order to the synthetic technician, record tasks and labour, issue parts requests, and use the parts-staff identity to approve/fulfil them. Show inventory ledger receipts/issues and supplier purchase-order receiving.
7. Complete work, run QC from a different synthetic inspector, demonstrate a failed check/rework and a subsequent passing check. Only then allow invoice issue.
8. Create and settle a **sample/manual** payment record. Void a payment with a reason and show the invoice balance restored. Do not present this as a card-payment processor or actual transfer.
9. Switch to the customer portal identity and verify the customer sees only their own vehicles, appointment, estimate, invoice, payment history and service request.
10. Inspect the email outbox and the private Mailpit capture inbox for verification/reset messages. No external email recipient should be contacted.
11. Expire the current demo session, revoke all temporary user token generations and drop the corresponding isolated database. Verify other concurrent demo sessions remain unaffected.

## Security and engineering gates

Before marking AutoFix demo-ready:
- Add a DemoSession control-plane record with cryptographically random ID/token hash, database name/identifier, creation/last-seen/expiry/revocation state, owner identity and cleanup status.
- Provision one database per recruiter or use a separately isolated PostgreSQL cluster/schema/credential with non-overlapping permissions. Because the current schema has no company/tenant ID, do not share a common database between writable public sessions.
- Generate random per-session credentials and short-lived identities for Owner/Advisor/Technician/Parts Staff/Customer. Never expose `demo1234`, the fixed `@autofix.demo` users or a shared public customer account.
- Keep the same role model and `require_staff()` boundary. Verify customer-portal requests derive the correct customer from the user token and cannot read or mutate another customer’s vehicles, appointments, requests, estimates, invoices or payments.
- Keep PostgreSQL migrations and fixture seeding inside the new disposable database only. `scripts/seed.py` is idempotent but not a multi-session isolation mechanism; add a bootstrap path that creates a fresh database and unique credentials. Do not point seeding to a shared live database.
- Keep registration, login, token refresh, revocation, password reset and email verification protections. Improve the browser token storage: move refresh tokens to HttpOnly Secure SameSite cookies and keep access tokens in memory; add strict CSP and XSS protection rather than persisting both tokens in localStorage.
- Configure production mode, debug false, secret length at least 32 bytes, explicit HTTPS CORS origins, trusted proxy handling, database TLS/credentials and a browser-reachable `NEXT_PUBLIC_API_URL`.
- Use a private non-relaying SMTP capture service for public demo verification/reset emails. Keep outbox statuses honest and redact recipient addresses, tokens and reset links from public logs.
- Do not connect a live payment gateway or add fake card controls. Payments remain manual sample records. Keep all invoice amounts, voids and references synthetic.
- If real binary inspection/QC photos are added, implement a real upload/storage subsystem with bounded streaming request size, content-signature/MIME validation, safe generated filenames, per-demo storage namespace, authentication checks and expiry cleanup. Until then, use only fixed portfolio-owned static example image URLs and label them as sample evidence.
- Bound session count, database lifetime, seeded row volume, API calls, login attempts, SMTP deliveries and file/photo URL references. Do not let recruiters submit arbitrary external URLs as server-side image fetches.
- Stop the corresponding email worker and revoke its temporary user credentials before deleting an expired database. Ensure cleanup cannot address any database outside the explicit DemoSession record.
- Run the real Playwright suite against the deployed preview stack: bootstrap → customer request → staff appointment/check-in → inspection/estimate → customer line decision → repair/tasks/labour/parts → QC failure/rework/pass → invoice → manual payment/void → customer portal read-back → session expiry. Run two independent demo sessions concurrently and verify neither can see or mutate the other’s data.

## Existing verification evidence

- Backend tests include a real full-lifecycle HTTP test that exercises a customer request, staff processing, inspection, estimates and line decisions, repair/labour, QC, invoicing, payment and customer portal read-back.
- The backend has dedicated suites for authentication, registration, email outbox, RBAC, staff-access boundary, appointments, check-ins, customers, vehicles, inspections, estimates, repair orders, labour, QC, parts/inventory, part requests, suppliers/purchase orders, invoices, payments, notifications, reports, audit and migrations.
- The frontend CI checks out the backend repository, starts PostgreSQL 16, applies Alembic migrations, runs the documented seed, starts TLS-enabled Mailpit, runs the FastAPI API, builds and starts the production Next.js app, then executes Playwright browser workflows without replacing the API with mock handlers.
- The visual walkthrough records customer and staff flows including a request received by the staff queue, booking, estimate creation, line-by-line customer approval, workshop repair, QC failure/rework/pass, invoice issue, payment settlement, payment void, inventory receipts, part approval, supplier/purchase orders and portal read-after-write.
- These tests and captures are strong source-level evidence for the local full-stack application. They are not proof that the currently listed public frontend is connected to a healthy deployed API/PostgreSQL/SMTP environment.

## Current status

**Source audit complete; per-visitor disposable database, unique role identities, secure browser token storage, private SMTP capture and public deployment verification pending.** AutoFix has a particularly coherent and deep real workshop-to-customer lifecycle. Because it is a single-workshop schema with global business records, a separate database per visitor is required for simultaneous public recruiter use unless the backend is comprehensively converted to tenant-scoped storage.
