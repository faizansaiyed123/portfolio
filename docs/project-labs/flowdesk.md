# FlowDesk — source audit and recruiter demo design

Audit date: 14 November 2026

Repositories:
- Frontend: https://github.com/faizansaiyed123/flow-desk_frontend
- Backend: https://github.com/faizansaiyed123/flow-desk_backend

## Product understood from source

FlowDesk is a multi-tenant workspace for small teams to manage client relationships, projects, Kanban tasks, work time, invoices, membership and integrations.

Its core workflow is:
1. Register a user and create a workspace (tenant).
2. Add clients and create projects linked to those clients.
3. Create tasks, assign workspace members, move tasks across the Kanban board and add comments.
4. Track time manually or use a server-side start/stop timer.
5. Generate an invoice from eligible unbilled time entries or add manual line items.
6. Move the invoice through valid state transitions: Draft → Sent → Paid/Overdue/Void.
7. Invite additional members, accept an invitation, change roles, and remove/revoke members/invitations under the owner/admin rules.
8. Inspect dashboard metrics, activity, search and notifications.
9. Create/revoke tenant-scoped API keys, configure outbound webhooks and inspect delivery history.
10. Upload, download and delete project/task attachments.

The product has meaningful role and tenant semantics, rather than being a single-user task list.

## Architecture verified from source

- Frontend: React 19 + TypeScript + Vite, React Router, TanStack Query, Zustand, dnd-kit for the Kanban UI and Recharts for dashboard charts.
- Backend: Python 3.12, FastAPI, SQLAlchemy async, PostgreSQL and Alembic.
- The browser calls a same-origin `/api/v1` path; Vite proxies it to the FastAPI process in development. The frontend repository has a Dockerfile and Nginx configuration for a same-origin production reverse proxy.
- Backend settings require a `SECRET_KEY`; access tokens default to 30 minutes and refresh JWTs to 30 days.
- Auth tokens are JWT bearer values. The frontend stores both access and refresh tokens in persisted Zustand state (`localStorage`, key `flowdesk-auth`) and sends the active tenant ID in `X-Tenant-Id`.
- A tenant-scoped `AuthContext` is required by protected service routes. It carries user, tenant ID, membership role and membership ID.
- The backend's async DB dependency commits on successful request completion and rolls back on exceptions.
- PostgreSQL is the required application database. Alembic migrations are explicit and must be run before starting the API; the app does not auto-run migrations.
- Local-disk attachments are stored below a tenant-ID directory. There is no separate background worker or durable job queue in the inspected backend. Webhooks are sent synchronously/best-effort as part of the service call, with a short timeout and a persisted delivery result.
- Optional SMTP is synchronous. When SMTP is disabled/unconfigured, the email service logs email content and says it is not sent.
- Redis is an optional configuration field in the inspected settings; it is not a mandatory service in the audited primary workflow.

## Important findings from source inspection

### Tenant isolation is a first-class application contract

- Registering an account creates a unique User, Tenant and OWNER Membership. A user can belong to several tenants and select the active tenant.
- Access JWTs carry `tenant_id`; the `AuthContext` dependency checks that the active user exists, is enabled and still has a membership for that tenant.
- The optional `X-Tenant-Id` header must match the tenant embedded in the token. API keys also resolve the current membership and cannot outlive/detach from the role of their creator.
- Business models and service queries are tenant-scoped. Clients, projects, tasks, time entries, invoices, attachments, activity, API keys, webhooks and notification records use the authenticated tenant ID.
- Roles are OWNER, ADMIN, MEMBER and VIEWER. Membership role changes and invitation/removal operations are constrained by the current tenant and role; the last owner cannot be removed/demoted through the covered logic.
- The browser-level tenant-isolation E2E test opens two independent browser contexts, registers two independent workspaces, creates a uniquely named client in Tenant A, then verifies it is absent in Tenant B. A second test verifies global search in one workspace cannot retrieve another workspace's client.
- Backend tenant tests cover workspace creation/settings, invitations and acceptance, duplicate invitation rejection, role permissions, last-owner safeguards, invitation expiry/revocation and membership behavior.

