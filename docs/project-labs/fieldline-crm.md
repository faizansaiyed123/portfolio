# Fieldline CRM — source audit and recruiter demo design

Audit date: 14 November 2026

Repositories:
- Frontend: https://github.com/faizansaiyed123/fieldline-crm-frontend
- Backend: https://github.com/faizansaiyed123/fieldline-crm-backend

## Product understood from source

Fieldline is a connected small-business CRM and follow-through workspace. It joins customer/company records to opportunities, activities, tasks, and pipeline stages, then adds deterministic operational intelligence and data-quality workflows.

The source, product walkthrough, and feature-coverage matrix confirm these user journeys:

1. Create a company and contacts, associate them, and keep their records current.
2. Create opportunities connected to the right company/contact, move them through a configurable pipeline, and record Won/Lost outcomes.
3. Keep activities and follow-up tasks on the customer/opportunity timeline.
4. Use a work planner and attention queue to make overdue, inactive or stuck work actionable.
5. Import contacts through CSV preview, row-level validation, duplicate checks, dry-run and explicit commit.
6. Create reusable saved contact views, execute them, edit their definitions and sharing, and verify saved versions.
7. Find possible duplicate contacts/companies and perform a controlled merge while preserving linked activities, tasks, opportunities and company relationships.
8. Configure deterministic organization-specific business rules and opportunity-triggered automations.
9. Inspect relationship health, graph/timeline, automation execution history, audits and system diagnostics.

The backend architecture documentation deliberately describes a modular monolith. It uses clear domain boundaries within one service rather than requiring a separate queue/worker system.

## Architecture and application boundaries verified in source

- Frontend: Next.js 16, React 19, TypeScript, TanStack React Query and Playwright.
- Backend: FastAPI, Python 3.13+, PostgreSQL 18, SQLAlchemy 2 and Alembic.
- No Redis, Celery, external message broker or separate worker is required by the current implementation.
- Browser API requests use the same-origin `/api/v1/*` path. Next.js rewrites them server-side to `BACKEND_URL`; this keeps browser traffic on the frontend origin while the backend owns auth and CSRF behavior.
- The frontend API client holds the short-lived access token in React application memory, not localStorage. The refresh token is in an HttpOnly cookie; a separate readable CSRF cookie is paired with an `X-CSRF-Token` header for refresh/logout.
- Backend authentication uses Argon2 password hashing, signed access tokens with issuer/audience/type/expiry claims, persisted refresh sessions stored as hashes, session rotation/revocation, CSRF checks and database-backed authentication throttling.
- Production settings reject the development signing secret and require secure cookies.
- Organization membership is an authorization boundary, not a frontend-only filter. Every organization-scoped route uses membership dependencies or a narrower role dependency.

## Important findings from source inspection

### Authentication is not a public anonymous workspace

- The public app routes provide login and signup; dashboard and CRM workspace features use the authenticated session.
- Signup creates a new organization, user, OWNER membership, a default pipeline, and a refresh session.
- There is no public guest/demo organization or anonymous CRM API mode in the inspected implementation.
- Signup is rate-limited by client IP, but exposing the ordinary signup route as the only demo path would still let anonymous visitors create durable organizations and user accounts.
- The current frontend session restoration calls the backend refresh endpoint on startup; the backend validates the CSRF cookie/header and rotates refresh tokens.
- The demo should use a dedicated temporary identity/workspace bootstrap rather than showing a common email/password or bypassing the existing session/CSRF protections.

### Tenant and role boundaries

- Companies, contacts, opportunities, tasks, activities, saved views, pipeline, relationship context, data quality and other business records carry an `organization_id`.
- The auth authorization helper resolves a user's Membership for the requested organization; a user without membership is denied.
- Backend tests explicitly exercise separate organizations, reject foreign organization access, and check foreign company/contact relationships.
- Roles include OWNER, ADMIN and MEMBER. CRM record operations generally require membership, while the following sensitive operations are narrower:
  - Contact CSV import preview/commit: OWNER or ADMIN.
  - Contact/company merge: OWNER or ADMIN.
  - Automation-rule management and execution-history access: OWNER or ADMIN.
  - Business-rule updates and system-health diagnostics: OWNER or ADMIN.
