# Faizan Saiyed — interactive software portfolio

This repository contains a dark-first, static portfolio designed around **product labs**. The goal is to let a recruiter understand a product, follow its real workflow, inspect its architecture and source, and use an isolated demo when that demo has actually passed verification.

## Portfolio experience

- Freelance client work and internship work are shown separately from personal projects.
- **17 personal projects** with searchable/category-filtered discovery and homepage screenshots.
- A shareable project lab for each project: product workflow, implemented capabilities, architecture, technologies, runtime/data-isolation model, source repositories and audit evidence.
- A verified demo action is enabled only when a complete public application path has been checked. A separately supplied recruiter-preview URL may be shown as an exploratory link, but is explicitly labelled availability-unverified and does not change the project's verification status.
- All recruiter demo records are synthetic. Projects remain `verification-pending` until the real frontend, backend, database and required workers pass a clean-browser journey.
- An all-types public GitHub profile calendar (commits, pull requests, issues and reviews) is shown separately from the complete external merged-PR list.
- The external PR list is filterable by repository, contribution type and merge date, and links to the original pull requests.
- Published software release credits link to official release notes and merged PRs. Prereleases are labelled as prereleases.
- Evidence-backed milestones are not represented as GitHub-issued profile badges.

## Project scope

The personal-project library contains 17 independent projects. Mintline remains separate because its repository identifies it as an internship assignment. Freelance client work and internship work are presented in their own sections and are not counted as personal projects.

Every project has a source audit in `docs/project-labs/`. These audits record actual user workflows, backend boundaries, worker behavior, tests, integration side effects, deployment constraints and demo safety gates. They are implementation references, not claims that a demo is already hosted.

## Data and refresh

- `data/projects.json` stores personal-project metadata and per-project lab details.
- `data/release-credits.json` stores the currently verified published release credits.
- `data/activity.json` stores the verified external merged-PR snapshot in the same `main` branch as the portfolio.
- The contribution calendar is not stored as a generated portfolio snapshot. The frontend loads a live SVG renderer backed by GitHub's public contribution graph and refreshes the image in-browser, so new GitHub activity does not require a portfolio data commit, a scheduled snapshot, or a new automation branch.
- `.github/workflows/refresh-activity.yml` refreshes the verified external merged-PR snapshot every three hours and supports `workflow_dispatch`. It creates or updates the dedicated `automation/public-github-snapshots` branch only when that verified PR dataset changes.
- The external merged-PR snapshot uses GitHub's public REST Search API. The live contribution graph uses GitHub's public profile contribution calendar, so it reflects the same public calendar GitHub renders on the profile.

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
