# Faizan Saiyed — interactive software portfolio

This repository contains a dark-first, static portfolio designed around **product labs**. The goal is to let a recruiter understand a product, follow its real workflow, inspect its architecture and source, and use an isolated demo when that demo has actually passed verification.

## Portfolio experience

- **17 personal projects** with searchable/category-filtered discovery.
- A shareable project lab for each project: product workflow, implemented capabilities, architecture, technologies, runtime/data-isolation model, source repositories and audit evidence.
- A demo action is enabled only when a complete public application path has been verified. A listed frontend URL is not treated as proof that the backend or workers are online.
- All recruiter demo records are synthetic. Projects remain `verification-pending` until the real frontend, backend, database and required workers pass a clean-browser journey.
- An all-types public GitHub profile calendar (commits, pull requests, issues and reviews) is shown separately from the complete external merged-PR list.
- The external PR list is filterable by repository, contribution type and merge date, and links to the original pull requests.
- Published software release credits link to official release notes and merged PRs. Prereleases are labelled as prereleases.
- Evidence-backed milestones are not represented as GitHub-issued profile badges.

## Project scope

The personal-project library contains 17 independent projects. Mintline was excluded because its own repository identifies it as an internship assignment. Client work and employer/internship work are not included as personal products.

Every project has a source audit in `docs/project-labs/`. These audits record actual user workflows, backend boundaries, worker behavior, tests, integration side effects, deployment constraints and demo safety gates. They are implementation references, not claims that a demo is already hosted.

## Data and refresh

- `data/projects.json` stores personal-project metadata and per-project lab details.
- `data/release-credits.json` stores the currently verified published release credits.
- `data/activity.json` on the `activity-data` branch stores the complete external merged-PR snapshot.
- `data/contributions-calendar.json` on the `activity-data` branch stores the public profile contribution calendar.
- `.github/workflows/refresh-activity.yml` refreshes both GitHub snapshots on a schedule and writes only to `activity-data`, not directly to the protected portfolio branch.
- The first scheduled/manual snapshot refresh still needs to complete before the contribution calendar can display its live totals.

## Local preview

No framework or package install is required for the static pages. Serve the repository root with any static HTTP server and open `index.html`. Project detail URLs use:

```text
project-lab.html?id=frameflux
```

The scripts use `fetch()` for JSON, so a static HTTP server is required; opening the HTML files directly with `file://` may block data loading.

## Quality checks

The GitHub Actions workflow `.github/workflows/portfolio-quality.yml` runs:

```bash
node --check script.js
node --check project-lab.js
node --check scripts/validate-portfolio.mjs
node scripts/validate-portfolio.mjs
```

The validator checks the 17-project inventory, unique project IDs, four workflow steps per lab, runtime isolation descriptions, audit/preview files, all external PR records and release-credit metadata.

## Working rules

- Preserve the existing production site and `main` branch until the rebuild is approved.
- Never commit credentials or real customer data.
- Never label a frontend mock, localStorage simulator, replay or queued-but-unsent message as a live full-stack product.
- Keep each demo isolated and bounded. Use per-visitor tenants for tenant-aware products and disposable databases for single-company products.
- Use private capture sinks for email and webhook side effects; use test-only payment integrations where permitted.
- Mark uncertainty as verification-pending rather than guessing.
