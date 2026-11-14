# Flagship / Feature Flag Platform — source audit and recruiter demo design

Audit date: 14 November 2026

Repositories:
- Frontend: https://github.com/faizansaiyed123/feature-flag-platform-frontend
- Backend: https://github.com/faizansaiyed123/feature-flag-platform-backend

## Product understood from source

Flagship is a feature-flag management and evaluation platform. Teams create organizations, projects and environments, then define typed flags and configure their environment state. Each environment can have enablement/default values, targeting rules, reusable audience segments and deterministic percentage rollouts. The product includes an interactive simulator, server-side single/batch evaluation endpoints, environment-scoped SDK keys, team roles, and an audit history.

Verified core journeys:
1. Create an account and organization.
2. Create a project and environments such as Development, Staging and Production.
3. Create a typed flag (boolean, string, number or structured value) with a default.
4. Enable/configure that flag for one environment.
5. Create a reusable audience segment and targeting conditions.
6. Configure rule priority, conditions, segment membership and rollout percentage.
7. Simulate several synthetic user contexts and compare decisions.
8. Call the SDK evaluation endpoint using the environment's feature key.
9. Inspect flag version, matched rule/reason and audit history.
10. Manage organization membership and protected environment permissions.

## Architecture verified from source

- Frontend: Next.js 16 App Router, React 19 and TypeScript.
- Backend: FastAPI, SQLAlchemy async, PostgreSQL and Alembic.
- Cookie-based access and refresh authentication. Access/refresh cookies are HttpOnly; the refresh token is stored server-side and rotated/revoked.
- Organization membership and roles (OWNER, ADMIN, MEMBER, VIEWER).
- Project/environment and flag state are stored in PostgreSQL.
- Environment configuration has a protected-environment boundary.
- SDK keys are environment-scoped; raw key generation occurs at creation, and the backend stores a SHA-256 hash with a prefix rather than reusable plaintext.
- Audit events are recorded for organization/project/flag/segment/environment operations.
- The backend does not need Redis or a separate worker.

## Important findings from source inspection

### The app requires a signed-in workspace

- The frontend public routes are welcome, login and signup. The dashboard, flags, segments, simulator, team, API and audit pages require authenticated workspace access.
- New signup creates a user, organization and OWNER membership, creates a refresh session, and sets HttpOnly access/refresh cookies.
- Refresh sessions are rotated server-side and can be revoked at logout.
- No anonymous recruiter workspace or preconfigured public demo tenant exists in the inspected source.
- The E2E test demonstrates that signup immediately creates a working workspace, project and environment without an email-verification step. This makes a temporary demo identity technically simpler than products requiring mailbox verification, but public account creation still needs abuse limits.

### Cookie topology is important

- The frontend API client uses `credentials: "include"` and does not store JWTs in localStorage.
- The backend sets `HttpOnly`, `Secure` in production and configurable `SameSite` cookies.
- The README explicitly recommends a same-site frontend/backend deployment topology for browser-cookie authentication.
- If the frontend and API are deployed on unrelated cross-site domains, `SameSite=Lax` cookies will not behave like same-origin cookies for fetch requests. Correct CORS alone does not solve this.
- The recruiter demo must be deployed behind same-site domains or a carefully configured same-origin backend-for-frontend/proxy. Do not weaken cookie security merely to make a cross-origin demo work.

### Organization/project/environment access is enforced

- Project and organization routes verify membership before returning data.
- OWNER/ADMIN can change organization membership and protected environments.
- MEMBER can write in unprotected environments but cannot change organization membership or protected-environment state.
- VIEWER is read-only.
- The backend's project/environment access helpers verify membership in the organization that owns the resource.
- Feature flag state, rules and segments are checked against the corresponding project/environment before changes.
- Tests cover authentication cookie behavior and role authorization for flag mutations.

### SDK evaluation is a separate, intentionally credentialed path

- The evaluation endpoints do not use the browser's user session. They require an `X-Feature-Key` header.
- The backend hashes the supplied key, checks that it is active, and confirms it belongs to the requested environment key.
- The project and flags are then resolved from the environment; single and batch evaluation use the same targeting/evaluation function.
- SDK keys are scoped to one environment, with rotation/revocation support. The raw key should be treated as a credential, even if the evaluation endpoint is designed for application SDKs.
- The UI and E2E walkthrough show the SDK key on creation. A recruiter demo must never expose a production key; use a throwaway demo project and demo environment key only.

