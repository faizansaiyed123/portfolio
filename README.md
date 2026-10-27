# Faizan Saiyed — Portfolio

A static GitHub Pages portfolio designed as an interactive engineering casebook.

## Experience

The site is intentionally built without a frontend framework, AI service, or runtime third-party service.

It combines:

- Art-directed editorial layout with a systems / instrument-panel visual language
- Engineering case studies for FrameFlux and Telemetry
- Merged open-source contribution cards linking to the original pull requests
- Two clickable freelance client cards for Jeca Homes and PrintOscar
- A 19-project personal full-stack gallery with local website captures, architecture/repository previews where a live screen is not claimed, repository links, technology chips, and interactive technology filters
- Responsive navigation with keyboard support
- Theme preference with local persistence and system fallback
- A deterministic, frontend-only guided portfolio experience with predefined decision-tree responses
- Local profile image with a local fallback asset
- Reduced-motion support

## Guided portfolio experience

The "Portfolio Guide" is a static interaction system for visitors exploring the site.

The visitor chooses from curated paths. Every step is rendered from predefined data in script.js, including:

- Explore projects
- Explore the engineering approach
- Explore the technical stack
- Learn more about Faizan
- Contact and source links
- Project, stack, contact, technical, and behavioral follow-up paths

Responses, actions, and navigation are deterministic. The flow has no API calls, model calls, prompts, streaming, repository discovery, or external chat service.

## Project gallery and preview assets

The portfolio is a static site; filtering and navigation run in the browser without a backend. Project summaries and source links are based on the corresponding repositories. Preview images live under `assets/site-previews/` and are stored locally, so the gallery does not need remote image hosting. Deployed-site captures are labeled as live screens; FrameFlux uses an architecture diagram, and LedgerPulse uses a screenshot from its frontend repository walkthrough because a public deployment URL was not verified.

The project cards link to the actual public source repositories. The freelance cards link directly to their client websites and do not expose private source repositories.

## Source of truth

The portfolio does not invent project outcomes or runtime statistics. Featured projects link directly to their repositories, where the implementation and documentation remain the source of truth.

## Files

text tree:
/
├── index.html
├── style.css
├── script.js
└── assets/
    ├── favicon.svg
    ├── profile.jpeg
    └── profile-fallback.svg

## Local preview

There is no package installation or build step.

python -m http.server 8080

Open:

http://localhost:8080/

## GitHub Pages

The site is published at:

https://faizansaiyed123.github.io/portfolio/

Keep asset paths relative so the site remains compatible with the project-site /portfolio/ path.

## Maintenance

- Update portfolio copy and links in index.html.
- Update design tokens, layout, responsive behavior and motion in style.css.
- Keep the guided portfolio data and interaction logic self-contained in script.js.
- Keep featured-project claims aligned with the real repositories.
