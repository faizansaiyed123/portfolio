# AgencyOS — source audit and recruiter demo design

Audit date: 14 November 2026

Repositories:
- Frontend: https://github.com/faizansaiyed123/agencyos_frontend
- Backend: https://github.com/faizansaiyed123/agencyos_backend

## Product understood from source

AgencyOS is a multi-tenant agency-operations workspace. It links the commercial lifecycle to delivery and financial operations rather than treating CRM, project management and invoicing as unrelated screens.

The verified product journey is:
1. Register an organization and its first owner account.
2. Add clients and contacts, create deals and move them through validated pipeline stages.
3. Draft proposals with priced line items, send/track proposal state, and accept or reject them.
4. Accepting a proposal creates a project and advances the associated deal as part of the same transaction.
5. Run projects with milestones, task boards, project members and collaboration.
6. Log time with a live timer or manual entries, then submit/approve billable work.
7. Create invoices from milestones and approved time, calculate amounts in integer cents, issue gapless invoice numbers, record payments, void eligible invoices and render PDFs.
8. Provide a role-scoped external client portal for project, proposal and invoice visibility, including client proposal decisions.
9. Review reports, notifications, approvals, search, audit history, MFA, privacy export/erasure, feature flags and signed outbound webhook delivery.

This is a broad connected application. A recruiter experience should therefore demonstrate one coherent client lifecycle rather than scattering visitors through an empty set of isolated modules.

## Architecture verified from source

- Frontend: React 18 + TypeScript + Vite 6, React Router, TanStack Query and a shared typed API client.
- Backend: Python 3.12+, FastAPI, SQLAlchemy 2, PostgreSQL and Alembic.
- Separate API and worker processes. The worker polls a PostgreSQL-native durable job queue; no external message broker is required.
- PostgreSQL Row-Level Security (RLS) is enabled and forced on tenant-scoped tables. The runtime DB role has narrower grants than the schema-owner/migration role.
- Tenant context is installed transaction-locally using `app.org_id`; the same organisation boundary is enforced in application queries and database RLS policies.
- Access JWTs are short-lived (15 minutes by default) and held in frontend memory. Rotating refresh tokens are stored in HttpOnly cookies; reuse of an already rotated token revokes its family.
- Argon2id password hashing; TOTP MFA with encrypted secrets and hashed single-use recovery codes.
- Rate limits for authentication/recovery, object and role permissions, audit events, idempotency keys and explicit business-state transition functions.
- Files use a filesystem storage adapter with a persistent mounted volume in the Docker Compose/deployment design.
- Production email is SMTP-backed. Development/test may use console or in-memory email capture.
- Outbound webhooks are signed with HMAC-SHA256 and delivered through the worker.
- Nginx serves the SPA and proxies `/api/*` to the API on the same public hostname. This is important for the existing SameSite=Strict refresh cookie.

## Important findings from source inspection

### Tenant isolation is a genuine backend/database boundary

- Signup creates an organization and its first OWNER user in one transaction. The organization ID is generated before insert so the transaction can set its RLS context before inserting the organization row.
- Auth tokens include both user ID and organization ID. Each authenticated request loads the current active user, confirms the user's org matches the token, sets the RLS context and applies a server-side permission check.
- The DB migration enables and forces RLS on tenant tables, gives the runtime application role only the required CRUD grants, and keeps audit logging append-only for that role.
- The frontend permission matrix is only a UI hint; the API dependencies and object-level service queries are authoritative.
- Roles include Owner, Admin, Account Manager, Project Manager, Team Member, Finance and Client. A Team Member sees only their assigned projects/tasks, while other roles have different capability sets. A Client role is deliberately linked to one client record and uses a restricted portal.
- The portal service checks both organisation and client ID for every project/proposal/invoice query and decision.
- There is no anonymous/public seeded demo tenant in the inspected application. The right recruiter model is a unique short-lived organisation and synthetic records per visitor, not one shared workspace.

