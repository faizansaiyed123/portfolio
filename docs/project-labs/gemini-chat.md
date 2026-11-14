# Gemini Chat Platform — source audit and recruiter demo design

Audit date: 14 November 2026

Repositories:
- Frontend: https://github.com/faizansaiyed123/gemini-frontend-clone
- Backend: https://github.com/faizansaiyed123/gemini-backend-clone

## Product understood from source

This is a saved-conversation AI chat application with:
- Mobile-number account creation and OTP sign-in/recovery screens.
- JWT-authenticated chatroom creation, search/history and conversation reload.
- PostgreSQL persistence for users, rooms and messages.
- Redis-backed asynchronous message queue and a polling worker.
- Basic/Pro subscription status and Stripe Checkout/subscription webhook.
- Account profile, password change, light/dark theme and responsive chat layout.

The user journey is:
1. Create an account with mobile number, name and password, or sign in using the one-time-code flow.
2. Create a chatroom or start one automatically from the first prompt.
3. Submit a message to the backend, persist it and enqueue AI processing.
4. Poll the chatroom history until the worker writes an assistant response.
5. Reopen the conversation later and retrieve persisted messages.
6. Check plan status and, where appropriate, follow the backend-provided Stripe Checkout URL.

## Critical provider identity: not Google Gemini

Despite the product/repository name, the backend README explicitly identifies the active model integration as **OpenAI GPT-3.5-turbo**, not Google's Gemini API.

The worker source confirms this is not merely README wording:
- It imports `OpenAI` from the OpenAI Python SDK.
- It instantiates `OpenAI(api_key=settings.OPENAI_API_KEY)`.
- It sends each prompt to `client.chat.completions.create(model="gpt-3.5-turbo", ...)`.
- The frontend does not call Google Gemini directly.

The portfolio should therefore describe the current implementation as an OpenAI-powered chat application with a Gemini-inspired interface. Do not claim that Gemini models are currently integrated. A future Gemini provider adapter is not present in the inspected runtime code and must not be presented as shipped.

## Architecture verified in source

- Frontend: React 18, TypeScript, Vite and a single large SPA application component.
- Backend: FastAPI, Python, SQLAlchemy and PostgreSQL.
- Schema/migration scripts are run by `execute_sql_files()` before app creation; the FastAPI startup hook starts a daemon worker thread.
- Redis is consumed through Upstash Redis REST APIs. A custom global Redis List queue uses `LPUSH` and `RPOP`.
- Password hashing uses bcrypt.
- Authentication is JWT bearer-token based; the frontend stores the token in `localStorage` and attaches it as an Authorization header.
- OpenAI API calls happen in the worker rather than in the browser.
- Basic plan is limited to five messages per day by a Redis counter; Pro is exempt according to the current README and code.
- Stripe Checkout creates a subscription checkout session, and a signed Stripe webhook handles `checkout.session.completed` to upgrade the referenced user to Pro.

## Important source findings and demo constraints

### OTP is a test implementation, not real phone verification

- `POST /auth/send-otp` looks up an existing user by mobile number and generates a six-digit code.
- The backend labels the operation `OTP sent (mocked)`; it does not deliver the code through an SMS provider.
- The raw OTP is written to application logs and returned in the API response. The UI surfaces it as a test code.
- Sign-in OTP expiry is five minutes, resend cooldown is 60 seconds, and verification stops after five incorrect attempts.
- Password recovery follows a similar mocked OTP flow and also returns/logs the code.
- The direct signup endpoint creates a user and returns a JWT immediately; it does not use an actual phone-verification delivery step.
- The auth endpoints do not show an IP-based rate limiter in the inspected routes. The resend cooldown and per-user attempt count are not a substitute for a public bootstrap/rate-limit boundary.

Do not describe this as real SMS OTP verification or allow it to be used as a production login mechanism in the public portfolio. A recruiter demo must use a distinct short-lived demo identity or an explicitly documented local test OTP environment, never send or log a visitor's real phone number/code.

### JWT/session handling

- The API returns bearer JWTs.
- The frontend saves them in browser localStorage under `gemini_token` and sends them on subsequent requests.
- The configured access-token expiry defaults to 60 minutes.
- No server-side session table, refresh-token rotation or token-revocation path was identified in the inspected implementation.
- The JWT settings do not have a production-only minimum-secret/placeholder guard in the inspected Settings class.
- The app configures CORS with `allow_origins=["*"]` and `allow_credentials=True`, which should be tightened to exact allowed frontend origins before a public deployment.

For a public demo, do not share a static bearer token. Use short-lived, per-visitor demo credentials or a backend bootstrap that issues a unique JWT and records its demo-session expiry/revocation server-side. Tighten CORS and production secret validation. Do not put a provider key or Stripe secret into frontend build variables.