This is an appropriate foundation for a recruiter demo. The demo does not need one shared public workspace: each visitor should receive a newly created, short-lived tenant with its own synthetic client/project/task data and temporary owner identity.

### Authentication details and token lifecycle

- Registration creates the owner user, tenant and membership and immediately returns access + refresh tokens. There is no blocking email verification flow in the tested registration path.
- Login returns a token pair. Refresh accepts the refresh JWT in the request body, validates its signature/type/expiry and rechecks the user's active state and tenant membership, then issues another token pair.
- Source inspection did not find a persisted refresh-session table, token-family rotation record, or server-side refresh-token revocation endpoint. The refresh token is a stateless signed JWT and can be replayed until expiry while the associated account/membership remains valid. This is a weaker revocation/replay posture than a persisted rotating refresh-session design.
- The frontend persists both JWT tokens in localStorage. This is convenient for the existing app, but a public portfolio demo should use a short-lived isolated identity, strict CSP/XSS hardening and a short expiry; ideally the auth implementation should be upgraded to a server-side session/HttpOnly cookie with persisted refresh rotation/revocation.
- Production settings do not visibly enforce minimum SECRET_KEY entropy/length, HTTPS origins, secure-cookie requirements (because cookies are not used) or a non-wildcard CORS list. A deployment config validator is needed before public exposure.
- Password reset tokens are persisted with expiry and single-use state. The password-reset endpoint returns a generic response for an unknown email. In the visual test workflow, email is disabled; the reset link is surfaced from development-mode logging, not delivered to an external mailbox.

### Clients, projects, tasks and time are real persisted workflows

- Services use `tenant_id` filters for list/detail/update/delete operations and validate linked client/project relationships against the same tenant.
- Projects are tenant-scoped and include client relationship, status, description and stats (task completion, total/billable time and estimated cost).
- Task boards are grouped by project/status and persist create/update/move/assignment/comment operations.
- Notifications are tenant/user-scoped and read/unread state persists. Task assignment creates a notification for the assigned teammate.
- Manual time entries are timestamped and tenant/project-scoped. Users can edit/delete only their own entries, and entries already attached to an invoice cannot be edited/deleted.
- The timer is backend state, not just a browser stopwatch. The server enforces one active timer per user/tenant and records the actual stop time/duration.
- These routes are all used by the actual frontend API client and checked by API plus browser tests.

### Invoices are workspace records, not payment processing

- Invoices can be created manually with line items or generated from eligible billable completed time entries.
- Time entries are linked to the generated invoice and marked invoiced so the same work cannot be billed twice.
- Invoice state transitions are explicitly constrained: Draft → Sent/Void, Sent → Paid/Overdue/Void, Overdue → Paid/Void; Paid and Void are terminal.
- The API's `mark-paid` route changes the invoice status to PAID and stores a paid date. The inspected model/service does not include a card gateway, bank connection, external payment intent or payment transaction record.
- Tenant model documentation explicitly says there is no real payment processor wired up.
- The demo should call this “mark as paid” / “sample paid status”, not a payment gateway or money transfer. Do not collect card/bank data or connect live payment credentials.

### API keys are tenant-bound and hashed

- A generated API key uses a `fd_live_` prefix. Only SHA-256 hash and prefix are stored in PostgreSQL; the plaintext is returned once on creation.
- Every API key resolves the creator's current membership and role on each request. It is rejected when revoked/expired or when the creator is no longer a member.
- The admin API supports create/list/revoke; the UI displays the raw key only at creation.
- A recruiter demo must issue only a temporary key for that visitor's tenant, show it once, restrict allowed operations and revoke it on reset/expiry. Never reuse a permanent API key or write one into static frontend config.

### Webhooks are real outbound requests and have an SSRF gap

