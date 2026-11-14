# Service Agreement Manager — source audit and recruiter demo design

Audit date: 14 November 2026

Repositories:
- Frontend: https://github.com/faizansaiyed123/service-agreement-manager-frontend
- Backend: https://github.com/faizansaiyed123/service-agreement-manager-backend

## Product understood from source

Service Agreement Manager (SAM) is a service-business operations platform for HVAC, plumbing and maintenance providers. It connects the customer/commercial relationship with field operations and billing in one company workspace.

The actual product workflow is:

**Company + branch → customer/contact/service location → equipment + service catalogue → agreement draft/version → customer proposal and portal acceptance → maintenance schedule/work order generation → technician execution → invoice → payment/refund/credit → reporting, renewals and customer history.**

The product also supports:
- Branch hours and closures, team/role management and technician branch scope.
- Customer CSV import with validation and duplicate handling.
- Agreement versions, lifecycle events, suspension/resumption/cancellation and renewals.
- Recurring invoice schedules, pause/resume and scheduled invoice generation.
- Customer, agreement and invoice portals.
- PDF invoice generation, report/export workflows and attachments.
- Durable notification email/SMS outboxes, signed webhooks and delivery attempt history.
- Stripe PaymentIntents for online invoice payment when explicitly enabled.

## Architecture verified from source

- Frontend: React 19 + TypeScript + Vite 7, React Router, Stripe React Elements and Stripe.js.
- Backend: Python 3.12, FastAPI, Pydantic 2, SQLAlchemy 2, PostgreSQL 16 and Alembic migrations.
- Auth and operational rate limits: Redis in production, with the production settings validator requiring authenticated Redis for shared rate-limit state.
- Authentication: 15-minute access JWT and 14-day refresh JWT; browser requests use HttpOnly access/refresh cookies, CSRF/origin validation and a persisted AuthSession row. Refresh rotates the stored JTI; reuse or revocation invalidates the session. The frontend does not need to store bearer tokens in localStorage.
- Company is the main tenant boundary. Users, branches, customers, agreements, work orders, invoices, outboxes, attachments and webhooks are company-scoped. Branch-aware technician permissions further constrain operational records.
- Separate long-running processes run the billing, maintenance, webhook and notification workers. SMS has an optional Compose profile and is disabled by default.
- Email, SMS and webhook outboxes persist requests, claim work with leases, store attempts, retry with backoff and mark exhausted requests dead.
- Attachments use a storage abstraction for local disk or S3-compatible storage. The production Compose stack shares a persistent storage volume across API and workers.
- Docker Compose is provided for development and production, with PostgreSQL, Redis, API, worker containers, persistent volumes and health checks. Production API binds to loopback behind a TLS reverse proxy.
- Backup and restore scripts and a systemd backup schedule are included.

## Important findings from source inspection

### Company/branch tenant and role boundaries

- A User belongs to one Company and has a role (owner, admin, manager, technician, billing or staff); optional branch scope applies to technicians/branch operations.
- Auth tokens bind user ID, company ID and session ID. Each browser request uses the cookie; the backend looks up the persisted AuthSession, checks revocation/expiry, verifies the active and email-verified User, then confirms the Company is active.
- The database and service queries include company IDs for customer, service location, equipment, agreements, schedules, work orders, invoices, portal memberships, attachments and webhooks. The tests verify one company cannot read another company's agreement/invoice/records.
- Technician-specific scope is separately tested: field users cannot automatically access every branch or financial record.
- Customer portal identities are separate from staff users. A CustomerPortalIdentity can have explicit CustomerPortalMembership records linking it to a customer in a company. Portal endpoints check the identity, membership and company/customer relationship before returning data.
- The customer portal has a separate auth/session cookie and refresh path, rather than merely showing the staff screen with hidden navigation.
- This is a sound basis for a recruiter sandbox. Bootstrap a unique temporary Company, staff owner and synthetic customer/customer-portal identity per visitor. Never use one shared demo company or customer login across visitors.

### Public registration and browser authentication

