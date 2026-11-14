# Portfolio Rebuild Plan

## Objective

Replace the existing portfolio experience with a new, independent product-lab experience. Do not reuse the current portfolio's visual system, information architecture, motion language, or section layout.

The portfolio should prove engineering ability through usable products. A recruiter must be able to open each personal project, explore its workflows with synthetic/demo data, understand the real architecture, and inspect source code and tests. A screenshot or frontend-only mock is not a substitute for a working product demo.

## Safety and scope

- Work on `redesign/interactive-product-portfolio` and its protected-branch continuation `redesign/interactive-product-portfolio-followup`; changes to the protected base must go through a pull request.
- Do not modify or merge into `main`.
- Do not deploy over the existing production portfolio during this rebuild.
- Scope the showcase to personal projects only. Exclude client builds and internship/employer work from the personal-project gallery.
- Never commit credentials, API keys, production data, customer data, private user data, or real account balances.
- Demo data must be synthetic and visibly labeled.
- Never represent a frontend-only page, recorded response, or local simulation as a live backend.
- Use a project's real frontend/backend and its real application logic for an interactive demo wherever possible. If a required service is not deployed or unavailable, state the limitation and keep the project marked as not yet demo-ready.
- Public demo environments need isolation, bounded resource use, safe seeded data, no destructive access to real systems, and a reset path.
- Preserve original repositories. The portfolio repository is an index and visitor experience, not a place to copy all project source code.

## Intended visitor experience

1. A distinct, memorable entry experience and clear navigation.
2. A personal-project library with search, filters, and project-specific pages.
3. A real "try the product" path for every project, powered by an isolated demo environment.
4. A project lab for each application: workflows, sample scenario, capabilities, system map, technologies, verification evidence, source repositories, and demo availability.
5. An open-source contribution area with a live/snapshotted contribution activity graph, complete verified contribution list, repository filters, and links to original PRs.
6. A release-credit area that links to official release notes and the corresponding merged PR; only verified published credits qualify.
7. A GitHub profile/achievement area based on public, auditable evidence.
8. Responsive desktop/mobile behavior, keyboard accessibility, reduced-motion support, fast loading, and robust empty/error states.

## Implementation sequence

### Phase 0 — Inventory and evidence
- [x] Find the personal-project inventory in the current portfolio.
- [x] Create the isolated rebuild branch.
- [x] First-pass README review for the original 18 portfolio entries; Mintline is excluded because it is an internship assignment, leaving 17 personal projects.
- [x] Confirm 19 merged pull requests outside the user's own repositories through GitHub Search API.
- [x] Inspect actual frontend routes, backend routes, auth, data isolation, tests, and deployment constraints for FrameFlux and Telemetry; see `docs/project-labs/frameflux.md` and `docs/project-labs/telemetry.md`.
- [x] Complete source-level audits for FrameFlux, Telemetry, Sayphora, Focus Journal, Nexora, Flagship, Fieldline CRM, Orbit Campaigns, Product Analytics, Gemini Chat, and AgencyOS; see `docs/project-labs/`.
- [x] Exclude Mintline from the public personal-project library after confirming its own repository identifies it as an internship assignment; see `docs/project-labs/mintline.md`.
- [x] Complete source-level audit for CleanFlow; see `docs/project-labs/cleanflow.md`.
- [x] Complete source-level audit for FlowDesk; see `docs/project-labs/flowdesk.md`.
- [x] Complete source-level audit for SupportAI; see `docs/project-labs/supportai.md`.
- [x] Complete source-level audit for Service Agreement Manager; see `docs/project-labs/service-agreement-manager.md`.
- [x] Complete source-level audit for AutoFix; see `docs/project-labs/autofix.md`.
- [x] Complete source-level audit for LedgerPulse; see `docs/project-labs/ledgerpulse.md`.
- [x] Complete source-level audits for all 17 personal projects.
- [x] Build the shared, shareable project-lab page and structured workflow/runtime/source-evidence record for all 17 projects.
- [ ] Implement each project's live recruiter environment and full browser journey one by one; no project is marked ready until its actual frontend, API, data store and required workers pass verification.
- [ ] Verify current frontend and backend deployment availability; do not infer it from a repository homepage URL.
- [ ] Independently verify release-credit claims against the official release and merged PR.

