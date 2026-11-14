# Telemetry — project audit and demo design

Audit date: 14 November 2026  
Repositories:
- Frontend: https://github.com/faizansaiyed123/telemetry-frontend
- Backend: https://github.com/faizansaiyed123/telemetry-backend

## Product understood from source

Telemetry is a realtime observability product, not simply a dashboard. It has one unified telemetry processing pipeline for synthetic events and real host-agent events. The same pipeline drives realtime charts, anomaly detection, configurable alert rules, incident correlation, database persistence, WebSocket broadcasts, SLO/error-budget views, synthetic checks, topology, operations metrics, and notification delivery.

Observed stack:
- React + TypeScript + Vite frontend.
- FastAPI backend, Python 3.12+, SQLAlchemy and PostgreSQL.
- A `TelemetryManager` coordinating generation, ingestion, anomaly and rule evaluation, alerts, incidents, and WebSocket broadcasting.
- Synthetic generator and optional psutil-based real host agent.
- Optional PostgreSQL-backed event fan-out; the README explicitly describes the existing runtime as single-process.
- Background persistence/notification/retention services.
- Unit and integration tests for auth, telemetry, simulation, alerting, topology, notifications, WebSockets, rate limiting, security, and storage.

## Important findings from source inspection

### Authentication currently prevents immediate recruiter access

- Frontend `ProtectedApp` redirects every `/app` route to `/login` if there is no token in local storage.
- Tokens and the current user are stored in local storage.
- Signup creates a user with the `viewer` role, then stores the bearer token.
- The telemetry API, simulation status, history, analytics, hosts, incidents, and related routes require authentication.
- A public visitor cannot use the control center without signing up.

### Default viewer accounts cannot operate the simulation

- Reading simulation state requires authentication.
- Starting, pausing, resuming, resetting, changing the generation rate, and triggering anomalies require an `admin` or `operator` role.
- New signups are `viewer` by default.
- The dashboard hides simulation controls from viewers.

A guest-session design must deliberately grant only safe demo capabilities. Elevating every public visitor to the real global operator role is unsafe.

### Critical isolation issue: current runtime and data model are single-workspace

Source inspection found:
- `app.main.lifespan` creates one `TelemetryManager` at `app.state.telemetry_manager`.
- The manager describes itself as a single-process runtime coordinator and owns process-level history, generator state, current-by-host state, active alerts, and one persistence host ID.
- The `Host` model has a globally unique name but no owner/user/tenant field.
- `TelemetryRecord`, `AlertRecord`, and `Incident` are associated with host/service IDs, not a recruiter/session owner.
- The WebSocket endpoint registers every authenticated socket with the same manager's WebSocket manager.
- The simulation reset operates on that manager's global state and persisted host records.

Therefore, simply making the current signup flow automatic and granting operator access would let one visitor's controls affect the shared simulation and could expose shared workspace records to other visitors. This does not meet the requirement for isolated recruiter sessions.

### The project already contains real synthetic telemetry

The backend's synthetic generator is not a frontend mock. Its output passes through the same `TelemetryManager.process_event()` pipeline as host-agent events, so anomaly detection, alert rules, incident correlation, persistence, and WebSocket publication use the real processing path. The dashboard explicitly labels events as `SIMULATED DATA` when the event source is synthetic.

This is an excellent foundation for a real synthetic-data product demo, provided it is isolated per recruiter.

### Deployment constraints

- The README documents process-local state and calls out the single-process scaling boundary.
- The optional PostgreSQL event bus supports cross-worker fan-out but does not by itself prove the generator, in-memory history, anomaly detector, rules, and alert state are safely distributed.
- The frontend API client defaults to localhost when `VITE_API_BASE_URL` is not configured. A deployed frontend needs an explicit API URL and matching CORS configuration.
- WebSocket authentication uses short-lived one-time tokens, which must continue to be used for the demo.

## Recruiter experience to build

1. Recruiter opens the Telemetry lab without signing up or entering credentials.
2. A short-lived demo session is created and bound to that visitor.
3. They enter the real React application with synthetic-only source mode.
4. They see a real stream, charts, host state, alert rules, history, incidents, SLOs, synthetic checks, and topology backed by the real API/database/manager.
5. Safe controls allow them to pause/resume their own stream, change its bounded rate, trigger a predefined anomaly, observe the rule/alert/incident lifecycle, and reset only their own demo workspace.
6. They can inspect the actual frontend/backend repositories and relevant tests.
7. The session and its records expire and are cleaned up automatically.

## Security and engineering design gates

Before calling Telemetry demo-ready:
- Add a dedicated guest demo-session bootstrap with short expiry, session quotas, IP rate limits, and anti-abuse controls. Do not create unrestricted public signup or grant access to the real global operator account.
- Give each demo session its own host identity, synthetic stream, manager state, alert/incident context, and WebSocket channel.
- Scope every list/detail/mutation API to the session's host/workspace. Add explicit ownership checks; don't rely on opaque IDs.
- Ensure reset, alert acknowledgement, rule updates, service changes, synthetic-check changes, and stream controls affect only that session.
- Restrict demo capabilities to safe synthetic workflows. Disable real host-agent enrollment, arbitrary outbound webhook targets, email notifications, external synthetic check targets, and admin/operations actions unless safely sandboxed.
- Add TTL cleanup for demo sessions, users, hosts, telemetry records, alert records, incidents, SLOs, synthetic checks, and any session-owned data.
- Test two simultaneous recruiter sessions and prove they cannot see or mutate each other's telemetry, alerts, incidents, host records, settings, or WebSocket messages.
- Test reconnects and short-lived WebSocket-token renewal.
- Verify that the demo runs within resource limits and the frontend/API/WebSocket/CORS combination works in a clean browser.

## Current status

**Audit complete; isolation redesign and deployment pending.** The frontend's existing public URL is listed in the portfolio inventory, but no complete, anonymous, isolated backend demo has been verified. Do not mark the product live until two-session isolation and full demo workflows pass.