### Chat history is user-scoped

- Chatrooms are created with the authenticated user ID.
- The list endpoint queries chatrooms by `user_id`; its Redis cache key also includes the user ID.
- Chatroom details verify both `chatroom_id` and `user_id` before loading associated messages.
- Sending a message verifies that the selected chatroom belongs to the authenticated user before it inserts the user message and pushes a queue item.
- Message content is limited to 2,000 characters and room title to 100 characters.
- Chatroom creation/history and message send endpoints require JWT authentication.

This is a useful baseline for private per-user conversations. The public demo still needs separate temporary users and automatic expiry; no public shared demo account should be used.

### Worker and queue behavior

- The worker is started as a daemon thread by the FastAPI startup hook, rather than being a separate, supervised service.
- All queued messages use one global Redis List key, `openai_chat_queue`. Items contain the chatroom ID, user ID, message ID and prompt content.
- The worker removes an item with `RPOP`, calls OpenAI, then inserts an assistant message into the given chatroom.
- The worker currently does not re-check that the chatroom still belongs to the user ID carried in the queue record before inserting the assistant message. The API checks ownership before enqueuing, but the worker should repeat the ownership check as a defence-in-depth measure.
- The queue helper logs the message body and does not check the HTTP status of the `LPUSH` response before logging success. The worker logs the dequeued payload and the full generated response.
- A worker/process crash after `RPOP` but before writing the assistant row can lose that job; the Redis List does not provide a leased/in-flight retry/ack lifecycle.
- The worker sends only the current prompt plus a fixed system instruction to GPT-3.5-turbo. It does not load prior conversation messages into the model request, so persisted chat history is not currently used as conversational context for generation.
- The fixed model call caps response length at 150 tokens.
- The frontend polls room detail every 1.8 seconds for up to 24 attempts (about 43 seconds) while waiting for a new assistant message.

These are real engineering constraints to surface in the project lab. Do not call the queue durable/retry-safe without a claim/ack/recovery mechanism, and do not say the model is context-aware across previous messages until context is actually passed to the provider.

### Privacy, logging and provider usage

- The worker sends the user's prompt to OpenAI's external API. Public demo prompts must be synthetic/non-sensitive and the interface should disclose the provider.
- The logging helper writes to stdout and a local CSV log file. OTPs, mobile numbers, complete queued message payloads, AI response text and other user content can appear in those logs.
- Production-style demo logging must redact OTPs, mobile numbers, tokens, prompt bodies, generated answers and payment-related metadata.
- OpenAI requests incur provider usage/cost and need a strict request/token/concurrency budget for an anonymous demo.

### Stripe is a sandbox-capable feature, not a reason to use real billing in a demo

- The subscription route creates a Stripe Checkout subscription session using configured `STRIPE_SECRET_KEY` and `STRIPE_PRICE_ID`.
- The webhook verifies the Stripe signature using `STRIPE_WEBHOOK_SECRET` and upgrades the user referenced by `client_reference_id` when `checkout.session.completed` arrives.
- The README describes Stripe sandbox checkout; the application itself uses whichever keys are configured. The source does not force test-mode credentials at runtime.
- The frontend redirects to the backend-provided checkout URL and reads subscription status after the return.
- The success/cancel URL is constructed from `FRONTEND_URL`; verify the configured path composition before enabling it (the source appends `/payment/success` and `/payment/cancel`).
- No public recruiter demo should initiate a real charge or subscription.

Keep all billing paths disabled in the recruiter demo or use a verified Stripe test-mode configuration and a dedicated test price/portal. Never expose secret keys or use live Stripe credentials for the portfolio.

### Deployment and verification evidence

The frontend README defaults to the old Render backend URL:
`https://gemini-backend-q94y.onrender.com`.

The frontend visual walkthrough explicitly states:
- The production Render API is currently suspended.
- Authenticated screenshots were captured against a separate local FastAPI backend, disposable PostgreSQL database and real Redis server.
- The user message and conversation history were persisted in that local test.
- A model-generated answer was **not** produced because the test environment had no valid OpenAI credential.

Therefore the existing frontend URL and screenshots do not prove a live public AI demo. The project must remain `verification-pending` until an actual backend/worker/Redis/database/provider stack is deployed and the full browser journey returns a genuine model response.

## Recruiter demo experience to build

