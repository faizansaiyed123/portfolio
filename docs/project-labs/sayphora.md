# Sayphora — project audit and recruiter-demo design

Audit date: 14 November 2026
Repository: https://github.com/faizansaiyed123/Sayphora
Type: Combined React storefront + Express API + PostgreSQL application

## Product understood from source

Sayphora is a full-stack beauty and skincare commerce application. The repository contains the customer storefront, Express API, PostgreSQL migrations, deterministic seed catalogue, commerce services, AI-assisted beauty tools, staff/admin console, PWA support, and Playwright/API tests.

The application is not merely a static storefront:
- Product listing, filtering, sorting, product detail, shades, samples, comparison, reviews, and boutique finder.
- Customer registration/login, profile and beauty profile, addresses, wishlist, rewards/loyalty, and order history.
- Cart pricing, promotion validation, checkout, order creation, cancellation, stock decrement, idempotency, and server-side pricing.
- Shade matching, skincare routine, beauty consultant, ingredient diagnostics, virtual try-on, and store-locator experiences.
- Staff fulfilment and administration for products, inventory, promotions, orders, reviews, and analytics.
- Responsive React PWA with service-worker/offline catalogue behavior.
- Express 4 + TypeScript + PostgreSQL 16, with SQL migrations and a shared Node server serving the built SPA.

## Actual API behavior and access boundaries

The API is mounted under `/api` and the application attaches optional session resolution to requests:
- Public catalogue routes: product list/details, samples, boutique directory, config, promo validation and newsletter signup.
- Public AI routes: shade match, skincare routine, beauty consultant and store locator.
- Review browsing is public, while posting/voting/deleting reviews requires authentication.
- Registration/login set an HttpOnly session cookie; session resolution uses JWT, SameSite=Lax, Secure in production, and a token-version check.
- Account profile, saved addresses, wishlist, rewards, and order history are behind `requireAuth`.
- Order create/read/cancel routes are explicitly protected by `requireAuth`.
- Staff/admin operations require separate roles.

Therefore, the current app does not deliver the requested no-signup, end-to-end recruiter shopping journey by default. Visitors can browse a public catalogue and use several public beauty tools, but they cannot complete a checkout/order, save account state, or inspect personal order history without creating an account.

## Seed data and existing demo facilities

The repository provides two different seed operations:
- `seedCatalog` creates a deterministic starter product/sample/reward/boutique catalogue, designed to be production-safe and idempotent.
- `seedDemo` creates a shared demo customer, known promotional codes, and sample reviews. It is explicitly documented as development/demo data and **must never be enabled in production**.

The shared demo account is not suitable for a public recruiter environment:
- Everyone would share one user identity, profile, wishlist, loyalty points and order history.
- Concurrent order activity would leak between visitors and affect the shared product stock.
- Its known credentials are in source, so it must not be deployed as a public common login.
- The seed README and comments expressly restrict `SEED_DEMO` to local development.

The public demo should not depend on `SEED_DEMO=true` or a shared customer login. Use the safe starter catalogue plus a separately designed per-visitor demo identity/session, or another isolated data model after reviewing the schema.

## Actual commerce rules and limitations

- Server-side pricing is authoritative. The order service calculates totals from database products, checks stock, locks rows, commits stock changes and uses an Idempotency-Key to protect repeated submissions.
- The only implemented payment provider is `manual` (pay on delivery). There is no online card-payment integration. No raw card data should ever be collected in the recruiter demo.
- The demo should label checkout as a **sample order / no payment collected**; it must not imply a real sale, delivery, payment settlement, or real customer account.
- Order creation decrements inventory. Recruiter sessions therefore must not share the same stock records. Options include per-session disposable catalogue/inventory state or a resettable isolated database/schema per demo session.
- Email delivery uses a safe wrapper and can be absent when SMTP is not configured. Recruiter mode should route all emails to a local capture/outbox view or disable outbound delivery. It must not send real order or password-reset emails.
- Newsletter signup persists the submitted email. It should be disabled, or use a separate demo-only address sink without retaining visitor email addresses.
- Promo validation is public, but promo redemption/usage must be isolated if the demo allows multiple checkouts.
- Staff/admin console and privileged routes must never be made public or mapped to a public guest account.

## AI and integrations

