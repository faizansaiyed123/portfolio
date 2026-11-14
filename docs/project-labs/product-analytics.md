# Product Analytics — source audit and recruiter demo design

Audit date: 14 November 2026

Repositories:
- Frontend: https://github.com/faizansaiyed123/product_analytics_frontend
- Backend: https://github.com/faizansaiyed123/product_analytics_backend

## Product understood from source

Product Analytics is a self-hosted product analytics platform. Applications send event data to a project-scoped ingestion API; the backend validates and stores events, resolves anonymous/identified user identities, and turns the persisted event stream into analytics queries and operational workflows.

Verified user journeys:
1. Register/login and create an organization.
2. Create a project and receive a project-scoped SDK API key, displayed once.
3. Send single or batched events using the project key.
4. Explore event definitions, event properties, identified/anonymous people and event timelines.
5. Query trends, funnels, retention, sessions and paths.
6. Define and preview cohorts, save reports and arrange dashboards.
7. Configure alerts, inspect notifications, manage project/team settings and rotate/revoke API keys.
8. Export events, people and analytics; large exports can run as background jobs.
9. Configure retention and delete project events/people or delete a project.

This is a real ingestion/analytics backend, not a chart-only frontend. The E2E tests send test events through the public ingestion endpoint and read persisted totals back through the dashboard query API.

## Architecture verified from source

- Frontend: React + TypeScript + Vite, React Router, TanStack Query, Zustand and Recharts; checked-in JavaScript SDK builds are served from `/sdk/`.
- Backend: FastAPI, Python 3.12, SQLAlchemy asyncio, PostgreSQL and Alembic.
- Redis supports ingestion/API-key caching, shared rate limits and analytics result caching.
- Background workers handle exports, alert evaluation, cohort refresh, retention, usage aggregation, cleanup and project data purging.
- Dashboard authentication uses an HttpOnly session cookie plus CSRF token on unsafe methods; session records are stored server-side and checked for revocation/expiry.
- Passwords use Argon2. Stored project API keys use HMAC-SHA256 hashing with an independent `API_KEY_SECRET`.
- Organization/project membership is enforced on every dashboard API. Roles are owner, admin, member and viewer.
- The ingestion API is separate from dashboard session authentication and is authenticated by a project key.
- Typed query schemas and PostgreSQL query implementations support trends, funnels, retention, sessions and paths.

## Important findings from source inspection

### Dashboard identity and tenant boundaries

- Registration creates a user and either accepts/joins an invitation or creates an organization with OWNER membership.
- The registration flow sends an email-verification message and the user profile exposes an email-verified state. SMTP is optional in development; the mailer records an outbox entry/log when SMTP is absent. E2E signup can continue into project creation and the dashboard, so the verification notice is not a blocking browser step in the tested flow.
- Dashboard session cookies are named `pa_session` and `pa_csrf`; unsafe methods require the CSRF token derived from the current session. Tokens are checked against server-side AuthSession rows, expiry, revocation and active-user state.
- Projects belong to organizations. Every dashboard analytics, events/people, saved object, export, API-key and project-management operation checks membership in the organization that owns the project. Non-members receive a not-found response instead of learning that the project exists.
- Roles are enforced on the server: viewer can read analytics; member can create/edit reports/dashboards/cohorts/alerts and export; admin can change project settings/API keys/team/data management; owner can delete the organization.
- No anonymous recruiter project is built into the ordinary app. A separate temporary org/user/project is the correct demo boundary.

### Project API keys and ingestion

- A project API key is generated at project creation or from project settings. The raw key is returned once; only its HMAC-SHA256 hash and prefix are stored.
- Keys are project-scoped, can be listed by prefix/metadata, revoked and rotated; raw secrets are not readable again.
- Ingestion supports a single-event endpoint and a batch endpoint. The key can be sent using the documented Authorization Bearer or X-API-Key header. Avoid putting it in URLs/query strings or shipping it to the general portfolio frontend.
- The ingestion service authenticates the key, checks project status, applies a project-specific request rate limit and validates each event.
- The request body cap defaults to 2 MB; batch size defaults to 500 events; event name length, property count and property value bytes are bounded. The default project ingestion rate limit is 100 requests/second and is configurable.
- Event validation handles timestamps, distinct IDs/anonymous IDs, contexts, property depth and size, retention boundaries and duplicate identifiers.
- A client-provided UUID/insert_id/event_id supports idempotency. Duplicate events are distinguished from accepted/rejected events in the response.
- Identity resolution is project-scoped. A distinct_id maps to one person per project; `$identify`/`$alias` can merge an anonymous identity into an identified user, while two identified people are not merged.