### Authentication and recovery are more complete than a simple demo login

- Signup/login, password reset, MFA enrollment/confirmation/disable, one-time invite acceptance, refresh rotation and logout revocation are implemented.
- Refresh cookies are HttpOnly, Secure in production and SameSite=Strict, scoped to the auth path. The frontend uses the same-origin API proxy to preserve this model.
- Login/recovery/signup are rate limited. Invite creation supports idempotency keys so safe retries do not create duplicate invitations.
- A recruiter session should be bootstrapped without asking visitors to complete an external email workflow, but it must still produce an explicitly marked, unique, temporary identity and use the normal token/cookie validation path.

### CRM, proposals and projects are real transactional workflows

- Clients, contacts, deals, proposal records/items, projects, tasks and milestones are stored in PostgreSQL and scoped by organisation.
- Deal stages use an explicit state machine; the backend rejects skipped/invalid transitions and records stage history.
- Proposal item editing is restricted to draft proposals. Sending a proposal changes its state and schedules a delayed expiry job when a valid-until date exists; source inspection does not show this send endpoint delivering the proposal by email.
- Accepting a proposal validates its state, computes its total, marks it accepted, creates a project from its line items and advances the originating deal. Service calls participate in one outer transaction and commit once, avoiding half-created project/deal state.
- Projects have an explicit lifecycle and restricted roles see only their assigned projects. Project tasks and milestone changes persist through the API.
- A project can contain billable milestones and linked time records. This gives the demo a useful end-to-end chain: proposal → accepted project → tasks/time → invoice.

### Time tracking and collaboration are actual backend capabilities

- The work screen calls backend timer start/stop endpoints and also supports manual time entries, updates/deletion and approval.
- Time entry approval is permission-controlled. Invoice creation can include approved, unbilled time; adding time to an invoice links the entry so it cannot be billed twice.
- Comments, approval requests, notifications and a server-sent-events notification stream are implemented. The SSE stream uses a short-lived ticket created under the authenticated session rather than placing the normal bearer token in the stream URL.
- These flows need a real API and persistent database. The frontend's realtime collaboration controls should not be replaced with local-only state in the recruiter environment.

### Billing means invoice records and manual payment recording—not a payment gateway

- Amounts are stored/calculated in integer cents. Invoice totals are derived from line items and basis-point tax rates.
- Invoice numbering uses an organisation/year counter updated with PostgreSQL upsert semantics, giving gapless numbers for issued invoices in the intended workflow.
- Invoices can be built from custom lines, milestones and approved time. The backend uses row locks for payment recording and rejects payments that exceed the remaining balance.
- Payment entry creates a persisted Payment record. The inspected application does not integrate a card processor or initiate bank transfers; the user manually records a payment method/reference/amount.
- Invoices can be issued, voided only when eligible, rendered as PDFs and emailed through a worker job.
- The frontend's Reports page displays persisted invoice/collection, pipeline and utilisation calculations; those values should be produced from the demo tenant's own seeded and visitor-created records, not hard-coded screenshots.

The recruiter demo should label payments as test/manual records and must not collect real card/bank details or present the product as processing live payments.

### Email and webhooks are real external side effects

- Production settings require SMTP configuration and a verified sender.
- Invite and password-reset messages are queued by the identity module. Invoice email rendering creates a PDF attachment and sends it to the client's selected contact.
- Email backends include console and memory modes for development/test. A recruiter demo should use an isolated capture sink with no external relay; it must not use the production SMTP account.
- Webhook endpoints are tenant-scoped and admin-only. The application creates delivery rows and queue jobs in the same transaction as the business event, signs payloads using a stored encrypted secret and retries failed deliveries with exponential backoff/dead-letter behavior.
- Webhook setup rejects non-HTTPS production URLs, localhost/internal hosts and literal private IPs. The sender also resolves DNS and rejects non-public answers immediately before making the request.
- Security review gate: the current sender checks DNS and then makes a separate HTTPX request that performs its own hostname resolution. That is not the same as pinning the validated IP to the actual socket. Re-test DNS-rebinding/TOCTOU cases and pin the resolved destination or use an egress proxy before allowing public recruiter-configurable webhook targets.
- For the demo, never accept arbitrary visitor-supplied webhook targets. Use a fixed portfolio-owned capture receiver with session-scoped delivery history, or disable webhook configuration and display only the internal queued event/outbox state.