### Phase 1 — New portfolio foundation
- [x] Replace the old page structure with a new product-lab experience; the previous portfolio design is not reused.
- [x] Add navigation, project discovery, search/category filters, shareable project detail routes, and explicit demo status semantics.
- [x] Establish the new dark-first visual system and responsive layouts for the library and project-lab pages.
- [x] Add structured project records with per-project workflow, runtime isolation, preview, source-audit and demo-plan fields.
- [x] Add a GitHub Actions quality workflow and validator for JavaScript syntax, project metadata, source audits, preview assets, PR records and release credits; first CI run still pending.

### Phase 2 — Project-by-project product labs
For every project, use the same evidence-first checklist before building its visitor experience:
- Read its README and architecture documentation.
- Inspect the frontend routes, primary components, API client, forms, and loading/error states.
- Inspect backend routes, services, domain models, migrations, authorization, worker/queue behavior, and health endpoints.
- Inspect seed/demo fixtures and tests; identify destructive or unsafe seed scripts.
- Determine which workflows can safely run in a public isolated demo.
- Verify whether its current frontend and backend deployments work together.
- Build the project's dedicated demo path and technical tour.
- Run the project's available tests/build checks and verify the public demo path before marking it ready.

Initial order (revisit after each audit; Mintline removed as internship assignment):
1. FrameFlux
2. Telemetry
3. Sayphora
4. Focus Journal
5. Nexora
6. Flagship (Feature Flag Platform)
7. Fieldline CRM
8. Orbit Campaigns
9. Product Analytics
10. Gemini Chat Platform
11. AgencyOS
12. CleanFlow
13. FlowDesk
14. SupportAI
15. Service Agreement Manager
16. AutoFix
17. LedgerPulse

### Phase 3 — Contributions and proof
- [x] Build the contribution graph from dated, verified merged external PR data and label the metric precisely. This is explicitly an external merged-PR graph, not the full GitHub contribution calendar.
- [x] Add a separate full public GitHub profile contribution calendar from GitHub GraphQL (commits, PRs, issues, reviews); never conflate it with the external merged-PR list.
- [x] Include the complete current external merged-PR snapshot (19 records) and paginate the refresh query.
- [x] Provide repository, contribution-type and merge-date filters with original PR links.
- [x] Verify all five release credits against official GitHub release metadata and corresponding merged PRs; label Home Assistant 20260930.0 as a prerelease.
- [x] Add evidence-backed work milestones derived from the verified external merged PR and official release datasets; do not call them GitHub-issued badges.
- [ ] Retrieve and add actual GitHub-issued profile achievement badges only when the badge records can be verified. The portfolio currently links to the live profile achievement page and shows only independently calculated evidence milestones.
- [x] Add scheduled GitHub Actions refresh for the PR record and the full public profile calendar on the separate `activity-data` branch; first successful refresh run still pending.

### Phase 4 — Hardening and release
- [ ] Test all controls, navigation, forms, filters, modals, demo links, and reset flows.
- [ ] Test at mobile and desktop breakpoints, keyboard-only navigation, and reduced motion.
- [ ] Run accessibility, link, performance, and production-build checks.
- [ ] Verify every project status against real deployments and evidence.
- [ ] Review all public demo security limits, synthetic data, and reset behavior.
- [ ] Deploy only after explicit verification; leave `main` and the current production site untouched until the rebuild is approved.

## Personal project inventory and first-pass understanding

Mintline is intentionally excluded from this gallery. Its own backend README identifies it as an internship assignment; see `docs/project-labs/mintline.md`.

