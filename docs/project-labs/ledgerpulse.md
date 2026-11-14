# LedgerPulse — source audit and recruiter demo design

Audit date: 14 November 2026

Repositories:
- Frontend: https://github.com/faizansaiyed123/ledgerpulse_frontend
- Backend: https://github.com/faizansaiyed123/ledgerpulse_backend

## Product understood from source

LedgerPulse is a multi-organisation finance operations product for small businesses. It connects customer invoicing and incoming payments with vendor expenses, recurring billing, activity, team roles and financial reporting.

The real API-backed product journey is:
1. Authenticate through Firebase Authentication.
2. Resolve the Firebase UID against PostgreSQL memberships and create a first Owner organisation when the signed-in user has none.
3. Create an organisation and select an active workspace.
4. Load the organisation's own customers, vendors, invoices, payments, expenses, recurring schedules, members and activity from the Flask API.
5. Create, edit and duplicate invoices; the API calculates line totals, discounts, tax, invoice numbers, paid amount and outstanding balance.
6. Record a payment against an invoice, including payment method and reference; the API updates the ledger and invoice status.
7. Create vendor expenses and manage their review/approval state.
8. Configure recurring invoice templates and let the separate scheduler generate due invoices.
9. Manage team roles/invitations, organization settings, notifications, PDF invoice delivery, audit activity and financial reports.
10. Use the separate platform-admin view for cross-organization operational counts, if the Firebase UID is explicitly allowlisted as a platform administrator.

The product's real mode is not the same as the front-page “Explore demo” experience. That experience is deliberately a browser-local sample simulator. This distinction is central to the portfolio implementation.

## Architecture verified from source

- Frontend: React + TypeScript + Vite, React Router, Firebase Web SDK, React Context and Recharts.
- Backend: Python, Flask, Flask-SQLAlchemy, PostgreSQL, Flask-Migrate/Alembic and Firebase Admin SDK.
- Authentication: Firebase Authentication in the browser. The client obtains a Firebase ID token and sends it as Authorization: Bearer; the Flask backend validates the token server-side with Firebase Admin and requests revocation checking.
- Business data: PostgreSQL is authoritative. The README explicitly says business records do not live in Firestore.
- The database models Organisation, OrganisationMember, Customer, Vendor, Invoice, InvoiceItem, Payment, Expense, RecurringInvoice and ActivityLog with organisation ownership.
- Authorization is resolved from verified Firebase UID + active PostgreSQL OrganizationMember. Client-supplied organisation IDs and role names are never trusted without checking membership/role in PostgreSQL.
- The backend creates an organisation with OWNER membership when an authenticated Firebase user first calls /api/auth/me or /api/auth/bootstrap and has no active membership.
- A dedicated scheduler runs separately from the web API in Docker Compose. It uses a PostgreSQL advisory lock so only one scheduler process performs a recurring cycle at a time.
- SMTP is synchronous from the Flask API service for contact messages, team invitations and invoice delivery. The email helper raises an explicit configuration error if SMTP is missing; callers do not claim a message was sent when it was not.
- Docker Compose runs PostgreSQL 17, backend API and a separate scheduler service with a persistent PostgreSQL volume. The API image runs migrations before serving. Frontend Nginx proxies /api to the backend.
- Frontend and backend are separate repositories. The frontend Docker build supports a configurable backend upstream; production must use a browser-visible frontend origin and an internal API upstream behind the proxy.
- No payment processor integration was found in the backend. Payment rows are business records; a credit_card or bank_transfer method value is a recorded method label/reference, not a card charge.

## The two demo modes — do not conflate them

### Current “Explore demo”: browser-local sample simulation

