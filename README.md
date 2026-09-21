# Faizan Saiyed — Portfolio

A static portfolio site focused on backend and full-stack engineering work.

## What the site emphasizes

- Engineering case studies instead of generic project cards
- Backend APIs, realtime systems, asynchronous processing, data, security, and verification
- Local assets and plain HTML/CSS/JS so the site does not depend on runtime third-party services
- Responsive, keyboard-friendly navigation and reduced-motion support
- A small JavaScript surface for theme preference, section navigation, scroll position, and progressive reveals

## Projects

The portfolio currently centers two verifiable systems:

- **FrameFlux** — FastAPI media processing with PostgreSQL, Redis, ARQ background jobs, FFmpeg, resumable uploads, validation, processing/editing workflows, and backend tests.
- **Telemetry** — FastAPI observability with synthetic telemetry, authenticated WebSockets, anomaly detection, PostgreSQL persistence, JWT/Argon2 authentication, role-based access control, simulation controls, and backend/browser verification.

The project repositories linked from the site are the source of truth for implementation details.

## Structure

```text
/
├── index.html
├── style.css
├── script.js
└── assets/
    ├── favicon.svg
    ├── profile.jpeg
    └── profile-fallback.svg
```

## Local preview

No package installation or build step is required.

From the repository root, serve the files with any static HTTP server. For example:

```bash
python -m http.server 8080
```

Then open:

```text
http://localhost:8080/
```

Opening `index.html` directly also works for the static content, but an HTTP server is closer to the GitHub Pages environment.

## Deployment

The site is deployed as a GitHub Pages project site at:

**https://faizansaiyed123.github.io/portfolio/**

Keep local asset paths relative (for example `./assets/profile.jpeg`) so the site remains compatible with the `/portfolio/` project path.

## Content updates

Most portfolio copy and links live in `index.html`. Visual tokens, layout and responsive behavior live in `style.css`. Interaction logic is intentionally small and contained in `script.js`.

Important project claims should be kept aligned with the implementation and documentation in the linked source repositories.