- Webhooks are created under the current tenant and require at least ADMIN.
- The secret is generated once and returned only at creation; the system persists delivery history with event, payload, HTTP response status/body and success/failure.
- Outgoing requests use HTTPX directly to the configured `target_url` with a 5-second timeout. The delivery is synchronous and best-effort; a failure is stored but does not fail the invoice/task/project action.
- The route/service does not validate schemes/hostnames against private/link-local/loopback/cloud metadata destinations, resolve and pin DNS, or disable redirects explicitly.
- Consequently, arbitrary webhook destinations let a tenant admin use the backend as an SSRF-capable network client. Do not enable public visitor-supplied webhook URLs in the recruiter demo.
- Safe demo choice: disable webhook creation entirely or accept only a hard-coded portfolio-owned HTTPS capture receiver. If the general feature is retained outside the demo, add strict URL/DNS/IP validation, DNS pinning/egress filtering, redirects disabled, a short timeout and regression tests for DNS rebinding and metadata/private hosts.

### Emails are disabled in the CI demo, but not an inbox simulation

- The email service sends invitation/password reset mail through SMTP only when `EMAIL_ENABLED` and an SMTP host are configured.
- Otherwise it logs the full recipient and message content to the backend log and returns success as “not sent”.
- The full-stack CI explicitly sets `EMAIL_ENABLED=false`, so its password recovery and invitation workflows test API/database behavior and invitation acceptance in a second browser, not real external email delivery.
- Public recruiter sessions should use a private non-relaying capture inbox (or clearly label email as not sent/queued). Do not turn on a real SMTP credential for visitors. Avoid logging real visitor emails, reset links or invitation tokens in public logs.

### Attachments need an ingress cap and content inspection

- Storage paths are tenant-scoped: `{UPLOAD_DIR}/{tenant_id}/{attachment_uuid}.{ext}`, preventing path collision across tenants.
- The service rejects invalid filenames, extensions outside the allowlist and content larger than the configured 15 MB limit; attachments must be linked to a valid project or task in the same tenant.
- List/download/delete queries are tenant-scoped and file deletion removes the file and DB row.
- The upload router calls `await file.read()` before the service applies the size cap, which means a large request is fully buffered before rejection. Add reverse-proxy request-body limits and bounded streaming reads.
- The inspected validation is extension-based; it does not check magic bytes/content type against the actual content, and no malware scanning is evident. For a public demo, cap size lower, permit only small synthetic fixtures and add content-signature validation. Keep local storage persistent and ensure a demo reset deletes only that tenant's directory.

### No durable worker/queue in the inspected release

- The repository has no dedicated worker module or transactional outbox in the fetched source tree.
- Webhook delivery is attempted directly during service execution, so slow destinations are bounded by a 5-second timeout but delivery retries/queueing are not a background durable workflow.
- Email is sent synchronously from the auth/invitation service if SMTP is enabled.
- Avoid describing FlowDesk as having a background worker or durable event queue unless a later source revision adds one.

### Deployment and verification evidence

- The frontend README is still the stock Vite template; the dedicated visual walkthrough and endpoint coverage docs are the meaningful product documentation.
- The endpoint coverage inventory lists 75 versioned method/path combinations across 15 routers; the registered routes include auth, tenants/invitations, user profile, clients, projects, tasks/comments, notifications, time, invoices, webhooks, API keys, attachments, activity, dashboard and search.
- The frontend full-stack workflow starts PostgreSQL 16, applies Alembic migrations, runs the backend pytest suite, starts FastAPI, runs Vite, performs frontend lint/build/unit tests and real Playwright browser journeys, and queries the resulting PostgreSQL records directly.
- The visual walkthrough reports a successful linked full-stack CI run (run ID 41214841491) and explains that the browser hits the real API rather than mocked responses. The walkthrough includes actual tenant-aware registration, client/project/task/time/invoice workflows, membership/invitation, API keys, webhooks, search, notifications and attachments.
- The browser isolation tests specifically create two workspaces and verify a client's record and global-search result are not visible in the other workspace.
- The E2E run sets `EMAIL_ENABLED=false`; email delivery is not externally verified. Webhook integration tests use controlled HTTP responses; they do not prove an arbitrary live endpoint is safe.
- No current production FlowDesk API/frontend deployment was independently verified in this source audit. The app URL should remain `verification-pending` until the exact deployed frontend, API and PostgreSQL schema pass a clean-browser smoke test.

## Recruiter demo experience to build