- In development/test, signup can create a company/owner account and return a working browser session immediately.
- In production, public registration is controlled by `ALLOW_PUBLIC_REGISTRATION`. Registration creates an unverified account and a single-use email-verification token, queues the verification message and returns a generic pending response. Login rejects unverified accounts.
- Email verification, password recovery, team invitations, customer-portal invitations, agreement acceptance links and invoice payment links all use expiring/single-use token records. Raw tokens are hashed in the relevant token table; session state is persisted and revocable.
- Browser sessions use HttpOnly cookies. For state-changing requests, the backend validates the request Origin against the exact CORS allowlist and rejects cookie-authenticated writes without a trusted Origin. The public authentication paths are explicitly handled separately.
- Production configuration validates minimum JWT secret length/entropy markers, PostgreSQL credentials/SSL, non-wildcard HTTPS CORS origins, Redis authentication/TLS, HTTPS portal/verification URLs, and required SMTP sender/STARTTLS configuration. `get_settings()` invokes `validate_production()` during application initialization.
- Recruiters should not have to register with their own email or wait for verification. Add a dedicated, rate-limited demo bootstrap that provisions a temporary company, owner and synthetic customer portal identity, then issues the normal secure session cookies. Do not weaken production verification or publish a shared password.

### Agreements are versioned and customer acceptance is recorded

- Staff creates a draft agreement associated with a customer and service location, adds catalog/custom service lines, snapshots price details and computes a total.
- Only draft agreements can be edited. Changes create immutable AgreementVersion snapshots; the API records lifecycle events and company-scoped webhook events.
- The agreement can be proposed and sent through a public agreement portal. The portal token is random, stored as a hash, company/agreement/version-bound, expires, can be revoked and is invalidated when the agreement version changes.
- The public portal records customer viewing and allows acceptance or rejection. Acceptance requires an explicit confirmation that the recipient reviewed the agreement and is authorized to accept it. The backend stores accepted-by name, recipient email, version, token reference, confirmation, request IP/user-agent and agreement event history; it changes the agreement state and activates the operational relationship.
- This is recorded electronic portal acceptance with evidence. The inspected code does not integrate a qualified e-signature provider, certificate-backed signature or identity-proofing service. Do not market the feature as DocuSign-equivalent or a legally certified digital-signature workflow.
- Tests cover agreement lifecycle, versioned snapshots, tenant isolation and serialized concurrent acceptance/rejection decisions.

### Operations and recurring maintenance are worker-backed

- Maintenance schedules are company-scoped and branch-aware. The worker scans due schedules in bounded batches, creates work orders for due occurrences, tracks last-generation attempt/error and advances the next due date.
- Generation is protected by database locks/unique occurrence constraints so concurrent workers or retries do not create duplicate work orders. Failed rows can be retried after the underlying data problem is repaired; catch-up generation is bounded.
- Work orders have their own state and technician assignment. The product supports operational completion and customer-facing history; route/role rules prevent technicians from crossing their allowed branch or financial scope.
- The dedicated maintenance worker runs separately from FastAPI. The worker must be deployed for recurring work orders to appear; a frontend-only demo cannot truthfully show this lifecycle.

### Billing, recurring invoices and Stripe are real, but the demo must use test mode

- Invoice totals are computed from line items, discount and tax. Company-scoped invoice numbering uses transactional sequence locking. Payments, refunds and invoice credits are separate persisted records; invoice balance/status is derived from these adjustments.
- Manual payment recording has an idempotency key and server-side outstanding-balance checks. Refunds cannot exceed the remaining refundable amount and are themselves idempotent.
- Recurring invoice schedules store line templates, due days, frequency, next invoice date and auto-issue behavior. The billing worker claims due schedules with row locks, creates invoices from the saved templates, advances schedules and publishes events.
- Stripe integration is implemented, not merely represented by a settings screen:
  - Staff and both public/customer portals can request a PaymentIntent.
  - The server calculates the invoice's current outstanding balance and converts it to the currency's minor units; the browser does not choose the amount.
  - Stripe is called with idempotency keys and invoice/company/portal-token metadata.
  - The frontend uses Stripe Elements/PaymentElement and Stripe.js to collect card details; card number/CVV are sent to Stripe, not to the SAM API.
  - Confirmation retrieves the PaymentIntent from Stripe and checks the intent ID, succeeded status, invoice/company metadata, currency and actual received amount before writing a Payment record.
  - A Stripe webhook verifies the Stripe signature and calls the same payment recording path. PaymentIntent IDs and idempotency keys prevent duplicate records when browser confirmation and webhook refer to the same charge.
  - If an invoice is voided or the charge exceeds its live outstanding balance, the service attempts an idempotent automatic refund and records a PaymentRefund; a failure is surfaced for support handling.