### File storage and data cleanup

- File uploads have a configured maximum size, extension allowlist, content-type checks, magic-byte checks and filename sanitization. Downloads use attachment disposition and nosniff; file lookup is scoped by organisation.
- The shipped storage adapter writes under a configured filesystem root and uses a persistent volume in Docker Compose. An ephemeral serverless filesystem is not an acceptable deployment for a demo that permits uploads.
- The privacy module exports user-scoped profile/time/comment/task/notification/approval/file/audit data and supports erasure.
- User erasure intentionally anonymises the user rather than deleting every row: invoices/payments, time entries and audit records remain for accounting/legal retention, while personal identifiers, login credentials, MFA, sessions, notifications and comment text are removed.
- That privacy operation is not the same as expiring a whole demo organisation. Demo expiry must remove or archive the entire demo tenant and its files/jobs/webhook deliveries with a dedicated, verifiable cleanup process. It must not call only the user-erasure endpoint and assume all data is gone.

### Assistant scope must be represented accurately

- The source explicitly describes the assistant as PostgreSQL full-text search with keyword intent routing to reporting shortcuts.
- It searches tenant-scoped clients, deals, proposals, projects, tasks and invoices; certain question patterns route to pipeline, overdue, attention and outstanding-invoice reports.
- It returns real matching rows and report outputs; it does not call an LLM, perform vector/semantic search or generate free-form AI answers.
- The UI labels it as keyword-based. The portfolio must preserve that wording and not market it as an AI agent or RAG system.

### Existing verification evidence and its limits

- Backend README/deployment docs describe pytest, Ruff and Docker checks. Frontend CI runs formatting, production build, Playwright public-route browser tests and Docker build. A companion workflow checks out the current backend main branch and runs install, Ruff, pytest and Docker build.
- The frontend README says every screen talks to the real API with no mock response layer and that API types were checked against live responses.
- The visual verification document has screenshots for empty/populated dashboard, clients, deals, proposals, projects, time, invoices, reports, team, settings, security and mobile views.
- However, the checked-in frontend Playwright specs inspected here cover the public homepage and sign-in route only; they are not a full authenticated end-to-end recruiter journey. The backend's inspected `tests/test_production_regressions.py` contains targeted unit/regression checks, not the whole cross-module demo journey.
- Visual screenshots are useful UI evidence; they do not prove that a current public deployment, SMTP sink, worker, database, file volume or webhook receiver is online. No public AgencyOS deployment was verified in this audit.

## Recruiter demo experience to build

1. Open a public product explanation that shows the connected agency lifecycle and clearly says all people, companies, projects, invoices and activity are synthetic.
2. "Enter demo workspace" creates a unique short-lived organization and owner user. Seed one fictional client/contact, a deal, a proposal with line items, and a small team of temporary roles.
3. Walk through a real deal-stage transition and proposal creation. Accept a proposal and show the resulting project plus deal update from the actual backend transaction.
4. Move project tasks, complete a milestone, log time and submit/approve that time using separate synthetic role sessions where helpful.
5. Create a draft invoice from the approved time/milestone, calculate the real total, issue it, render/download its PDF and record a fictional manual payment. Prominently label it as a demo payment record—not a payment processor or actual money transfer.
6. Inspect the client portal using a second isolated client-role identity linked only to the demo client. Show that it sees only its own project/proposal/invoice and can accept/reject a proposal where permitted.
7. Exercise comments, approval requests, notifications and SSE updates against the same temporary organization.
8. Show file upload/download with small synthetic documents written to a per-demo persistent or object-storage namespace.
9. Use a private SMTP capture sink for invite/reset/invoice messages. No email can reach real recipients.
10. Use a fixed capture webhook receiver, or disable external endpoint configuration; let the recruiter inspect event payload, signature metadata and retry state without sending requests to arbitrary destinations.
11. Expire and purge the temporary organisation and its associated rows, users, files, queued jobs, notifications, outbox and webhook records. Ensure no sample data leaks between concurrent demo sessions.