- Frontend permission helpers mirror the intended UX, but server-side role/tenant checks are the actual security boundary.

A public demo must create one independent organization per visitor. A shared organization would make all contacts, pipeline, tasks, imports, views, and activity visible to every recruiter and allow concurrent visitors to overwrite or merge one another's records.

### Import pipeline and file boundary

The implementation supports a useful evidence-rich workflow:
- Only defined CSV headers are accepted; first_name and last_name are required.
- Invalid UTF-8, duplicate/unsupported headers and NUL bytes are rejected.
- The parser defines a 5 MB maximum, 5,000 row maximum and a bounded error-row response.
- Existing organization contacts and duplicates inside the import are checked.
- A preview records per-row status/errors without creating contacts.
- Dry-run reports what would be created without writes.
- Commit rechecks duplicates and writes transactionally; a conflict prevents partial import.
- Backend tests cover invalid rows, dry-run, commit/read-back, duplicate revalidation and role restrictions.

One public-demo hardening issue is visible in the route: it calls `await file.read()` before passing the bytes to the parser, where the 5 MB check occurs. The parser's size limit is useful but happens after the upload has been read into memory. Add a request/ingress body cap and bounded streaming read before enabling public uploads. For the initial recruiter tour, ship a small synthetic CSV fixture and keep upload limits strict.

### Controlled merge behavior

- The merge service verifies that both the survivor and merged record belong to the requested organization.
- It transfers linked activities, tasks, opportunities and company/contact references to the survivor before retiring the duplicate.
- A MergeOperation record captures the merge, and an organization-scoped idempotency lookup prevents the same merge operation from being applied again.
- API access is OWNER/ADMIN only.
- The product coverage documentation and backend tests describe checking that old IDs disappear and linked records point to the survivor.

This should be demonstrated only against the current visitor's synthetic workspace. Make the action explicit and show the survivor/duplicate mapping and related records that will be moved before committing.

### Automation is currently an internal task action

- Organization owners/admins can configure automation rules for `opportunity.won` and `opportunity.lost`.
- The current supported action type in the automation service is `create_task`.
- On a qualifying opportunity transition the backend creates an internal follow-up task, records an AutomationRun, and writes an audit event.
- The run uses a unique rule/event key so a repeated update does not create duplicate tasks.
- Tests verify a Won transition creates exactly one task/run and a Member cannot create an automation rule.
- There is no current requirement for an external email, SMS or webhook destination in this workflow.

Therefore, the demo can safely demonstrate real automation by changing a synthetic opportunity to Won/Lost and observing the generated task/run. Do not invent external notifications or describe them as implemented.

### No real customer data or third-party side effects in the demo

The product is a CRM and therefore stores personal contact details, company context, opportunity values, relationship histories and notes. The recruiter workspace must use fictional names, reserved example-domain email addresses, fake phone numbers and synthetic business records only.

The demo should avoid:
- Real company/customer contact uploads or visitor-provided personal CRM data.
- Sending messages to real recipients (the currently inspected automation action only creates an internal task).
- Importing or merging data across organizations.
- Exposing backend/database diagnostics beyond a safe, redacted demo health status.
- Reusing production account credentials or an existing workspace.

## Recruiter demo experience to build

1. Open a public product explanation with a sample CRM journey and clear synthetic-data label.
2. Choose "Enter demo workspace". A backend bootstrap creates a short-lived, unique demo identity and organization, seeds its own fictional companies/contacts/opportunities/tasks/activities, and returns the normal auth session.
3. The recruiter enters the real Fieldline UI and can move a sample opportunity, inspect its company/contact relationship, timeline, attention reason and next action.
4. Let them create/edit synthetic records, add an activity and complete a follow-up task.
5. Let them open a supplied synthetic CSV fixture, inspect row-level validation, run a dry-run, and commit within strict limits. The imported contact appears in the regular list.
6. Let them preview an explicit synthetic duplicate pair, choose the survivor, review linked activity/task/opportunity transfers, then commit the merge. Show the audit/merge result.
7. Let them enable a sample Won/Lost automation and transition a sample opportunity to show one internally generated follow-up task and one automation execution record.
8. Let them inspect a saved view, relationship graph, planner, data-quality report and audit trail.
9. Provide a reset for that visitor's workspace only. The visitor's identity, workspace, and data expire automatically.
10. Keep links to the real frontend/backend source repositories and relevant tests beside the walkthrough.