1. Open a public explanation that correctly says the current model provider is OpenAI GPT-3.5-turbo; do not label it as a live Gemini integration.
2. Choose "Enter demo workspace". The backend creates a unique short-lived user/demo-session for that visitor; no shared demo account, manual registration, or real mobile number is required.
3. Enter the actual chat UI with an isolated seeded conversation history labelled as synthetic sample data.
4. Allow a small, bounded number of real OpenAI-powered prompts through the actual Redis queue/worker only when a funded, configured provider key is available. Display the provider, queued/processing/completed/failed status truthfully.
5. If the provider/worker is unavailable, show a clear unavailable state or a clearly labelled stored response replay; never say a replay is live model output.
6. Verify the user can create a room, send a prompt, receive a real queued response, navigate away, return and retrieve persisted messages.
7. Keep Basic plan limits and a tighter demo quota. Pro upgrade/billing controls should be disabled in public demo mode or use test-only Stripe Checkout with test credentials and a disposable user.
8. Use synthetic prompt content only. Redact logs; never record real visitors' prompt bodies or model responses in persistent demo logs.
9. Expire and clean up the demo user, auth/session material, chatrooms, chat messages, rate-limit keys and queued items. Expiry must also prevent a late worker from writing to an expired/deleted demo conversation.
10. Link directly to the actual frontend/backend repositories and relevant worker/auth/ownership implementation.

## Security and engineering gates

Before marking Gemini Chat Platform demo-ready:
- Add a dedicated DemoSession record with an opaque random identifier/hash, user ID, issued JWT/session metadata, expiry, revocation and creation/last-seen timestamps.
- Create one unique temporary user per visitor; never use a permanent shared demo email/mobile/password or a long-lived shared JWT.
- Ensure every demo API operation is scoped to the temporary user. Add two-session tests for room list, room detail, send message, subscription status and password/account operations.
- Add a server-side worker ownership check for `chatroom_id + user_id` before writing the generated response.
- Replace mocked OTP delivery for any real account flow with a secure external out-of-band provider. Do not return/log OTPs or accept a client-visible test code in production. Use per-IP/mobile rate limits and a consistent account-enumeration-safe response.
- Add production configuration validation for minimum JWT secret length, explicit CORS origins, HTTPS, trusted proxy behavior and required secrets.
- Redact all application logs: no OTP, mobile, full prompt content, raw JWT, queue body, full AI response or sensitive user profile data.
- Add a dedicated bounded OpenAI demo quota (per session, per IP, daily token/message caps, request timeout and concurrency cap). Clearly disclose provider and that prompt text is sent to that provider.
- Preserve server-side prompt length bounds and add output/token limits appropriate to budget.
- Harden the queue: validate Redis response status, record queue errors correctly, use claim/ack or lease/recovery semantics, add per-item expiry/idempotency, and re-check ownership/session expiry before persistence.
- Run the worker as an independently supervised service or ensure one controlled worker lifecycle per deployment; do not spawn an unbounded daemon thread per API replica.
- Decide and implement the intended chat-context behavior. If conversations are meant to be multi-turn, load the relevant persisted history with a bounded context window and test it; otherwise present each prompt as an independent question.
- Keep Stripe disabled in recruiter mode, or enforce test-only credentials and verify the full signed webhook/return flow against an isolated test account/price.
- Verify the temporary user, rooms, messages, Redis rate-limit counters, queued jobs and auth tokens all expire/revoke together. A worker must not resurrect or write to expired demo data.
- Verify the frontend and backend use the correct deployed origins, production API has a valid OpenAI provider key, Redis/PostgreSQL and the worker are healthy, and a clean-browser test receives a real model response.
- Run authenticated multi-session tests and inspect logs to confirm no other visitor's messages or secrets leak.

## Existing verification evidence

- Frontend visual walkthrough says the actual signup route was exercised against a local FastAPI backend, the token was stored, and the profile/room list loaded from PostgreSQL.
- The walkthrough says OTP login with the mocked code was exercised locally and saved conversation history was recovered in a fresh sign-in.
- The walkthrough explicitly says the production Render API is suspended and the local test did not generate an assistant answer because no valid OpenAI credential was configured.
- Backend CI currently installs Python dependencies; it does not run a substantive pytest suite in the inspected workflow.
- Frontend CI checks formatting and TypeScript/Vite production build; no browser E2E Playwright suite is present in the frontend tree.
- The visual walkthrough and Postman collection are useful route/flow evidence, not proof of a current public deployment, a working OpenAI provider key, a robust queue, or a generated response.

## Current status

**Source audit complete; real provider/worker deployment, OTP remediation, log redaction, queue hardening, per-visitor demo sessions and public verification pending.** The product has a persisted chat UI and an asynchronous OpenAI worker, but the inspected public backend is documented as suspended and the local visual E2E did not generate an AI answer. Do not label it live until a fresh browser session receives and persists a genuine response from the deployed worker.