- The default `STRIPE_ENABLED` is false. The test suite uses mocked Stripe calls to verify server-side amount calculation, idempotency and wrong-invoice rejection; this is not evidence that a live Stripe account is connected or that real card payments were performed.
- The frontend explicitly recognises Stripe test mode and displays Stripe's test card number and warning when a test secret key is used.
- Public recruiter demo policy: keep Stripe entirely disabled unless a dedicated test-mode account is configured and the backend enforces `sk_test_` keys only. Do not trust a UI label or `test_mode` response alone. Never use a live key or accept real card data. Any test payment should use a synthetic invoice and Stripe's test-card flow. Otherwise show manual recorded payment as a separate workflow and state that online payments are unavailable in the demo.

### Notifications, SMTP and SMS are actual external side effects

- Email requests are persisted in an encrypted NotificationOutbox with recipient, subject/body, idempotency key, attempt records, lease/lock expiry and retry/backoff/dead state.
- The notification worker sends through configured SMTP using STARTTLS. Password-reset and email-verification message bodies are redacted after successful delivery or after retries are exhausted.
- The successful E2E run checked email outbox creation/queueing; the report explicitly says external email provider delivery was not verified.
- SMS is disabled by default. If `SMS_PROVIDER=http` is configured, the SMS worker posts recipient/body to the configured HTTP provider endpoint with an optional bearer token, leases, retry and dead-letter state. The CI workflow tested the disabled path, not real SMS delivery.
- The public demo must not send to real recruiter or synthetic addresses through a general-purpose SMTP account. Use a private, no-relay SMTP capture service and scope the captured inbox to the current demo company. Do not run the SMS profile or provide a real SMS provider credential.
- Keep email queue/status truthful: an outbox row in `queued` is not a message delivered. Only label a message sent after the capture or SMTP provider actually accepts it.

### Webhook delivery is significantly hardened, but recruiter targets should still be constrained

- Webhook URLs are company-scoped and the webhook worker validates targets as HTTPS only, rejects embedded credentials and nonstandard ports, resolves hostnames and rejects non-public IPs.
- The transport pins the actual socket connection to the validated IP while retaining the original hostname for TLS certificate/SNI verification. It does not follow redirects or inherit proxy environment variables.
- Outgoing event bodies are HMAC-signed with an encrypted per-endpoint secret. The worker records response/attempt data, uses leases and retries with exponential backoff before marking a delivery dead; owners can inspect and retry eligible dead deliveries.
- Tests explicitly cover HTTPS/scheme/credential/port validation, private-IP rejection, validated-IP connection pinning, signing, tenant scope, success, retry and endpoint lifecycle.
- This is stronger than a basic URL check. For a public recruiter sandbox, still do not accept arbitrary visitor-configured endpoints: make an owned fixed HTTPS capture receiver the only allowed destination, or keep endpoint creation read-only. That prevents abuse/noisy external calls even with SSRF protections.

### Attachments and storage

- Attachments are company-scoped and stored under a path containing company ID, entity type and entity ID.
- The storage adapter streams the incoming file in bounded chunks, computes a SHA-256 checksum and rejects files over the configured maximum (25 MB by default). It supports persistent local disk or S3-compatible object storage.
- Attachment routes validate target entity ownership, sanitize filenames, return scoped list/download results and restrict delete/share permissions. Customer portal document listing returns only explicitly customer-visible attachments.
- The current route records the browser-supplied content type but the inspected path does not show comprehensive file signature/magic-byte validation or malware scanning. For the public demo, allow only a small set of known synthetic files, add content-signature validation and enforce an ingress/request-body limit before parsing.
- Use a persistent per-demo company namespace or S3 prefix. Demo expiry must delete only that company's objects; model/backup/system storage should not be cleared.