## Security and implementation gates

Before marking Fieldline demo-ready:
- Add a dedicated `DemoSession` record with a cryptographically random opaque ID/token hash, explicit user/organization linkage, created/last-seen/expiry/revocation timestamps and a demo marker. Do not classify demos by a guessable email prefix.
- Provide a rate-limited demo bootstrap that creates a unique temporary User, Organization, OWNER membership, default pipeline and synthetic records in one transaction. Generate random credentials; never expose or share a permanent password.
- Use the existing normal access-token/HttpOnly refresh-cookie/CSRF flow. Keep the access token in memory and preserve refresh rotation and logout revocation.
- Ensure every API request from a demo user is scoped to that visitor's organization by the existing membership authorization. Add tests with two simultaneous demo organizations for companies, contacts, opportunities, tasks, activities, views, imports, merges, automation, and relationship APIs.
- Limit demo session duration, number of active sessions per source IP, record counts, history sizes and mutation rates. Bound seeded records and rate-limit bootstrap/reset.
- Only seed synthetic contacts and opportunities. Use example domains and reserved/fake telephone numbers. No real CRM exports.
- Restrict imports to CSV, maximum 5 MB and 5,000 rows (or lower in demo). Enforce the limit while streaming/reading and at reverse proxy/Next request boundary, not only after reading the complete file. Use a small fixture as the default tour.
- Keep merge and automation OWNER/ADMIN-gated. Show a confirmation view before merging or changing opportunity state. Make reset unable to address non-demo organizations.
- Review whether archived records, audit events, saved views, and foreign keys are removed or retained safely when a demo expires. Cleanup must delete only resources explicitly linked to the expired DemoSession, with safe FK ordering and no effect on durable organizations.
- Preserve PostgreSQL transactions, merge idempotency and automation event idempotency.
- Deploy the frontend and backend as a compatible pair. Set `BACKEND_URL` at Next build time to the correct HTTPS backend origin; browser requests should still use same-origin `/api/v1`.
- Verify HTTPS, secure cookies, CSRF on refresh/logout, production JWT secret, trusted proxy behavior, database migrations and health/readiness.
- Run the full real-backend Playwright journey against the deployed preview: demo bootstrap → create/update CRM record → opportunity transition → internal automation task → CSV preview/dry-run/commit → duplicate merge → read-back → reset/expiry.
- Confirm that no user data, contacts or real customer exports appear anywhere in the demo database or screenshots.

## Existing verification evidence

- Frontend documentation distinguishes the real PostgreSQL-backed Playwright journey from fixture-only UI tests.
- The real backend E2E workflow starts PostgreSQL 18, installs/starts the FastAPI backend, applies migrations, builds the frontend and runs Playwright.
- The documented real-browser coverage includes signup/session refresh, companies/contacts CRUD and pagination, opportunities and pipeline transitions, activities/tasks, attention/planner, relationship graph/health, imports and read-back, saved views, data-quality duplicates/merges, and Won/Lost automation execution.
- Backend tests cover auth/session/CSRF, issuer/audience/expiry claims, password hashing, refresh rotation/revocation, org membership/tenant access, contact/company ownership, CSV validation and dry-run/atomic commit, merge behavior and automation idempotency/role restrictions.
- Historical screenshots and coverage documents are useful test-path evidence, not proof that a current deployed frontend/backend pair is healthy.

## Current status

**Source audit complete; isolated recruiter workspace, bounded CSV upload and public deployment verification pending.** The product has strong source-level and documented real-PostgreSQL E2E coverage. No anonymous isolated demo workspace exists in the inspected source, and no current deployment has been verified end to end. Keep demo status as verification-pending until the complete clean-browser journey and two-tenant isolation tests pass.