- The frontend signInAsDemo() creates a fixed in-memory demo profile for Owner, Accountant or Staff. It does not call Firebase Authentication.
- OrgContext detects isDemo, creates a synthetic organisation ID based on the demo UID, reads a per-UID browser-local JSON dataset from localStorage, and applies it directly to React state.
- If no local JSON exists, it uses getSampleSeedData() from src/lib/mockSeed.ts, then stores the dataset under a key such as lp_demo_data_{uid}.
- In demo mode, create/update/delete invoice, customer, vendor, expense, payment, recurring-invoice, member, organization and activity actions use updateDemo() to modify local data and write it back to localStorage. Those branches return before calling the corresponding api.* methods.
- The demo invoice helper recalculates subtotal, discount, tax, paid amount and balance in the browser. The recurring “run batch” path also calculates and updates sample state locally.
- This mode needs no Firebase or backend and is useful as an offline product tour, but it is not a full-stack demo. It must be labelled as “browser-local sample mode” if retained; it cannot be presented as evidence of API/database behavior.
- The demo sample fixture uses fictional company names/financial balances but some sample contact/vendor addresses resemble normal public company domains and brands. The live recruiter dataset should use explicitly synthetic/reserved .example contact addresses and clearly label all balances, vendors, invoices and payments as sample records.

### E2E test mode: backend integration with a trusted test header

- The API client can add X-Test-User-Id, X-Test-User-Email and X-Test-User-Name when VITE_E2E_TEST_MODE=true.
- The Flask verify_token() function accepts those headers only when Flask TESTING=True. In the normal runtime it ignores that path and requires a real Firebase bearer token.
- The Playwright global setup calls POST /api/auth/bootstrap with a synthetic test identity. This is test harness functionality—not a public demo authentication method.
- The frontend CI starts a temporary Flask server configured with SQLite, TESTING=True, no Firebase service account and PLATFORM_ADMIN_UIDS={"test-user"}. It runs the real API routes and browser interactions against that isolated database. It is not a deployed PostgreSQL/Firebase production run.

### Real backend sample-data path

- A real Firebase-authenticated user who calls GET /api/auth/me (or POST /api/auth/bootstrap) with no existing active membership receives a new PostgreSQL organisation and OWNER membership.
- The owner can call POST /api/organizations/{org_id}/sample-data. The route checks the verified Firebase user is an Owner/Admin of that organisation before calling seed_sample_for_org().
- The backend seeder locks the organisation row and refuses to run if that organisation already contains customers, invoices, expenses or vendors. It creates four synthetic customers, four vendors, four invoices in different states, two payments, four expenses and activity history; identifiers are namespaced by the organisation ID.
- The sample seeder is not a shared seed login. It is an API operation against a particular real organisation and is therefore the better base for the recruiter sandbox.
- The current frontend user interface does not automatically call this backend seed route when entering its local demo mode. The live recruiter flow needs its own bootstrap sequence: temporary Firebase identity → normal backend auth/bootstrap → new organisation → owner-only sample-data endpoint → fetch the organisation resources from PostgreSQL.

## Important findings from source inspection

### Organisation and membership isolation are genuine

- Firebase ID token verification is server-side; a client cannot send arbitrary UID, email or display name to impersonate a different person in normal mode.
- The verified Firebase UID is looked up in PostgreSQL OrganizationMember. Active membership is required for every organisation-scoped route.
- Owner/Admin/Accountant/Staff role checks are applied to the relevant endpoints. The API verifies the requested org_id is a real organisation and then verifies the current UID has active membership with the required role.
- Customers, vendors, invoices, payments, expenses, recurring invoices and activities are organisation-scoped in model relationships and route/service queries.
- Invoice/customer relationships are checked inside the same organisation; payment records are tied to invoices and organisation; recurring invoice generation resolves customer records under the recurring row's organisation.
- Organisation creation generates a new random ID and owner membership; the first-user /auth/me bootstrap also creates an organisation when no membership exists.
- The platform-admin role is a separate global allowlist of Firebase UIDs configured by PLATFORM_ADMIN_UIDS; a normal Owner/Accountant/Staff user is not a platform admin. Do not place demo UIDs in that allowlist.
- Tests and Playwright evidence include role/tenant isolation and verify that a member cannot read or mutate another organisation's rows. This is suitable for a real per-visitor sandbox without changing every table to add a new tenant column; the organisation is already the tenant.

### Firebase identity and temporary demo bootstrap

