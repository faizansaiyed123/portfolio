# Orbit Campaigns — source audit and recruiter demo design

Audit date: 14 November 2026

Repositories:
- Frontend: https://github.com/faizansaiyed123/marketing-campaign-management-frontend
- Backend: https://github.com/faizansaiyed123/marketing-campaign-management-backend

## Product understood from source

Orbit Campaigns is a focused campaign-management product for audiences, contacts, reusable email templates, campaign authoring/scheduling, delivery execution, unsubscribe preferences, tracking and persisted analytics.

The verified core journey is:
1. Register a workspace user and sign in.
2. Create an audience and add contacts.
3. Manage a contact's subscription preference.
4. Create and reuse an email template.
5. Draft a campaign with its audience, subject and HTML message body; use personalization fields such as `{{first_name}}` and `{{full_name}}`.
6. Save the draft or schedule it for a future time.
7. Execute or allow the scheduler to queue the campaign.
8. The worker creates durable recipient delivery records, sends messages through SMTP, and records sent/failed/skipped state.
9. Retry failed/partial campaigns without resending recipients already sent successfully.
10. Track opens/clicks and show campaign reports from stored delivery and tracking-event records.

This is a real email-delivery application. It is not merely an email design tool or an analytics mock.

## Architecture verified from source

- Frontend: React 19 + Vite, single-page app, Nginx static serving for production.
- Backend: FastAPI, Python, SQLAlchemy 2, PostgreSQL and Alembic.
- Redis supports shared, atomic authentication rate limits across backend replicas.
- The existing database-backed scheduler/worker checks for due campaigns every 15 seconds. Celery/RabbitMQ/Kafka are not required.
- Auth uses Argon2id password hashing and an HttpOnly JWT session cookie. Cookie settings include SameSite=Strict; production uses Secure and the `__Host-` cookie prefix.
- The frontend calls the backend with `credentials: include`. Its Vercel serverless API proxy forwards cookies and Set-Cookie headers so browser traffic can remain on the frontend origin.
- Production frontend can use a server-side `BACKEND_API_URL` proxy; the normal Vite production build path uses `VITE_API_URL` and requires HTTPS.
- Backend production configuration requires PostgreSQL, a strong JWT secret, Secure/host-prefixed cookies, exact HTTPS frontend/public origins, Redis-backed auth protection, and valid SMTP configuration.

## Important findings from source inspection

### Audience, campaign and template records are owner-scoped

- Each user owns their audiences, campaigns and templates.
- Contacts belong to an audience; the campaign routes verify that the selected audience is owned by the signed-in user.
- Campaign list/detail/report/edit/execute queries are scoped to the campaign owner.
- Audience, contact subscription and template routes also check the owner ID before returning or changing records.
- Analytics queries join through campaigns owned by the current user.
- There is no shared multi-tenant workspace or public guest mode in the inspected source. A unique temporary user per visitor is therefore the correct isolation unit.

### Campaign execution sends real email

- Executing a draft creates a durable CampaignRun and one Delivery record per currently subscribed contact.
- The worker queues due campaigns and processes queued runs when SMTP is configured.
- SMTP uses the actual configured provider host, TLS/SSL settings and credentials. Messages are delivered to `Contact.email`.
- Outside development/test, the backend rejects missing SMTP configuration and rejects placeholder SMTP host/sender values. Production will not silently accept campaigns it cannot send.
- If SMTP is not configured in development, the worker leaves queued work pending; the app is not a true delivery environment in that mode.
- Therefore, enabling a normal production SMTP account for public recruiter traffic is unsafe: a visitor could create arbitrary contacts and campaign content and trigger real external emails.

### Recipient safety and retry semantics

- Initial queueing excludes contacts whose `unsubscribed_at` is set.
- Immediately before each send, the worker locks and reloads the Contact; it marks the delivery skipped when the contact is missing or has unsubscribed since queueing.
- Campaign templates/personalization are rendered against the recipient contact; subject and body snapshots are stored on the CampaignRun so the content associated with a run remains stable.
- A failed/partial retry selects only deliveries that failed in the previous run, and still excludes contacts who have since unsubscribed. Already-sent recipients are not sent a second time.
- Delivery states are persisted and reports are aggregated from PostgreSQL rather than fabricated in the browser.
- These retry and subscription checks are core product behavior and should remain part of the demo.

### Tracking and unsubscribe behavior are implemented

- Each Delivery gets a unique tracking token.
- Open tracking records a real 1x1 GIF event.
- Click tracking accepts HTTP(S) destinations only and checks that the destination exists in the personalized message body before redirecting, rather than becoming an unrestricted open redirect.
- Email content includes an unsubscribe link; the backend also supports one-click unsubscribe and a confirmation page.
- Opens/clicks are persisted as CampaignEvents and report aggregates are calculated from the stored delivery/event records.
- These are genuine tracking endpoints, but public demo emails must remain in a non-relaying capture inbox. Tracking pixels/click links should be labelled as test events, not real customer engagement.

### Frontend is not a fake local demo

- The UI's API helper calls the actual backend; it does not populate the workspace from hard-coded local sample records.
- The `DEMO_MODE` constant in the frontend is restricted to local development and does not bypass auth or create a production demo account.
- In production, the Vercel proxy requires `BACKEND_API_URL`; if it is missing the API returns a clear 503. The README says the frontend homepage can load but registration/login cannot succeed until the backend is deployed and configured.
- The production backend and frontend need compatible HTTPS origins. Because the cookie is SameSite=Strict, unrelated provider domains are not a safe/working browser-cookie topology. The same-origin Vercel proxy is intended to keep cookies on the frontend site.