## Security and engineering gates

Before marking AgencyOS demo-ready:
- Add an explicit `DemoSession` record (random opaque ID/token hash, user/org linkage, creation/last-seen/expiry/revocation, demo marker) and a rate-limited bootstrap. Do not identify demo data only by a reserved email suffix.
- Create a unique PostgreSQL organisation per visitor using the normal signup/tenant bootstrap semantics. Never put recruiters in a shared owner account or shared tenant.
- Seed only reserved synthetic identities/domains/phone numbers and fictional company/project data. Never use real customer records or authentic company financial data.
- Keep RLS enabled/forced and the production runtime DB role non-owner. Add two-tenant negative tests across CRM, proposals, projects, tasks, time, invoices/payments, portal, files, reports, comments, notifications, audit, exports and webhook deliveries.
- Keep the same-site Nginx proxy topology, HttpOnly Secure SameSite=Strict refresh cookies, short access-token lifetime, refresh rotation, CSRF/origin protections and exact HTTPS CORS origin.
- Create only synthetic owner/account-manager/project-manager/team-member/finance/client demo identities. Do not provide the public demo owner with cross-tenant or deployment administrator privileges.
- Disable real SMTP. Route invites, password reset and invoice email to a private no-relay capture service and expose only session-scoped captured messages. If the sink is unavailable, show queued/failed state; do not claim sent.
- Do not enable arbitrary webhook URLs. Use a fixed owned receiver and keep webhook payloads tenant/session-scoped. Resolve the DNS-rebinding gap by pinning the validated IP to the connection or enforcing a network egress policy; test redirects, DNS changes and private/link-local/metadata destinations.
- Do not connect a live payment gateway or collect card/bank data. Keep payments as explicitly fictional/manual records in the demo.
- Use per-demo persistent storage or object storage for uploads. Apply the existing upload byte cap, extension allowlist, content-type and magic-byte checks. Test cross-tenant download/delete denial.
- Put limits on demo bootstrap rate, active tenant count, database rows, invitations, comments, upload bytes, reports, SSE clients, worker jobs, webhook deliveries and session lifetime.
- Ensure accepted proposal, project creation, deal transition, time approval and invoice creation remain transactional/idempotent.
- Add demo expiry cleanup for all tenant-owned records, storage blobs, refresh tokens, invite/reset tokens, pending jobs/outbox records, notifications, webhook endpoint secrets/deliveries and files. Use a privileged cleanup path that targets only explicit demo-session-linked organizations; do not weaken normal RLS or let a visitor choose an org ID.
- Verify the separate API and worker deployments, PostgreSQL migrations/roles/RLS, persistent storage, health/readiness, email sink, webhook sink and same-origin frontend proxy.
- Add authenticated Playwright journeys (not just public route smoke tests) for the complete chain: demo bootstrap → deal → proposal acceptance → project/task/milestone → time approval → invoice/PDF/manual payment → client portal → expiry cleanup.
- Verify two browsers concurrently cannot see each other's data and that a visitor's expired refresh token, SSE ticket and queued jobs cannot read/write demo records after expiry.

## Current status

**Source audit complete; isolated recruiter tenant, private email/webhook sinks, persistent demo storage, full authenticated E2E and public deployment verification pending.** AgencyOS has strong architectural foundations (RLS, roles, auth rotation, transactional jobs and explicit state machines), but no anonymous recruiter tenant or verified public runtime was found. Do not call the demo live until the complete cross-module journey passes against the deployed API, worker, PostgreSQL and storage stack.