- The backend validates Firebase ID tokens and calls Firebase Admin with check_revoked=True.
- The frontend currently supports email/password and Google popup auth. It does not currently import/use Firebase Anonymous Auth.
- There is no backend DemoSession or session expiry/cleanup path. If an anonymous Firebase UID were created and used to bootstrap an organisation, that user and organisation could remain indefinitely unless the backend adds an explicit demo lifecycle.
- The most natural no-manual-signup recruiter path is Firebase Anonymous Authentication (or an equally constrained short-lived Firebase custom-token flow) with a unique UID for each browser session. The backend then uses the same standard bearer validation and normal /auth/me organisation bootstrap. This avoids a shared password and lets the app retain the normal membership/role model.
- Add a dedicated DemoSession row to bind the Firebase UID, organisation ID, creation/last-seen/expiry/revocation status and cleanup state. The backend must reject demo API requests after expiry even if Firebase still issues a valid ID token.
- On expiry, delete only the exact temporary organisation's rows and use Firebase Admin to delete/revoke the associated temporary Firebase identity. Do not rely on localStorage clearing as server-side account deletion.

### Business flows are real and organisation-scoped

- Invoice routes calculate totals in the backend using Decimal amounts, validate customers belong to the organisation, and allocate invoice numbers under a locked organisation row.
- Payment endpoints require membership and allowed roles, validate positive amounts and invoice ownership, record method/date/reference, and recalculate invoice paid/outstanding status. The model does not call an external payment processor.
- Expense routes similarly validate organisation vendor references and enforce review/approval states.
- Recurring invoices store frequency/next-run/occurrence limits and line templates. The separate scheduler uses a PostgreSQL advisory lock to prevent multiple scheduler processes from generating the same due cycle concurrently. Each generation locks the organisation and due recurring records, validates financial totals, creates the invoice/items, advances or completes the schedule and records activity in a transaction.
- The backend scheduler runs all organisations, not just a single fixed company. In a recruiter demo, the job generator must continue to process demo organisations only until expiry, and sample recurring schedules should have bounded occurrence count/end dates so public sessions do not generate unbounded invoices.
- The API exposes an owner/admin action to run a recurring batch immediately; the frontend's current local demo path handles that action in browser state instead of calling the backend. In live mode, use the real API and show generated invoice IDs/read-back from PostgreSQL.

### SMTP and other outbound effects

- The public contact form sends an inquiry email to CONTACT_INBOX_EMAIL (or SMTP_FROM_EMAIL) through SMTP. It returns HTTP 503/502 when delivery is not configured or fails; it does not pretend to have accepted an email.
- Team invitations create a pending organisation membership and a single-use SHA-256-hashed invitation token. If SMTP is missing, the API returns an explicit message that the invitation link must be shared manually; if SMTP is configured, it attempts to send a real email.
- Invoice email sends the invoice PDF to the requested customer email through SMTP. The UI records a success notification only after the SMTP helper returns successfully.
- The backend email utility calls SMTP directly (STARTTLS or SSL) and returns a message ID after the configured mail server accepts the message. It is not a queued/durable mail worker.
- The public demo must not use a real SMTP account that can email arbitrary recruiter-entered addresses. Point it at a private, non-relaying capture SMTP service and expose a session-scoped outbox/inbox, or disable sending and truthfully show a preview. Do not label a preview as delivered.
- The contact form should be kept outside the recruiter sandbox's mail action path or route all public contact messages to a controlled, rate-limited internal capture address; never send to addresses chosen by anonymous visitors.
- The .env.example includes a development secret and blank Firebase/SMTP values. Production validation rejects the default development secret and conflicting TLS/SSL but does not, in the inspected excerpt, enforce every possible production requirement such as strong entropy, strict TLS-only CORS origin or an SMTP capture policy. Configure exact HTTPS CORS origins and secret-manager values explicitly.

### Payments are records, not online money movement

- The payment model holds invoice/org/customer IDs, payment amount/date, method string and optional reference. Supported method labels include cash, bank transfer and credit card.
- The POST /api/payments route validates invoice ownership/membership and records the payment row, then recalculates the invoice's amount paid/balance/status.
- There is no Stripe SDK, payment-intent endpoint, card tokenization, gateway webhook or bank connection in the inspected backend.
- The demo may let recruiters create a sample/manual payment record against a synthetic invoice. It must not request card details or say that an actual credit-card charge or bank transfer took place.

