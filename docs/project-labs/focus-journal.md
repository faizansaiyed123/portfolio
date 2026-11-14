# Focus Journal — source audit and recruiter demo design

Audit date: 14 November 2026

Repositories:
- Backend: https://github.com/faizansaiyed123/Focus-Journal-Backend
- Frontend: https://github.com/faizansaiyed123/Focus-Journal-Frontend

## Product understood from source

Focus Journal is a private personal journaling and focused-work application. Its core product loop is:
1. Start an intentional focus session and track its running/paused/completed/abandoned state.
2. Record one structured daily check-in per user-local calendar day.
3. Write longer free-form journal entries separately from check-ins.
4. Search and review real saved history, streaks, calendar activity and basic summaries.
5. Manage profile timezone and explicit consent for optional AI processing.

It is intentionally scoped. Its product-scope contract explicitly defers billing, reminders, push notifications, separate habit/gratitude/energy/distraction trackers, AI chat/coaching, automatic tagging, generated prose reviews, and a full task manager. The portfolio must not suggest those deferred features exist.

## Architecture verified in source

- Frontend: React 19, Vite, React Router, Zustand, Axios, Chart.js.
- Backend: Python 3.12, FastAPI, Pydantic, SQLAlchemy async sessions, asyncpg and PostgreSQL.
- JWT bearer authentication; optional Google/GitHub/LinkedIn OAuth.
- OAuth redirects use a high-entropy single-use code; only its SHA-256 digest is stored, the code expires after two minutes, and the backend atomically consumes it through `POST /auth/exchange`.
- Database migrations are executed on application startup under a PostgreSQL advisory lock.
- Focus-session elapsed time is calculated server-side; paused time is excluded.
- Date-based check-ins and summaries use the user's IANA timezone.
- Optional OpenAI-powered journal insights require explicit per-user consent. The insights endpoint returns 403 until consent is granted and fails closed when the provider is unavailable.

## Actual route and data boundaries

- Frontend routes `/dashboard`, `/journal`, journal detail/edit/create, analytics, settings, check-ins, and journal insights are protected by `ProtectedRoute`.
- Only the landing page, login, registration and OAuth callback are public.
- The Axios client attaches the bearer token from local storage. An expired/invalid token is cleared and visitors are redirected to login.
- Backend journal CRUD, daily check-ins, focus sessions, summaries, profile and insights require `get_current_user`.
- Journal CRUD is scoped to the authenticated user's ID. Tests verify that a second user cannot read another user's journal entry.
- Check-in queries are scoped by user ID and local calendar date.
- Focus-session listing/detail/transitions are scoped by user ID. The backend enforces one active focus session per user and valid lifecycle transitions.
- Tests verify a second user cannot read another user's focus session.
- The application does not ship with a public anonymous/guest data mode or seeded shared recruiter workspace.

A recruiter clicking the listed frontend URL is therefore not able to explore actual journal/dashboard data without registration and login. Removing the frontend route guard alone would not work: the backend private APIs would still return 401.

## Privacy is a first-class demo constraint

Journal content and daily reflections can contain highly personal writing. A public portfolio demo must not use real entries, check-ins, OAuth identities, or user records.

Recommended recruiter experience:
1. The product lab opens with a clear explanation of the demo and a separate "Enter sample workspace" action.
2. That action creates or resumes a unique short-lived demo identity for that visitor—never a common account shared with other visitors.
3. The demo workspace contains fictional journal entries, fictional check-ins, and synthetic focus-session history that are clearly labelled as example data.
4. Recruiters can create, edit, search and delete demo entries; create and update check-ins; and run the actual focus timer lifecycle against the real API/database.
5. They can inspect streaks, weekly/monthly aggregates and timezone behavior derived from that demo data.
6. AI processing consent is off by default. No demo journal content is sent to an external model unless the visitor is shown a clear, separate opt-in and the privacy implications are explained. Prefer disabling external AI in recruiter mode.
7. No real OAuth provider flow is required for a recruiter. Show provider login as an optional product integration, not as a mandatory demo path.
8. Demo identity and all associated data expire and are deleted safely.

## Demo implementation requirements

- Add a dedicated demo-session record with a random opaque identifier, user linkage, creation/expiry timestamps and a revocation state. Do not identify demo users using an unguessable email string alone.
- Create one customer-level user per browser session (or equivalently strong isolated namespace); never reuse one fixed public account.
- Set a short JWT lifetime for demo tokens and server-side demo-session expiry. Deleting/revoking the demo session must make the token unusable on subsequent API calls.
- Keep all journal, check-in, focus-session, profile and summary data scoped to that visitor's user ID. Add cross-session API tests for every private resource type.
- Seed only clearly synthetic entries/check-ins/session history. Use non-sensitive fictional content, fake names and non-real contact details.
- Ensure demo mode never sets AI consent implicitly. If AI is enabled at all, require explicit opt-in per temporary user; do not reuse external-provider credentials without quota limits.
- Keep OAuth disabled or clearly optional in the demo. Test the normal registration/login path separately from the no-signup recruiter path.
- Add cleanup for expired demo identities and dependent journal entries, check-ins, goals, focus sessions, OAuth records and profile data. Inspect foreign-key behavior and delete only records explicitly linked to demo sessions.
- Do not create an unbounded public user-registration endpoint solely for portfolio traffic. Add rate limits and abuse controls to demo-session creation.
- Test two simultaneous browsers and prove their entries, check-ins, sessions, summaries and settings cannot cross.
- Preserve timezone logic and test session behavior around local-day boundaries and daylight-saving changes.
- Verify the frontend and backend are deployed as a compatible pair, with correct `VITE_API_URL`, CORS origins, HTTPS, secure secrets, Postgres migrations, and health checks.

## Existing test evidence

The backend has pytest coverage for:
- Registration/login and compatibility with existing frontend field names.
- Google OAuth code exchange and replay rejection using a fake provider.
- Journal CRUD and cross-user access rejection.
- Focus-session lifecycle, invalid state transitions, one-active-session rules, listing/summary and cross-user access rejection.
- Elapsed-time calculation excluding paused periods.

Tests do not require live OAuth-provider or AI credentials. Their existence is useful source evidence, but it is not proof that a current public deployment passes its full journey.

## Current status

**Source audit complete; isolated demo identity and deployment pending.** Existing application data is deliberately private and all substantive dashboard routes require authentication. Do not make real journal content public or label the app demo-ready until per-visitor isolation, synthetic fixtures, AI-consent behavior, expiry/cleanup, and the full browser journey have been tested.
