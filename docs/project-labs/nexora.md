# Nexora — source audit and recruiter demo design

Audit date: 14 November 2026

Repositories:
- Frontend: https://github.com/faizansaiyed123/Nexora-Frontend
- Backend: https://github.com/faizansaiyed123/Nexora-backend

## Product understood from source

Nexora is a multi-tenant B2B competitive price-intelligence workspace. An organization maintains its own catalogue of tracked offerings, competitor businesses, collection sources, and matches between an offering and a competitor URL. Collection jobs retrieve public pages, extract price/currency/availability/attributes, save observations and snapshots, and feed price/stock/source-health alerts. Website discovery can find product/source candidates and optionally use Gemini-assisted discovery.

The central workflow, also shown in the frontend walkthrough, is:
1. Create a workspace and verify the account email.
2. Add competitors and public collection sources.
3. Add internal offerings and optional dynamic fields.
4. Match an offering to a competitor listing URL.
5. Run a collection and inspect the resulting observation/snapshot and job record.
6. Collect later observations and inspect movement/alerts.
7. Review collection errors, source health/circuit state, and discovery history.

## Architecture verified from source

- Frontend: React + TypeScript + Vite, React Router, custom API client, static SPA build.
- Backend: FastAPI, async SQLAlchemy, PostgreSQL, Alembic.
- Redis and Celery for rate limits and durable background collection/notification work.
- HTTPX, BeautifulSoup/lxml and optional Playwright browser rendering.
- JWT access/refresh tokens, email verification, password recovery and role-aware access.
- Tenant/client ownership is represented throughout the domain models and enforced by API services.
- Roles include SUPER_ADMIN, ORG_ADMIN, ANALYST and VIEWER.
- Source configuration includes request/extraction settings, custom selectors, rendering options and health/circuit state.
- Job claiming uses a database lease/token so a worker can safely claim or reclaim work.

## Important findings from source inspection

### The current product requires a verified account

- The frontend landing page is public, but the dashboard and all workspace routes are protected.
- Registration creates a workspace and user, then reports whether email verification is required.
- The backend defaults to requiring email verification unless configured otherwise. SMTP values are empty by default in the example environment.
- Production verification bypass is rejected unless an additional explicit production override is enabled. That bypass should not be used to create a public demo login.
- Login returns access and refresh tokens; the frontend stores them in local storage and refreshes access tokens through a lock coordinated across tabs.
- There is no anonymous recruiter workspace or public seeded user in the inspected flow.

### Tenant isolation and roles are real parts of the product

- Authenticated access claims include both user ID and client/tenant ID.
- Database dependencies resolve the active user against both IDs.
- Role authorization is checked from persisted account state, with a short 5-second cache.
- Competitor, source, offering, match, discovery, collection and alert workflows pass the authenticated tenant ID into their services/queries.
- Competitor/source creation and configuration changes require admin roles; read access is available to reader roles; analyst functions are separated from admin configuration.
- The test walkthrough documents a separate isolated tenant and tests for owner/admin/analyst/viewer experiences.

A demo must create a new isolated tenant per recruiter session. Reusing one public owner account would cause data collision and would expose every visitor to another visitor's catalog, competitors, jobs and alerts.

### Collection is real outbound network activity and must be constrained

- The backend uses an explicit URL-security service before fetching a source.
- It only accepts HTTP(S), rejects embedded credentials and malformed/non-public target addresses, and blocks loopback, private, link-local and cloud metadata destinations.
- DNS resolution is checked; the HTTP transport pins the resolved address to reduce DNS-rebinding risk.
- Redirects are handled manually and each redirect hop is revalidated.
- Response bodies are capped, redirect count is bounded, and the worker uses per-source request rate limits.
- Optional Playwright rendering is an additional resource-intensive path.
- Sources track health and circuit state. The circuit breaker opens after five consecutive failures, waits through a cooldown, then moves to half-open before recovering after success.
- The test-only local fixture allowance is narrow and requires exact host/port/path matching. Production configuration explicitly rejects enabling that local-fixture bypass.

This security work is important: a recruiter demo must not become an arbitrary public URL fetch/proxy or an unrestricted browser automation service.

### Example data and price claims

- The frontend walkthrough explicitly states that its Northstar workspace, catalogue entries and prices are illustrative—not current retail quotes.
- The static screenshot/walkthrough demonstrates UI paths but does not prove that a live retailer currently exposes a reliable price endpoint.
- Price extraction can vary by website markup, currency, dynamic rendering, anti-bot challenge and source configuration. A collection may be failed, blocked, partial or unable to extract a trustworthy price.
- The portfolio must not show sample screenshot values as current market prices or say all target sites can be collected reliably.
- Every demo observation should show its source, extraction timestamp, currency, extraction status and whether it came from an owned fixture or a real public target. Uncertain/missing data must remain unavailable rather than fabricated.