### Recurring scheduler is a real separate service

- The Compose file starts a dedicated scheduler service separately from the Flask API.
- The scheduler claims a PostgreSQL advisory lock before scanning organisations and generating due recurring invoices. This avoids separate scheduler processes from running the same cycle simultaneously.
- Each recurring generation locks the organisation and due schedules, validates saved subtotal/discount/tax/total, verifies the customer belongs to the same organisation, creates a real invoice and line items, advances next_run_date and occurrence count, and records an activity entry.
- The UI currently describes this as a “Background Scheduler”; in browser-local demo mode the batch action is implemented by local updates. A live recruiter environment must show a genuine invoice row created by the scheduler API/service and persisted in PostgreSQL.
- Demo schedules should be bounded (few occurrences and short TTL); a cleanup job must stop future generation for expired demo organisations.

### Current browser-local mode has multiple state paths

- The demo branch persists a full sample dataset under a UID-specific localStorage key. All relevant data tables are updated locally by updateDemo(); the normal API methods are used only when isDemo is false.
- Sample financial totals are recalculated by calculateDemoInvoice() in the browser. This is useful for instant exploration, but it does not exercise Flask, SQLAlchemy, PostgreSQL, Firebase membership or the recurring scheduler.
- The public demo should no longer describe this path as “full product experience” without a visible browser-local label. Either retain it as a lightweight first look and add a separate “Launch live sandbox” entry point, or replace its default CTA with the isolated live backend path.

### Deployment and verification evidence

- The backend Docker Compose uses PostgreSQL 17 with persistent volume, Flask API and a separate scheduler. The API image runs migrations before serving; scheduler runs migrations then backend.scheduler.
- The frontend Dockerfile serves the compiled SPA with Nginx and uses a same-origin /api proxy. API business data is fetched from Flask; Firebase is used only for identity.
- Backend CI uses Python 3.12, dependency installation, compileall and pytest.
- Frontend CI runs both production build and Playwright E2E. The E2E workflow checks out the real backend code but starts a disposable SQLite database with a custom Flask TESTING=True config. It uses the X-Test-User headers only in that explicit testing mode, seeds a local test identity/organisation, and verifies dashboard bootstrap, sample data, invoices, payments, expenses, reports, team/settings, platform admin, tenant isolation, validation and API failures.
- The visual walkthrough says screenshots are published only after the corresponding UI checkpoint passes. The referenced CI run is https://github.com/faizansaiyed123/ledgerpulse_frontend/actions/runs/41169669887.
- CI screenshots and API assertions prove the application and its backend routes work together in the test configuration. They do not prove a deployed Firebase project, PostgreSQL 17 service or SMTP server is currently wired to a public frontend.
- The frontend public README is concise and accurately distinguishes Firebase/Auth → Flask/PostgreSQL from the browser-local sample mode.

## Recruiter demo experience to build

1. Public LedgerPulse site offers two clearly labelled routes: a lightweight browser-local walkthrough (optional) and “Open live demo workspace”.
2. Live demo bootstrap silently obtains a fresh Firebase Anonymous Auth identity, then calls the ordinary authenticated /api/auth/bootstrap (or /api/auth/me). The backend provisions a new PostgreSQL organisation and Owner membership for that Firebase UID.
3. The bootstrap creates a DemoSession linked to that Firebase UID and organisation, applies short expiry, strict quotas and a safe cleanup state, then calls the existing owner-only /api/organizations/{org_id}/sample-data endpoint to seed actual PostgreSQL rows.
4. The frontend uses its normal API mode, not isDemo, and loads the organisation's customers, vendors, invoices, payments, expenses, recurring schedules, team and activity from Flask/PostgreSQL. The interface must indicate “Sample data — persisted in the live demo workspace”.
5. Let recruiters create and edit an invoice, record a manual payment, add an expense, change a customer/vendor and inspect the resulting API response plus database-backed summary.
6. Create a bounded recurring invoice and run the real batch endpoint. Show the generated invoice number and the next-run/occurrence fields re-read from PostgreSQL. Do not show a browser-calculated invoice as a scheduler result.
7. Demonstrate team roles with temporary memberships only; route invitation messages to private capture SMTP. Disable external delivery to arbitrary email addresses.
8. Show invoice PDF generation and capture-mode invoice email. No messages should leave the private capture system.
9. Optionally retain the original localStorage demo as a visibly separate “Browser-local tour — changes stay in this browser” experience, and never call it the full-stack sandbox.
10. On expiry, revoke the demo session, remove the exact Firebase anonymous user, delete the PostgreSQL organisation and its child customer/vendor/invoice/payment/expense/recurring/activity/membership records, and clear any session-bound capture inbox. Verify other demo organisations are untouched.