- Gemini is optional. Without a configured key, the backend uses catalogue-grounded deterministic fallback behavior. This lets some beauty workflows remain useful without live AI credentials.
- The README says live Gemini and Maps grounding were not exercised during the original build. They must not be advertised as live AI until current deployment credentials and responses are verified.
- The project tests AI behavior using fake clients, malformed output and fallback paths; this is useful evidence, but not proof of live external model availability.
- Boutique seeds are starter/sample content; README warns that the starter catalogue, boutique directory, award text and marketing copy are sample content that must be replaced/confirmed before a real store launch.
- For a portfolio demo, clearly label the store, products, boutiques, review content, prices, promotions, and orders as fictional/synthetic demonstration content. Avoid claims of affiliation, real stock, real customer reviews or real boutique presence.
- Virtual try-on and geolocation/camera capabilities require explicit user permission and a graceful non-camera fallback. The browser permissions policy currently enables camera/geolocation for self and disables microphone/payment.

## Deployment observations and limitations

- This is a combined Node/Express service that serves both API and the built Vite SPA; it is not a frontend-only Vercel static app.
- The production path expects Node 22+, a PostgreSQL database, `DATABASE_URL`, `JWT_SECRET` (at least 32 chars), and HTTPS-secure cookie configuration.
- Docker Compose runs PostgreSQL and the app as separate containers; it does not publish the database port in its default config.
- Health endpoint `GET /health` verifies that PostgreSQL responds.
- The old portfolio lists `https://sayphora.vercel.app/` as the app URL. Attempts to read the root, `/health`, and `/api/config` through the available web reader were inaccessible, so no public health, API, or end-to-end status is verified.
- The connected Vercel workspace currently lists the portfolio and CleanFlow E2E projects but not a Sayphora deployment. The existing URL must not be presumed to be attached to the connected deployment workspace.
- The repository's production-style Docker configuration is a suitable starting point for a single combined app/API service plus PostgreSQL, but the public demo should use managed/persistent PostgreSQL, isolated disposable session data, TLS, and no exposed database port.

## Recruiter experience to build

1. A recruiter enters the Sayphora product lab without account creation or credentials.
2. The lab explains that the store is a synthetic sample commerce environment, not a real retailer or payment processor.
3. Recruiter can browse/filter products, inspect shade variants and ingredients, compare products, add/remove items, use sample/promo flows, and explore loyalty.
4. A demo-only session is established automatically and bound to that browser. It is not the shared `demo@sayphora.test` account.
5. Recruiter can add a synthetic shipping address and complete a sample checkout. The order is real database-backed application state but explicitly marked as a test/sample order; no payment or delivery occurs.
6. Recruiter can view the order timeline, cancel if the normal product rules allow, and observe stock and loyalty changes within their isolated demo environment.
7. Public AI beauty tools are available with clear labels showing whether the response came from the Gemini provider or the deterministic fallback.
8. Recruiter can inspect the frontend/API/database architecture, relevant code, and API/unit/E2E tests.
9. The demo environment expires and its user, session, address, order, order items, wishlist, review votes, reward redemption, promo usage, and related synthetic records are deleted or reset safely.

## Security and engineering gates

Before marking Sayphora demo-ready:
- Build a short-lived per-visitor demo session. Do not expose a well-known shared demo account or allow arbitrary public customer account creation solely to support recruiter access.
- Scope every demo account's data to its own user id; verify cross-session access fails for orders, addresses, wishlist, rewards, and profiles.
- Isolate inventory, promo usage, and any mutable catalogue state so one visitor cannot alter another visitor's experience.
- Set strict session expiry and rate limits for registration/bootstrap, AI endpoints, newsletter, promo validation, checkout and writes.
- Disable newsletter collection in recruiter mode or send it to a non-retaining demo sink.
- Disable external SMTP and all outbound emails, or redirect them to a demo capture inbox visible only to the session.
- Keep payment provider set to manual; never ask for card details. Add explicit "sample order — no payment or delivery" language in all checkout/order states.
- Disable all staff/admin routes for demo identities.
- Seed only reviewed fictional data. Ensure no customer or personal data is present.
- Add strict cleanup with a safe allowlist of session-owned rows. Do not cascade-delete any real account/product/admin data.
- Test two simultaneous recruiter browsers, order/idempotency behavior, inventory isolation, cancellation/stock restoration, and cleanup expiry.
- Verify production build, database migrations, /health, public catalog, login-free demo bootstrap, full checkout, order history, email suppression, and all key mobile/desktop flows.

## Current status

**Source audit complete; recruiter guest-session implementation and public deployment pending.** The repository supports a full product experience with real server-side commerce logic, but the existing checkout/order journey requires a registered user. The existing Vercel URL and external AI integrations have not been verified live. Do not label Sayphora's current deployment as a verified recruiter-ready demo.
