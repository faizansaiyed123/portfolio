# Faizan Saiyed — Portfolio

A static GitHub Pages portfolio designed as an interactive engineering casebook.

## Experience

The site is intentionally built without a frontend framework, AI service, backend, or runtime third-party service.

It combines:

- An editorial systems / instrument-panel visual identity
- Engineering case studies for FrameFlux and Telemetry
- **Trace Mode:** a deterministic, source-linked walkthrough of each flagship system, with implementation and test links
- Merged open-source contributions linked to their original pull requests, with repository filters
- Two independent client builds: Jeca Homes and PrintOscar
- A separate professional-experience section for the Gyansetu AI backend internship
- An 18-project personal full-stack gallery with local previews, repository links, technology chips, and interactive filters
- Responsive navigation, keyboard support, and reduced-motion handling
- A dark/light theme toggle that remembers an explicit choice in local storage and otherwise follows the browser's system color preference
- A deterministic, frontend-only Portfolio Guide and command palette
- A GitHub-hosted profile avatar with a local SVG fallback
- Locally stored project preview assets

## Trace Mode

Trace Mode is a static, deterministic walkthrough. It does not connect to a running service, issue API calls, or display simulated live metrics.

Each step links to a source file and a relevant test file in the corresponding public repository. The walkthrough covers:

- FrameFlux: upload progress, durable processing-job state, background worker registration, media task execution, and API-level job lifecycle tests
- Telemetry: scoped event ingestion, rolling anomaly detection, background alert persistence, WebSocket delivery, and authenticated WebSocket integration tests

The linked repositories remain the source of truth. If their default branches or file paths change, update the links and summaries in `script.js`.

## Portfolio Guide

The Portfolio Guide is a static interaction system for visitors exploring the site. Responses and actions come from predefined data in `script.js`; the flow has no API calls, model calls, prompts, streaming, repository discovery, or external chat service.

## Content and evidence

The portfolio currently displays 18 personal projects and 19 merged contribution cards. Counts in the hero are derived from the rendered cards, so they stay aligned when cards are added or removed.

Project summaries and source links are based on their corresponding repositories. Live previews are labelled as live screens only where a public deployment is linked. FrameFlux uses an architecture diagram; Product Analytics uses a database-backed walkthrough capture because its current deployment cannot reach the API; LedgerPulse uses a repository walkthrough screenshot because a public deployment URL was not verified.

The two client cards link to their live websites and do not expose private source repositories. Gyansetu AI is presented separately as professional internship experience.

The portfolio does not invent project outcomes, users, revenue, uptime, benchmark claims, or live runtime statistics.

## Files

```text
/
├── index.html
├── style.css
├── script.js
└── assets/
    ├── favicon.svg
    ├── mini-faizan-run.webp
    ├── mini-faizan-wave.webp
    ├── profile-fallback.svg
    └── site-previews/
        ├── project website captures
        ├── architecture diagrams
        └── walkthrough screenshots
```

## Local preview

No package installation or build step is required.

```bash
python -m http.server 8080
```

Open <http://localhost:8080/>.

## GitHub Pages

The site is published at:

<https://faizansaiyed123.github.io/portfolio/>

Keep asset paths relative so the site remains compatible with the project-site `/portfolio/` path.

## Maintenance

- Update portfolio copy and links in `index.html`.
- Update design tokens, layout, responsive behavior, and motion in `style.css`.
- Keep the guided portfolio data, Trace Mode evidence, theme preference, filters, and interaction logic in `script.js`.
- Keep every project and contribution claim aligned with its public source repository.
- Recheck repository file paths when changing Trace Mode links.

## Review checklist

Before publishing a change, verify:

- Desktop and mobile navigation targets resolve to one section each.
- Trace Mode source and test links still exist.
- All project and contribution cards remain present and their filters work.
- Theme preference works with local storage available and unavailable.
- Keyboard focus is visible and reduced-motion preferences are respected.
- No section describes a static illustration as live telemetry.