## Security and engineering gates

Before marking LedgerPulse demo-ready:
- Add a DemoSession table with cryptographically random ID/token hash, Firebase UID, organisation ID, created/last-seen/expiry/revocation/cleanup fields, and a demo marker. Normal API auth must check active demo sessions for demo UIDs; Firebase ID token validity alone must not keep an expired sandbox alive.
- Enable Firebase Anonymous Authentication for the dedicated demo Firebase project or use a server-generated short-lived custom-token flow. Ensure every recruiter gets a unique UID; do not use X-Test-User headers outside TESTING=True.
- Add an IP/session rate-limited demo bootstrap. Do not put demo UIDs in PLATFORM_ADMIN_UIDS and never grant platform-admin access to a recruiter.
- Keep the current organisation membership/RBAC checks. Test two simultaneous Firebase identities cannot read or mutate each other's customers, vendors, invoices, payments, expenses, recurring records, members, activities or platform admin endpoints.
- Use the existing owner-only sample-data seed route after the backend creates the unique org. Keep its empty-workspace guard and organisation row lock. Mark all records clearly synthetic and replace customer/vendor contact addresses with reserved .example addresses (do not use real recipients or misleading actual brands in email fields).
- Configure a dedicated production PostgreSQL 17 database, persistent storage and a working Firebase Admin service account. Configure exact HTTPS CORS/origin and browser-visible API proxy route. Add a startup production guard for strong random SECRET_KEY and expected Firebase project/service account.
- Use a private SMTP capture service with no outbound relay. Capture invoice, invitation and contact messages into an inbox scoped to the DemoSession. Disable live external recipients and prevent users from changing the capture destination.
- Keep the contact form rate-limited and route only to a controlled internal sink. Never accept a visitor-supplied recipient.
- Disable real payment processor assumptions. Payment methods are ledger classifications only; do not collect card numbers or claim money moved.
- Configure the separate recurring scheduler process with PostgreSQL advisory locking. Limit demo schedules to small max occurrences and a short end date; stop generation after expiry.
- Add caps for active organisations, rows per organisation, invoices/payments/expenses, invitation count, recurring schedules, exports, email sends, request rate and session duration.
- Keep sample-data seeding transaction-safe and non-destructive. Never call db.drop_all() or reset other organisations. Verify cleanup deletes only the specific demo organisation and removes its Firebase UID through Firebase Admin.
- Exercise the real backend flow in Playwright with Firebase emulator or isolated Firebase test project and PostgreSQL (not only the current SQLite test backend); use no X-Test-User headers outside test mode.
- Verify the clean-browser experience: anonymous identity → owner organisation → seeded data from API → invoice mutation/read-back → payment ledger mutation → expense → real recurring scheduler batch → reports → SMTP capture → expiry cleanup.
- Keep browser-local mode separate and explicitly labelled. Do not show localStorage updates with production-like wording such as “saved to database” or “background worker executed”.

## Current status

**Source audit complete; anonymous Firebase demo bootstrap, DemoSession expiry/cleanup, deployed PostgreSQL/Firebase configuration, SMTP capture and live recurring-worker verification pending.** LedgerPulse already has the right backend shape for a genuine multi-tenant recruiter sandbox: Firebase identity, PostgreSQL organisation membership, a real API seed route and a separate recurring scheduler. Its current default “Explore demo” is localStorage simulation, so the recruiter flow must explicitly enter normal Firebase/API mode to satisfy the full-stack requirement.
