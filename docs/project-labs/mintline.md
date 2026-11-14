# Mintline / Credit Management — audit and portfolio-scope decision

Audit date: 14 November 2026

Repositories:
- Frontend: https://github.com/faizansaiyed123/frontend-intern-credits
- Backend: https://github.com/faizansaiyed123/backend-intern-credits

## Source understanding

Mintline is a small credit-management product with:
- Account registration and password sign-in.
- Salted PBKDF2-HMAC-SHA256 password hashes.
- Opaque bearer sessions stored server-side as SHA-256 hashes, eight-hour expiry and revocation on logout.
- Account-specific credit-balance reads.
- Add, deduct and reset operations protected by a separate `CREDIT_ADMIN_API_KEY`.
- A separate `ADMIN_API_KEY` for guarded schema-migration history and a narrowly allowlisted CREATE INDEX operation.
- PostgreSQL persistence, positive-integer and non-negative/overflow protections, and an optional idempotent daily scheduler that adds five credits per account.
- React/Vite frontend, FastAPI backend and a runtime-only privileged key input held in component state.
- Full-stack Playwright integration evidence for read-after-write, concurrent additions, mutation authorization, account isolation, session revocation, schema-migration safety and daily scheduler idempotency.

## Verified implementation boundaries

- A normal signed-in user may read only their own balance; a different user's account is concealed with a 404 unless the trusted credit-operator key is also provided.
- Every add/deduct/reset endpoint requires both a bearer session and the dedicated global credit-operator API key. A user session alone cannot mutate credit.
- Schema administration uses a different global key and only accepts restricted index creation on allowlisted existing columns.
- The database stores only the current balance and last-updated timestamp; it does not contain a per-operation credit ledger.
- Sessions expire after eight hours, but password reset, email verification, legacy-account recovery and user self-deletion are explicitly not implemented.
- Daily +5 credit scheduling is optional and runs across every account when the scheduler app is used. A public demo must never point at an ordinary production scheduler/database.

## Critical live deployment finding

The frontend README and the October 25, 2026 visual walkthrough both say the production Vercel build falls back to `http://localhost:8000` because `VITE_API_BASE_URL` is not configured in the Vercel project. The public homepage loads, but the browser cannot reach a backend on the recruiter's own computer. The integration report is from a separate production-built frontend connected to FastAPI and an isolated PostgreSQL database in CI; it is not proof of working production API integration.

The portfolio must not label the current deployed frontend as a working live credit dashboard until the correct public HTTPS API origin is configured, CORS/CSP are updated, and the full deployed workflow is re-run.

## Portfolio-scope decision: excluded from personal projects

The backend repository's own README identifies the work as **“LawVriksh Backend Intern Assignment 2 — Credit Management API & Schema.”** The companion frontend README describes itself as the UI for that assignment backend.

Because this rebuild is restricted to independently built personal projects and must not mix internship/employer assignment work into the personal-project gallery, Mintline is excluded from:
- The public personal-project count and search/filter library.
- Featured project cards and project labs for recruiter demos.
- Claims that it is an independent personal product.

This audit is retained only as a scope/evidence note. Do not create a public recruiter demo for the assignment unless the owner later clarifies that it is independently owned personal work and explicitly asks to include it.

## Conclusion

**Audited and excluded from the personal-project gallery.** This is a source-verified internship assignment, not a project to market as personal work under the current scope.