# Faizan Saiyed — Portfolio

A static GitHub Pages portfolio designed as an interactive engineering casebook.

## Experience

The site is intentionally built without a frontend framework, AI service, or runtime third-party service.

It combines:

- Art-directed editorial layout with a systems / instrument-panel visual language
- Engineering case studies for FrameFlux and Telemetry
- CSS-native signal visuals and subtle motion
- Responsive navigation with keyboard support
- Theme preference with local persistence and system fallback
- A deterministic, frontend-only guided portfolio experience with predefined decision-tree responses
- Local profile image with a local fallback asset
- Reduced-motion support

## Guided portfolio experience

The "Portfolio Guide" is a static interaction system for visitors exploring the site.

The visitor chooses from curated paths. Every step is rendered from predefined data in script.js, including:

- Start Interview
- Review Candidate
- Ask Technical Questions
- Ask Behavioral Questions
- Return / exit paths
- Project, stack, contact, technical, and behavioral follow-up paths

Responses, actions, and navigation are deterministic. The flow has no API calls, model calls, prompts, streaming, repository discovery, or external chat service.

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
- Keep the guided interview data and interaction logic self-contained in script.js.
- Keep featured-project claims aligned with the real repositories.