### Production and worker topology

- Production Compose includes PostgreSQL, authenticated Redis, API, billing worker, webhook worker, maintenance worker, notification worker and an optional SMS worker. PostgreSQL and Redis are private to the Compose network; the API binds to loopback for the reverse proxy.
- Production configuration requires an external HTTPS app origin, secure credentials, TLS PostgreSQL/Redis requirements, SMTP and portal URLs consistent with the public host. Stripe remains separately controlled by configuration.
- The test/visual walkthrough uses a disposable PostgreSQL 16 database and a production-built frontend served locally. It does not establish a currently reachable public deployment.
- Production E2E report used APP_ENV=development for quick registration/session, and it did not claim external SMTP, SMS or hosted production connectivity. It also uses mocked/test provider seams for Stripe-specific assertions rather than charging a real card.

## Recruiter demo experience to build

1. Open a public overview explaining the complete service-business lifecycle and explicitly identifying all people, companies, assets, agreements, jobs, invoices and payments as synthetic demo records.
2. Choose “Enter demo workspace”. A backend bootstrap creates a unique short-lived Company, owner, manager, technician, billing role, customer, customer-portal identity/membership and isolated records. Use the normal cookie/CSRF/session flow; do not require a personal email, external email verification or manually created account.
3. Start with a prepared customer and service location. Inspect equipment and a service catalog item; create or edit a draft agreement and review the saved version snapshot.
4. Propose the agreement and open the current demo's scoped customer-acceptance portal. Let the recruiter review and accept or reject it with the explicit confirmation; show the recorded acceptance evidence and lifecycle event. Label it “recorded electronic acceptance”, not a certified signature.
5. Generate a maintenance schedule and let the real maintenance worker create due work orders. Assign one to the synthetic technician, complete the work order and inspect the event/report/notification updates.
6. Create an invoice from the company/agreement workflow, issue it, render the PDF, and open its customer/invoice portal. Record a manual sample payment/refund/credit to show the adjustment ledger.
7. Optional card-payment lab: only when a dedicated backend-locked Stripe test key is configured, let the recruiter use Stripe's test card and see a confirmed test PaymentIntent. Clearly show “Stripe test mode — no real charge.” Otherwise keep the card-payment control disabled and state why.
8. Create a recurring invoice schedule, run/inspect the billing worker and show the next invoice with its persisted date/number. Pause/resume the schedule.
9. Let the recruiter inspect email capture/outbox attempts, webhook signature/delivery attempts and report/CSV export. All email goes to a private no-relay capture inbox, SMS is disabled, and webhook delivery uses only a fixed capture endpoint.
10. Use the separate customer portal identity to inspect only its company/customer data, agreements, work orders, invoice/PDF, explicitly shared documents and payment status. Do not reuse an identity across unrelated demo companies.
11. Expire and purge the demo company, staff/customer identities, memberships/sessions/tokens, portal tokens, work orders, assets, invoices, payments/refunds, schedules, notification/SMS/webhook records, attachments and storage prefix. Keep other recruiters' demo data and persistent infrastructure untouched.

## Security and engineering gates