### Evaluation behavior is deterministic and testable

- Condition evaluation supports equals/not-equals, in/not-in, contains, starts/ends-with, exists and numeric comparisons.
- Nested attributes are supported.
- Targeting rules are evaluated by priority; all required rule conditions and referenced segments must match.
- Percentage rollout uses a SHA-256-derived bucket based on flag ID, rule ID and user ID, giving repeatable outcomes for a stable user identity.
- Evaluation reports the selected value, reason, matched rule ID and environment-state version.
- Unit tests cover conditions, nested attributes, disabled/default behavior, segment matching and stable deterministic rollout.
- This supports a high-value interactive demo using synthetic identities such as `user-001` and fictional attributes such as `plan=pro` and `country=IN`.

## Recruiter demo experience to build

1. Recruiter opens a public explanation of feature flags and the exact evaluation lifecycle.
2. "Enter demo workspace" creates a unique temporary user, organization, project and environment, then establishes the normal secure cookie session. No shared public account/password is used.
3. Preload one fictional project with Development, Staging and a protected Production environment; create sample flags and a reusable segment.
4. Let the recruiter edit a safe Development/Staging flag, create/edit targeting rules, and change rollout percentages.
5. The simulator shows deterministic decisions for fixed fictional user contexts. Repeating the same user/context must produce the same outcome until the flag/rule changes.
6. A separate developer panel calls the real evaluation API with the temporary environment's own SDK key. Show the exact request shape and response reason/version.
7. The audit view shows which changes were made in this demo workspace.
8. Production is visibly protected: the public demo may show its read-only configuration, but it must not permit arbitrary production-environment mutations.
9. Reset/expiry only removes the current temporary workspace and its generated SDK keys.

## Security and implementation gates

Before marking Flagship demo-ready:
- Add a short-lived demo-session record with random opaque identifier, user/org/project/environment linkage, expiry and revocation.
- Create one temporary organization per visitor. Never reuse a shared demo organization, and never expose a permanent account credential.
- Keep the same production cookie protections and same-site deployment topology. Do not store access/refresh tokens in localStorage.
- Limit demo bootstrap/signup by IP and session. Bound session duration and active demo tenant count.
- Provision a throwaway SDK key for the current demo environment only. Show it only inside that isolated demo session; store/hash it as the normal application does. Ensure reset revokes it.
- Use synthetic user IDs and attributes, never real customer IDs or personal user attributes.
- Keep the Production environment protected. Allow writes only in the demo Development/Staging environments, or require admin rights limited to the temporary workspace.
- Ensure organization, project, environment, flag, rule, segment, audit and SDK key queries/actions remain membership-scoped. Add cross-organization negative tests.
- Test SDK evaluation using a demo key and reject missing, revoked, wrong-environment and wrong-project keys.
- Add strict maximums for flags, rules, segments and simulation rows to prevent public resource abuse.
- Verify cookie behavior across the actual frontend/API hostnames (signup, refresh, expired session, logout and CSRF/origin handling).
- Cleanup expired demo users, refresh sessions, organizations, projects, environments, SDK keys, flags, rules, segments and audit rows. Use safe foreign-key ordering/ownership checks; never delete durable user organizations.
- Verify all tests and the exact deployed frontend+backend pair, including HTTPS, CORS, host validation, secure cookies, DB migrations and readiness.

## Existing verification evidence

Backend tests cover:
- Access/refresh cookie flags and refresh cookie path handling.
- Authentication and refresh-session behavior.
- Production configuration and allowed host/CORS validation.
- Feature evaluation rules and deterministic rollout.
- Flag authorization for organization roles.
- API routes, health and audit response validation.

Frontend E2E covers the real signup → project → environment → SDK key → segment → targeting rule → evaluation workflow and records visual walkthrough screenshots.

The existence of tests and screenshots is useful evidence, but does not by itself prove the currently listed live frontend URL is connected to a healthy backend or that public recruiter sessions are isolated.

## Current status

**Source audit complete; isolated demo workspace, same-site auth deployment, protected-environment gates and public verification pending.** The core evaluation engine is suitable for an interactive, truthful demo; do not expose existing production SDK keys or mutate permanent production workspaces.