### Frontend/backend deployment requirements

- The frontend is a static SPA and the prebuild script requires `VITE_API_URL` to be an absolute HTTPS URL in production; localhost/loopback is rejected.
- The API needs explicit CORS origins, PostgreSQL and Redis.
- Backend configuration rejects placeholder JWT secrets, production wildcard host configuration, and non-PostgreSQL production database URLs.
- Production local-fixture mode is explicitly forbidden.
- The backend README documents API health as checking both database and Redis.

## Recruiter demo experience to build

1. Open the public Nexora introduction with no account setup.
2. Select "Enter demo workspace". The bootstrap creates one short-lived isolated tenant and an ANALYST/ORG_ADMIN-equivalent demo role, scoped to that session only.
3. Enter a preloaded fictional market containing sample competitors, offerings, matched listings, source settings, prior observations, one successful job, a failed/extraction-unavailable job and a sample alert. Label all fixtures.
4. Let the recruiter edit catalog entries, inspect a competitor match, configure a safe source, run a real collection against a fixed portfolio-owned fixture URL, inspect job execution and resulting observations, and see alerts/source-health behavior.
5. Do not let public visitors submit arbitrary source URLs, use unrestricted discovery, trigger unrestricted Playwright, access arbitrary external targets, or configure notification destinations.
6. Provide an explicit reset for the current demo tenant only.
7. Show the real architecture and source/test links alongside each workflow.
8. Expire and clean up the tenant, demo user, competitors, sources, offerings, matches, jobs, observations, snapshots and alerts after a short inactivity window.

## Security and engineering gates

Before marking Nexora demo-ready:
- Add a dedicated demo-session record with random opaque ID, tenant/user linkage, expiry, revocation and safe cleanup.
- Create a unique tenant per recruiter session. Do not publish common user credentials or use a shared workspace.
- Keep all reads/mutations scoped to the session tenant. Test two concurrent tenants for cross-tenant denial on every major resource: competitor, source, offering, match, discovery job, collection job, observation, snapshot and alert.
- Keep demo roles least-privileged. No SUPER_ADMIN, user-management or destructive cross-tenant privileges.
- Allow collection only against an explicit backend-enforced allowlist of portfolio-owned fixture URLs. Frontend hiding is not an access-control boundary.
- Keep SSRF checks, DNS pinning, redirect-hop validation, response-size limits, rate limits and circuit-breaker behavior enabled. Never enable local fixture mode in production.
- Do not accept recruiter-supplied arbitrary target URLs or free-form webhook/email destinations.
- Cap collections per tenant, requests per source, total jobs, Playwright workers, job duration and output size. Add queue backpressure and session quotas.
- Avoid live Gemini calls unless explicitly configured with cost controls. Prefer deterministic fixture discovery for the recruiter journey.
- Capture email notifications in a demo-only outbox, not real recipients.
- Show collection provenance and truthful states for success, partial extraction, blocked, failed, challenge, timeout and missing price. Never turn a missing value into a healthy/zero price.
- Clean up only records explicitly linked to demo sessions; ensure no user-created production tenant data can be touched.
- Verify PostgreSQL + Redis + Celery worker + API + frontend together. Test real fixture collection, retries, job leases, worker restarts, circuit-open/half-open transitions and cleanup.
- Ensure the production VITE_API_URL points to the correct API and the Vercel build passes its HTTPS config gate.

## Existing verification evidence

- Backend integration tests use disposable PostgreSQL and Redis and exercise the real FastAPI routes and persisted records.
- URL-security tests verify private/loopback destinations are rejected, local fixture exceptions are narrowly allowlisted, and production rejects enabling local fixtures.
- Circuit-breaker tests cover opening after five consecutive failures, cooldown, half-open recovery and disabled sources.
- Frontend walkthrough includes registration, verification, catalog/source configuration, matches, collection jobs, alerts, tenant isolation, role-specific workspace and mobile layouts.
- Frontend has security tests for API configuration, refresh locking and rate-limit handling.

These tests and screenshots are strong implementation evidence, but they do not prove the current deployed Nexora API/worker is online or that an arbitrary live retailer is currently collectible.

## Current status

**Source audit complete; isolated recruiter tenant, fixture-only collection gate and public deployment verification pending.** Do not show the existing app URL as a verified public demo until account bootstrap, tenant isolation, safe collection, real worker execution, cleanup and the full browser path have passed.
