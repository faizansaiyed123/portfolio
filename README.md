# Faizan Saiyed — Portfolio

A static GitHub Pages portfolio designed as an interactive engineering casebook.

## Experience

The site is intentionally built without a frontend framework or runtime third-party services.

It combines:

- Art-directed editorial layout with a systems / instrument-panel visual language
- Engineering case studies for FrameFlux and Telemetry
- CSS-native signal visuals and subtle motion
- Responsive navigation with keyboard support
- Theme preference with local persistence and system fallback
- A deterministic, frontend-only portfolio guide that types responses, branches into project/method/stack/contact paths, jumps to relevant sections, and can restart
- Local profile image with a local fallback asset
- Reduced-motion support

## Source of truth

The portfolio does not invent project outcomes or runtime statistics. The two featured projects link directly to their repositories, where the implementation and documentation remain the source of truth.

### FrameFlux

FastAPI media processing built around PostgreSQL, Redis, ARQ background jobs and FFmpeg, including resumable uploads, validation, processing/editing workflows, progress tracking, projects and backend tests.

- https://github.com/faizansaiyed123/FrameFlux-Backend
- https://github.com/faizansaiyed123/FrameFlux-Frontend

### Telemetry

FastAPI observability with synthetic telemetry, authenticated WebSockets, anomaly detection, asynchronous PostgreSQL persistence, JWT/Argon2 authentication, role-based access control, simulation controls, and backend/browser verification.

- https://github.com/faizansaiyed123/telemetry-backend
- https://github.com/faizansaiyed123/telemetry-frontend

## Files

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

There is no package installation or build step.

```bash
python -m http.server 8080
```

Open:

```text
http://localhost:8080/
```

## GitHub Pages

The site is published at:

https://faizansaiyed123.github.io/portfolio/

Keep asset paths relative so the site remains compatible with the project-site `/portfolio/` path.

## Maintenance

- Update portfolio copy and links in `index.html`.
- Update design tokens, layout, responsive behavior and motion in `style.css`.
- Keep interaction logic small and self-contained in `script.js`.
- Keep featured-project claims aligned with the real repositories.
