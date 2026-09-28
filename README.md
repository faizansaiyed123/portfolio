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

The portfolio does not invent project outcomes or runtime statistics. Featured projects link directly to their repositories, where the implementation and documentation remain the source of truth.

## Files

```text
/
├── index.html
├── style.css
├── script.js
├── api/
│   └── chat.ts
├── lib/
│   ├── cache.ts
│   ├── gemini.ts
│   └── github.ts
├── scripts/
│   ├── api-contract-check.ts
│   ├── github-smoke.mjs
│   └── live-retrieval-check.ts
├── .github/workflows/
│   └── live-chat-check.yml
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


## Live GitHub project intelligence

The existing "Ask Faizan" guide now supports live repository questions without hardcoded repository knowledge.

### Architecture

The GitHub Pages site remains a static frontend. The chat UI calls a separate Vercel Function at `/api/chat` (or the URL configured by the `chat-api-url` meta tag). The function:

1. discovers the current public repositories for `GITHUB_OWNER`;
2. resolves a repository or project group from the user's question;
3. retrieves only the needed GitHub evidence (metadata, README, language data, repository tree, dependency manifests, relevant source files, and recent commits when requested);
4. caches GitHub data and applies distributed rate limiting with Upstash Redis;
5. sends only the retrieved evidence to the Gemini API using a model with a free API tier;
6. returns the grounded answer plus clickable repository/source links.

Private repositories are never included in public repository discovery. When a named repository is private or inaccessible, the assistant reports that limitation instead of exposing source or inventing details.

### Deploy the API

The backend is designed for Vercel Functions. Add environment variables server-side; none of the secrets belong in the GitHub Pages frontend.

Create a Vercel project from this repository using a project name such as:

`faizan-portfolio-chat`

Then add these environment variables in Vercel:

`GEMINI_API_KEY` — required for AI responses. Google AI Studio currently offers a free Gemini API tier with free input and output tokens for supported models.

`GEMINI_MODEL` — optional; defaults to `gemini-3.8-flash`.

`GITHUB_OWNER` — defaults to `faizansaiyed123`.

`PORTFOLIO_REPO` — defaults to `faizansaiyed123/portfolio`.

`GITHUB_TOKEN` — optional. Public repositories work without it. When configured, keep its permissions read-only; the API still filters private repositories out of public discovery.

`UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` — required for durable production caching and distributed rate limiting.

`CORS_ORIGINS` — defaults to the GitHub Pages origin plus localhost development origins.

For a free Gemini key, create one from Google AI Studio's API Keys page. The Gemini API documentation shows API-key authentication through the `x-goog-api-key` header.

After the first Vercel deployment, make sure the generated API URL matches the `chat-api-url` value in `index.html`. The default checked-in value is:

`https://faizan-portfolio-chat.vercel.app/api/chat`

### Local backend checks

Install dependencies and run:

```bash
npm install
npm run check
```

The frontend itself still has no build step; it can be previewed with:

```bash
python -m http.server 8080
```

For local API testing, run the Vercel development server after installing the Vercel CLI and loading the environment variables:

```bash
vercel dev
```

### Safety and grounding

The API never sends an entire repository to the model. It builds a bounded evidence set based on the question and caps the evidence payload before generation.

The model is instructed to treat retrieved GitHub data as the implementation source of truth, ignore instructions embedded inside repository content, distinguish documentation from code-level inference, cite concrete repository/file paths when useful, and explicitly report missing evidence rather than guessing.