1. Open a public, read-only FlowDesk introduction with no registration form required.
2. Select “Enter demo workspace”. The backend creates a short-lived unique user + tenant + OWNER membership through the same tenant bootstrap logic, and returns an isolated session. Do not send the recruiter into the shared test tenant.
3. Seed a small fictional workspace with two synthetic clients, a project, several tasks in different Kanban states, one second team-member role, a sample running/stopped time entry and a draft invoice.
4. Let the recruiter create/update clients/projects/tasks, move a card across columns, add a comment, start/stop the actual server timer, and inspect dashboard/activity/search changes.
5. Show an invited teammate using a second isolated identity or controlled in-app role switch; do not require actual external email. Show membership scope and role restrictions.
6. Generate an invoice from the visitor's billable time, then move the sample invoice through Sent → Paid. Label Paid as a demo status, not a real financial transfer.
7. Let the recruiter create a disposable tenant API key, reveal it once in the current session and revoke it. Do not use it as a permanent external integration.
8. Keep webhook URL configuration disabled or fixed to a portfolio-owned HTTPS capture receiver. Show the persisted delivery record and controlled success/failure states without outbound calls to arbitrary URLs.
9. Upload a small synthetic attachment. Keep it in a persistent per-tenant storage directory and demonstrate authenticated download/delete.
10. Expire the session, revoke its tokens/API keys/invitations and delete all tenant-owned rows plus only that tenant's attachment directory.

## Security and implementation gates

Before marking FlowDesk demo-ready:
- Add an explicit `DemoSession` record/token hash linking the temporary user + tenant, creation/last-seen/expiry/revocation and cleanup status. A normal per-visitor signup can be a starting point, but recruiters should not have to register manually.
- Keep one new tenant per visitor. Preserve all membership and tenant filters in routes/services. Add simultaneous two-browser tests for every major resource (clients, projects, tasks, comments, time entries, invoices, activity, notifications, search, invitations, API keys, webhooks, attachments).
- Use only synthetic names/contact records and never expose real user or workspace records.
- Improve auth: persist refresh-session hashes, implement refresh rotation/revocation/reuse detection and a logout/session invalidation path; shorten demo refresh lifetime; consider HttpOnly Secure SameSite cookies instead of persisted localStorage refresh JWTs; use strict CSP/XSS defenses.
- Add production settings validation: high-entropy SECRET_KEY, exact HTTPS CORS origins, expected API proxy/domain, explicit production mode and secure logging.
- Keep email in capture mode/no external SMTP. The capture UI must not expose another tenant's invitation/reset content. Redact full email, invitation token and reset URL from all logs.
- Disable visitor-configurable webhook URLs. Use one fixed owned HTTPS receiver or keep the endpoint UI read-only. For general public URL support, implement SSRF protection including DNS pinning or egress policy, private/link-local/loopback/metadata rejection, redirect restrictions, short timeout, and security regression tests.
- Keep invoice payment as a synthetic status transition only. No external processor or financial data.
- For attachments, reject oversized bodies at reverse proxy and while streaming rather than after reading all bytes; verify file signatures/content type as well as extension; lower demo size limit; optionally scan; ensure per-tenant persistent storage and safe expiry cleanup.
- Limit temporary workspaces, active sessions, rows, invitations, task/comment volume, API-key count, upload volume, webhook events and rate of public demo bootstrap.
- Revoke all demo API keys and outstanding invitation/reset tokens when the demo expires; delete its membership and tenant-owned records in safe FK order; clean only the exact tenant storage folder.
- Verify database migrations separately from service startup, PostgreSQL readiness, frontend same-origin proxy and deployed API URL.
- Run the complete real-browser demo journey against the deployed stack, including two independent browser contexts and a direct PostgreSQL read-back after every core mutation.

## Current status

**Source audit complete; per-visitor demo bootstrap/cleanup, refresh-token revocation, webhook SSRF hardening, bounded/content-checked uploads, email capture and public deployment verification pending.** FlowDesk is a strong candidate for a genuine recruiter sandbox because it already has first-class tenant isolation and real PostgreSQL/browser E2E evidence, but arbitrary webhook destinations and the current refresh/localStorage design must be addressed before public use.