For the demo, the public SDK key can be exposed only for a temporary project created for that visitor. It must be rate-limited, short-lived, revoked on reset/expiry, and never point at a durable project containing other visitors' data.

### Data minimization and retention

Project settings currently default to:
- IP mode: `anonymize`.
- Property denylist: password, passwd, secret, token, credit_card, card_number, cvv and ssn.
- Request rate: 100 requests/second.
- Retention: `null`, which explicitly means keep forever.

IP mode supports `store`, `anonymize` and `discard`; anonymize is the default. The property denylist covers common secret names but cannot detect every sensitive value. Do not send real customer data, email addresses, credentials, payment details or personal identifiers in demo events; use synthetic IDs and non-sensitive properties only.

The worker applies a configured project retention window by deleting old events in bounded batches and removing person records once no events remain. Because null retention means forever, every temporary demo project must be configured with a short explicit retention period (for example 7 days) and an explicit demo expiry/purge job.

### Deletion and exports

- The project settings UI can set retention, stream event/user exports in CSV/JSON, queue large exports, and schedule deletion of all events and people while keeping project settings, dashboards and reports.
- Owner deletion of a project soft-deletes it immediately, invalidates its API-key cache, and queues `purge_project_data` in Redis.
- The worker processes project purge by deleting events in small transactions, deleting person records, event/property definitions and usage counters, then hard-deleting the soft-deleted Project. Project API keys and project-owned data are removed through project deletion/cascades.
- Purge is asynchronous; the UI's “scheduled” state is not proof that all records are already gone. A demo must show deletion status accurately and verify the worker completed the purge.
- Export endpoints stream sensitive event/person rows. Project membership and role checks are applied, but public demo exports should be limited to the visitor's own synthetic project and bounded in volume.

### Query and worker resource limits

- Query date ranges are bounded by `MAX_QUERY_RANGE_DAYS` (default 800 days).
- PostgreSQL query statement timeout defaults to 30 seconds.
- Export jobs have a configured temporary output directory and expiry; background workers process them.
- Alert evaluation, cohort refresh, usage aggregation and cleanup are worker tasks. A working dashboard requires the worker and Redis as well as the API and database.
- The public demo should use narrower query ranges, strict event quotas and export caps; a public SDK key must not enable unbounded ingestion or expensive queries.

### Current seeded data is not a safe public identity

- The backend's seed script is explicitly a development seed. It can create a demo account only when `DEMO_EMAIL` and `DEMO_PASSWORD` are set; those credentials are not hard-coded.
- The script creates/reuses a named Demo Org and Demo Web App project, then sends realistic synthetic events through the real ingestion service.
- The frontend walkthrough screenshots and backend seed are useful evidence, but a single seeded demo account/project must not become the public recruiter workspace. Multiple visitors would share the same people, events, dashboards and API key.
- The E2E browser test creates a fresh registration, organization and project, obtains a temporary API key, ingests a small explicit event set, then checks persisted analytics. API keys are redacted from screenshots.

## Recruiter demo experience to build

1. Open a public product explanation with a small, clearly synthetic event dataset.
2. Choose "Enter demo workspace". The backend creates a short-lived user, organization and project specifically for this visitor, then establishes the normal session and CSRF cookies.
3. Generate a project SDK key for that temporary project and reveal it only once inside that visitor's demo session. The portfolio should not store or display it outside the demo.
4. Show a small code snippet using a synthetic `distinct_id` and event names, and let the recruiter ingest a limited event batch through the real ingestion endpoint.
5. Use the real event stream to power Overview, Trends, Funnels, Retention, Paths, Sessions, People and Events. Provide pre-seeded synthetic history if a visual journey needs a longer date window, but label it as seeded sample data.
6. Let the recruiter create a cohort, report, dashboard and alert against the temporary project's events.
7. Let them inspect usage and a bounded export of synthetic events/people.
8. Show project API key rotation/revocation and the effect on ingestion. The old key must stop working after its cache invalidation window.
9. Let the recruiter reset the current project; show a deletion-in-progress state until the purge worker confirms completion.
10. Expire the visitor's demo session and project, revoke all keys, then purge the event/person/export data.