### Cleanup requires explicit foreign-key ordering

- A user owns campaigns, audiences and templates; those have child campaign runs, contacts and delivery/event records.
- The Contact-to-Delivery foreign key uses RESTRICT, so deleting an audience/contact before its campaign delivery history will fail or leave dependent rows.
- Expired demo cleanup should explicitly delete event/delivery/run history before campaigns and contacts/audiences, then templates and the temporary user. It must be scoped through a DemoSession linkage, not a guessed email prefix.

## Recruiter demo experience to build

1. Open the product explanation and see the workflow without needing a login.
2. Select "Enter demo workspace". The backend creates a temporary user and DemoSession, then uses the normal HttpOnly session cookie. No shared credentials or ordinary manual registration form.
3. Seed a unique demo audience with fictional contacts and example-domain addresses, a reusable template, and one draft campaign.
4. Let the recruiter edit the template/campaign, inspect personalization, and create/schedule a campaign in the current demo workspace.
5. Show the real worker queue and durable recipient delivery states in one of two safe modes:
   - Preferred: deliver only to a private, non-relaying SMTP capture service (for example, Mailpit on an isolated private network), with all recruiter-created demo contacts restricted to synthetic addresses. The captured message is visible in an in-app demo outbox; the capture service has no outbound relay or public SMTP port.
   - Alternative: disable sending and show the genuine queued state plus a rendered email preview. Clearly say no email was sent; do not label it as delivered.
6. Demonstrate unsubscribe, then show that the worker skips that contact on the next run.
7. Demonstrate a failed/partial run using a controlled test recipient/provider response, then retry and prove that already-sent recipients are not resent and only eligible failed recipients are retried.
8. Show tracking events only from messages captured inside this demo workspace. Label them as test opens/clicks.
9. Reset/expire the demo workspace and remove all associated audience, contact, campaign, template, run, delivery, event and session records.

## Security and implementation gates

Before marking Orbit Campaigns demo-ready:
- Add a DemoSession table with a cryptographically random opaque ID/token hash, explicit temporary user ID, created/last-seen/expiry/revocation timestamps and demo marker. Never classify demo users only by email prefix.
- Add a rate-limited demo bootstrap that creates a unique temporary user and synthetic audience/workspace data in a transaction. Do not reuse the fixed local test user or expose a shared email/password.
- Use the same session-cookie protection as the regular app. Keep HttpOnly, Secure, SameSite=Strict and `__Host-` cookie requirements for production; do not weaken the cookie policy to make unrelated cross-site domains work.
- Keep every audience, contact, template, campaign, report and analytics query owner-scoped. Add two-session tests proving one visitor cannot view or mutate another visitor's records.
- In demo mode, accept only synthetic addresses from a controlled namespace and safe fictional contact fields. Do not allow visitors to import real subscriber lists or arbitrary recipient addresses.
- Configure a private non-relaying SMTP capture service or a preview-only delivery transport. Do not point the public demo to a real mail provider. Verify the capture service has no outbound relay, no public SMTP listener and no route to external SMTP hosts.
- If using SMTP capture, expose only a private inbox UI or a session-scoped internal outbox; do not expose the mail-capture management API publicly.
- Preserve the worker's atomic campaign claim, delivery locks, subscription recheck, failed-only retry and campaign-content snapshots.
- Cap contacts per audience, campaign count, recipient count per run, message HTML size, schedule horizon and worker jobs per demo session.
- Keep unsubscribe semantics. Test that a visitor who unsubscribes is never included in subsequent campaign runs or retries.
- Keep tracking tokens unpredictable and scoped to one delivery. Retain the existing click-destination allowlist validation; rate-limit event writes and do not expose aggregate data across owners.
- Add cleanup with explicit order: CampaignEvents → Deliveries → CampaignRuns → Campaigns → Contacts → Audiences → Templates → DemoSession/User, adjusted to the actual FK cascade rules. Verify it cannot touch a durable user's data.
- Do not mark messages as sent merely because a campaign was queued or a message was accepted by the capture service. Use precise states such as `queued`, `captured`, `sent`, `failed`, and `skipped` only when supported by the actual delivery transport and source.
- Verify the Vercel `BACKEND_API_URL` proxy, cookie forwarding, HTTPS origins and the exact backend deployment. A static Vercel homepage alone does not prove campaign API access works.
- Run the full real-backend E2E journey in a clean browser: demo bootstrap → audience/contact → template → campaign draft → safe queue/capture → report → unsubscribe skip → failed-only retry → expiry cleanup.

## Existing verification evidence

- Backend tests exercise signup/login, campaign creation/execution, worker processing, tracking open/click, unsubscribe, and exclusion of unsubscribed contacts.
- Worker tests use the test database; the main campaign workflow exercises durable queued/delivery records and aggregate analytics.
- Frontend Playwright E2E exercises registration, audience and contact creation, subscribe/unsubscribe, campaign drafting/execution and analytics against the real API.
- The visual walkthrough explicitly says its screenshots document the workspace workflow and do not claim that real emails were sent.
- The public frontend README says production login and campaign API calls depend on a configured backend proxy and compatible cookie origins.
- These tests and screenshots are useful implementation evidence; they are not proof that the currently listed frontend URL is connected to a healthy production backend or a safe SMTP capture service.

## Current status

**Source audit complete; per-visitor demo user, non-relaying email capture, delivery-state labelling and public deployment verification pending.** The current product is capable of real SMTP sends, so do not expose ordinary campaign execution to public recruiter sessions until the sink-only delivery boundary is enforced and verified.