| # | Project | Frontend repository | Backend repository | First-pass domain understanding |
|---:|---|---|---|---|
| 1 | FrameFlux | `FrameFlux-Frontend` | `FrameFlux-Backend` | Resumable media uploads, validation, durable jobs, Redis/ARQ workers, FFmpeg transforms, progress, retries, cancellation. |
| 2 | Telemetry | `telemetry-frontend` | `telemetry-backend` | Realtime observability, synthetic and real host telemetry, anomaly detection, alerts/incidents, SLOs, authenticated WebSockets, persistence. |
| 3 | Sayphora | `Sayphora` (combined frontend/API) | Same repository | Beauty commerce: catalogue, cart pricing, orders, stock, reviews, loyalty, AI beauty tools, PWA, admin operations. |
| 4 | Focus Journal | `Focus-Journal-Frontend` | `Focus-Journal-Backend` | Private journaling, daily check-ins, focus sessions, history summaries, OAuth, optional consent-based AI insights. |
| 5 | Nexora | `Nexora-Frontend` | `Nexora-backend` | Multi-tenant price intelligence: tracked offerings, competitors, source discovery, collection jobs, observations, snapshots, alerts. |
| 6 | Flagship | `feature-flag-platform-frontend` | `feature-flag-platform-backend` | Organization-scoped feature flags, environments, targeting, audience segments, deterministic rollouts, evaluation, SDK keys, audit. |
| 7 | Fieldline CRM | `fieldline-crm-frontend` | `fieldline-crm-backend` | Multi-tenant CRM, contacts/companies, pipeline, imports, saved views, relationship intelligence, automation, audit. |
| 8 | Orbit Campaigns | `marketing-campaign-management-frontend` | `marketing-campaign-management-backend` | Audience/contact management, campaign authoring/scheduling, templates, durable email delivery, tracking, reporting, worker. |
| 9 | Product Analytics | `product_analytics_frontend` | `product_analytics_backend` | Event ingestion, identity resolution, trends, funnels, retention, sessions, cohorts, reports, dashboards, exports, worker. |
| 10 | Gemini Chat Platform | `gemini-frontend-clone` | `gemini-backend-clone` | OTP auth, chatrooms/history, queued AI replies, Redis worker/rate limiting, Stripe test checkout. Backend README says replies use OpenAI, not Gemini; this distinction must be accurate. |
| 11 | AgencyOS | `agencyos_frontend` | `agencyos_backend` | Multi-tenant agency operations: CRM/deals, proposals, projects, tasks, time tracking, invoices, client portal, worker/outbox, MFA, webhooks. |
| 12 | CleanFlow | `cleanflow_frontend` | `cleanflow_backend` | Cleaning-operations workflow: inquiry, quotes/contracts, recurring schedules, field jobs, invoicing/payments, reporting, integrations. Frontend README is a starter template and requires source inspection. |
| 13 | FlowDesk | `flow-desk_frontend` | `flow-desk_backend` | Multi-tenant workspace: clients/projects, Kanban tasks, time tracking, invoices, team/membership, notifications, API keys, webhooks, attachments. Frontend README is a starter template and requires source inspection. |
| 14 | SupportAI | `supportai_frontend` | `supportai_backend` | Support tickets and knowledge-base RAG using PostgreSQL/pgvector, embeddings, reranking, local Ollama model runtime, ingestion worker. |
| 15 | Service Agreement Manager | `service-agreement-manager-frontend` | `service-agreement-manager-backend` | HVAC/plumbing service-business workflow: customers, agreements, maintenance schedules, work orders, invoices/payments, portals, email/SMS/webhook workers. |
| 16 | AutoFix | `autofix_frontend` | `autofix_backend` | Garage operations: vehicles, appointments, inspections, repair orders, parts/inventory, estimates, invoices, customer portal. Frontend README is a starter template and requires source inspection. |
| 17 | LedgerPulse | `ledgerpulse_frontend` | `ledgerpulse_backend` | Invoice/expense management using Firebase Auth, Flask API and PostgreSQL; customers, vendors, invoices, payments, recurring billing, organization access. Has a browser-local demo mode that must be inspected and clearly separated from API mode. |

## Evidence notes

- Current GitHub default branch at branch creation: `main`, commit `6e9c41e1e5d7f409d57554c0465b8821e6ca5cbd`.
- Rebuild branch: `redesign/interactive-product-portfolio`.
- The current portfolio initially listed 18 entries; Mintline was excluded because its own README identifies it as an internship assignment. The personal-project library now contains 17 items.
- Current portfolio snapshot and GitHub search both identify 19 merged external pull requests as of 14 November 2026. The official GitHub Search API query used for the external contribution set is `author:faizansaiyed123 is:pr is:merged -user:faizansaiyed123`.
- The existing page lists five release-credit candidates. They remain candidates until each official release and PR is rechecked.
- Existing repository READMEs are only a first-pass inventory. They are not sufficient to declare an application demo-ready.
- The current website's old structure and design are not a reference for the new implementation.