## Security and implementation gates

Before marking Product Analytics demo-ready:
- Add a DemoSession record with random opaque token hash, user/org/project linkage, creation/last-seen/expiry/revocation fields and a durable demo marker. Do not identify demo users only with an email prefix.
- Create a unique organization and project per visitor. Never reuse the seeded Demo Org, a shared demo account, or a common project/API key.
- Use the existing normal cookie session and CSRF protections. Preserve HttpOnly, Secure production cookies; do not move session tokens into localStorage or expose JWTs to the browser.
- Keep dashboard endpoints membership-scoped and use the regular role model. The temporary workspace should have minimum roles needed for the tour; avoid granting a public user access to other organizations.
- Give the temporary project a separate SDK key; reveal it once and store only the normal HMAC hash. Rotate/revoke keys at reset and session expiry. Never place an API key in a URL or static frontend source.
- Apply strict demo project quotas: low events/second, modest maximum batch size, total event/person count, short query range, bounded concurrent exports, and rate-limited demo-session creation.
- Configure the project retention explicitly (e.g. 7 days); null/default forever retention is not acceptable for an ephemeral workspace.
- Use synthetic distinct IDs, anonymous IDs, event properties and user profiles. Do not ingest real portfolio visitor activity, personal data, production app data or real user emails.
- Keep IP mode at `anonymize` or more restrictive and preserve property-denylist defaults; add demo-specific sensitive-property filters and test them. Do not treat the existing denylist as comprehensive PII detection.
- Limit the ingestion API key to the demo project. Test that a key from one demo project cannot ingest/read another project's data, and verify revoked keys are rejected.
- Disable unrestricted webhook/notification or SMTP side effects for recruiter sessions. Use fake alert delivery or capture only; never notify real users.
- Limit analytics query dates and SQL timeout for the demo. Disable massive exports or cap rows/bytes; ensure background export jobs are owner/project-scoped and auto-expire.
- Reset/expiry must revoke keys, delete exports, purge events/persons/definitions/usage and remove the project only after the worker confirms completion. Clean AuthSession, AuthToken, User and Organization records with safe FK ordering; never delete durable user projects.
- Add multi-session tests proving two simultaneous visitors cannot see or alter each other's org, project, events, people, reports, dashboards, cohorts, alerts, exports, API keys or usage.
- Verify PostgreSQL, Redis, API and all worker tasks are online together. Test the public Vercel frontend proxy, CSRF cookie, project SDK key and clean-browser end-to-end journey before calling the demo live.

## Existing verification evidence

- Backend test modules cover auth, org/project permissions, event ingestion, API-key validation/rate limiting, trends, funnels, retention, sessions and database-backed analytics.
- The backend CI workflow runs tests against PostgreSQL and Redis with migrations applied.
- Frontend Playwright creates a fresh account/workspace/project, captures and redacts the one-time API key, ingests four synthetic events through the actual FastAPI ingestion service, refreshes KPIs from persisted data, and exercises saved reports, cohorts and dashboards.
- The visual walkthrough includes login/register, overview, trends, funnels, retention, paths, cohorts, events, users, sessions, dashboards, reports, project settings, API keys, team, alerts, data management, security, key rotation and erasure screenshots.
- The seed script explicitly pushes generated synthetic events through the same real ingestion code path; this is stronger evidence than a frontend-only data fixture.
- Tests and screenshots do not prove that the listed Vercel frontend is connected to a current healthy backend, PostgreSQL, Redis and worker deployment.

## Current status

**Source audit complete; isolated demo project, short retention/purge verification and public API/worker deployment pending.** The existing product has a real SDK ingestion pipeline and broad analytics surface. Do not expose the seeded demo account/project or any permanent API key to the public portfolio.