Before marking Service Agreement Manager demo-ready:
- Add a DemoSession record with a cryptographically random opaque token/hash, explicit company/user/customer-portal identity linkage, creation/last-seen/expiry/revocation/cleanup fields and a dedicated bootstrap endpoint.
- Create a unique synthetic Company per visitor. Maintain company_id/branch/role filtering on every route and customer-portal membership check; add two concurrent browser sessions proving no access across companies and customer memberships.
- Keep normal HttpOnly cookie auth, refresh-session JTI rotation/revocation, CSRF trusted-Origin checks, Secure/SameSite settings, exact HTTPS CORS, shared Redis rate limiting and production configuration validation. Do not return shared static credentials.
- Keep production email worker routed to private no-relay capture SMTP, and expose only a demo-company scoped inbox. Keep SMTP logs redacted. Do not deliver to actual external recipient addresses.
- Keep SMS disabled. Do not configure sms_api_url/token to a real provider for recruiter sessions. If a capture provider is used, make it a private owned endpoint and mark state accurately.
- Fix public Stripe mode: when `DEMO_MODE=true`, enforce `STRIPE_ENABLED=true` only when the secret key begins `sk_test_`; reject live keys at startup and in the payment-service guard. Use a dedicated Stripe test account and test webhook secret, no live price/product/account. Limit per-session intent count/amounts and test refunds. If test credentials are absent, disable card-pay controls without displaying a false success state.
- Restrict webhooks to a fixed owned HTTPS capture endpoint during demo mode; keep the existing HTTPS-only/DNS-resolution/IP-pin/no-redirect protections enabled. Do not permit arbitrary target URLs.
- Add demo-specific caps for company count, customers, service locations, agreement versions, generated work orders, scheduled recurring invoices, exports and outbox/dead-letter volume.
- Preserve idempotency and database locking for agreement portal decisions, maintenance occurrences, recurring invoices, Stripe intent records, manual payments, refunds and webhooks.
- For attachments, add MIME/signature allowlisting and malware scanning or limit to known synthetic fixtures, preserve chunked size-bounded streaming and request-body cap, and isolate per-company storage.
- Seed only synthetic contact details, example-domain email addresses and fictional assets/locations. Never import personal customer records or recruiter contact data.
- Run the full API and every worker with PostgreSQL/Redis and persistent file storage. Validate readiness per dependency, not only HTTP liveness.
- Implement expiry cleanup that deletes only the DemoSession-linked Company and child data; revoke auth/customer-portal sessions and all invite/reset/agreement/invoice portal tokens, remove queued outbox/dead-letter rows, and delete that company’s attachment directory/S3 prefix. Verify no worker can resurrect expired data.
- Add clean-browser and two-company E2E tests for bootstrap → agreement version/proposal → public acceptance → maintenance-generated work order → completed work order → invoice/PDF → portal payment (manual or Stripe test) → reporting → capture inbox/webhook → cleanup.

## Existing verification evidence

- The checked-in successful run records: 4 browser journeys passed, 0 failed/skipped; 27 screenshots; 102 backend pytest tests passed, 0 failed/errors, 3 skipped; 3 PostgreSQL concurrency tests passed.
- The walkthrough workflow checks out the backend repository, applies Alembic migrations to disposable PostgreSQL 16, runs Ruff and backend tests, executes dedicated PostgreSQL race tests for concurrent invoice payments, maintenance generation and agreement portal decisions, starts the real FastAPI API, builds the frontend for production and runs Chromium browser journeys.
- Tests cover agreement versioning and tenant isolation, customer portal membership/data boundaries, invoice payment/refund/idempotency, maintenance schedule retries and duplicate-occurrence prevention, attachment scoped storage, cookies/CSRF/rate limits, webhooks/IP pinning/retries, role/branch/technician scope and production configuration.
- The published screenshots are genuine captures after the tested interaction completed. They are evidence for the local real-API/PostgreSQL workflow, not a claim that the public internet deployment is healthy.
- The report explicitly states that email was checked at outbox stage, SMS used the disabled-provider path, and external provider delivery/hosted production connectivity were not verified.
- Stripe tests monkeypatch provider calls for selected verification/idempotency/wrong-invoice cases; they do not verify a connected live or Stripe test account. The default Stripe feature flag is false.
- The frontend E2E spec filenames still use a legacy “ledgerpulse” name, while the workflow/report identify Service Agreement Manager. The workflow is the one that ran the SAM API and browser tests; do not mistake the stale filenames for a LedgerPulse runtime.
- No currently reachable hosted Service Agreement Manager frontend/API/worker stack was verified during this source audit.

## Current status

**Source audit complete; per-visitor company bootstrap/expiry, private email capture, disabled SMS, fixed webhook capture, Stripe test-only gate, file-content hardening and deployed API/worker verification pending.** This is a strong candidate for a real full-stack recruiter playground because the agreement, maintenance, billing, customer portal and Stripe-test flows are genuine. It must not be called a live hosted demo until the deployed PostgreSQL/Redis/API/workers/frontend and allowed provider test paths pass the clean-browser journey.
