# FrameFlux — project audit and demo design

Audit date: 14 November 2026  
Repositories:
- Frontend: https://github.com/faizansaiyed123/FrameFlux-Frontend
- Backend: https://github.com/faizansaiyed123/FrameFlux-Backend

## Product understood from source

FrameFlux is an asynchronous media-processing and editing product. It accepts uploaded video, audio, image, and subtitle assets; manages resumable uploads and projects; and submits media transformations to background work rather than holding long operations in the request path.

The source documents the following core architecture:
- Next.js 16 / React 19 frontend.
- FastAPI API.
- PostgreSQL for media/project/job metadata.
- Redis for ARQ task queue, progress, and resumable-upload manifests.
- A separate ARQ worker that runs FFmpeg/FFprobe processing.
- Local upload, temporary, and processed-file directories.

Observed application journeys in the frontend include login/signup, media library, resumable upload, media detail/editor, project management, jobs, notifications, workflows, batch actions, presets, comparisons, history, storage, and settings.

The backend registers dedicated routers for auth, media, jobs, projects, audio, video, images, GIFs, subtitles, thumbnails, workflows, batch jobs, comparisons, sharing, history, storage, search, notifications, exports, and metadata.

## Important findings from source inspection

### Authentication currently blocks a recruiter-first experience

- The frontend dashboard layout redirects visitors with no authenticated user to `/auth/login`.
- Frontend auth currently obtains a bearer token through the existing signup/login APIs.
- The API client stores the bearer token in browser local storage and attaches it as an Authorization header.
- Existing backend `/auth/signup` and `/auth/login` endpoints are rate-limited, but there is no anonymous demo-session endpoint.
- Media upload, resumable upload, media listing, processing, file access, and job endpoints use `get_current_active_user`. There is no public guest workspace today.

Therefore, simply linking the existing frontend does not satisfy the recruiter requirement. A recruiter would be stopped by authentication.

### Real work is performed by the backend

- Resumable upload routes initialize an upload session, accept chunks, pause/resume, retry, cancel, and finalize.
- The worker queue is registered through ARQ and uses FFmpeg processing tasks.
- Job status and media progress are read from actual backend/Redis state.
- The frontend's uploader calls the API and navigates to the media detail page after finalization.

This is suitable for a real, interactive demo. Replacing these actions with a browser-only simulation would misrepresent the product and is not the chosen approach.

### Public-demo resource policy must be stricter than development defaults

The inspected backend settings currently allow defaults of:
- 500 MB total upload size.
- 50 MB chunk size.
- Up to two hours of video duration.
- Four worker jobs concurrently.
- Up to ten concurrent jobs per user.

These are not appropriate public recruiter-demo defaults. A public environment needs much tighter limits, per-session quotas, bounded worker concurrency, a short demo-session lifetime, file retention/cleanup, and abuse/rate controls. Do not deploy the current development Compose file directly to the public internet; it publishes PostgreSQL and Redis ports.

### Existing verification

The backend repository includes tests for authentication, authorization, health, media processing/editing, projects, status/jobs, and upload validation. Upload tests cover extension, MIME, dangerous signatures, empty files, and size limits. Authorization tests check cross-user media access. The frontend repository includes a Playwright global setup that creates a test user, confirming the current end-to-end test path assumes account creation.

## Recruiter experience to build

1. Recruiter opens the FrameFlux lab from the portfolio.
2. They enter the real FrameFlux app without manually registering, entering credentials, or configuring services.
3. The demo bootstrap creates or resumes a per-visitor isolated demo identity, not a shared account.
4. The workspace contains clearly labelled synthetic sample media and a small preconfigured project.
5. Recruiter can upload one of the provided synthetic files or use seeded media, then run supported real processing jobs.
6. They can watch actual upload progress, queue state, worker stages, success/failure, and retrieve the actual output.
7. They can inspect real implementation links and relevant tests from the same walkthrough.
8. The demo data and files expire and are cleaned up automatically.

## Security and engineering design gates

Before calling FrameFlux demo-ready:
- Design a dedicated demo-session bootstrap with short expiry and strict IP/session quotas. Do not expose unrestricted account creation.
- Keep each visitor's media, project, and job records isolated using existing user ownership checks.
- Do not use a shared recruiter account or let recruiters access another visitor's uploads.
- Restrict file formats, size, resolution, duration, total storage per demo session, jobs per session, and worker concurrency.
- Use only synthetic sample assets. Clearly label them.
- Ensure the sample media actually passes the existing upload validators and is processed by the real FFmpeg worker.
- Disable or safely capture external integrations, outbound notifications, and any unsafe admin operations.
- Add scheduled TTL cleanup for expired demo users, media rows, upload chunks, original files, processed files, and orphaned job records.
- Ensure cleanup cannot delete non-demo users' data.
- Add tests for session creation, rate limits, isolation, quotas, expiration, cleanup, upload, worker processing, and output retrieval.
- Verify the public frontend URL, API CORS, storage URL, worker health, Redis, PostgreSQL, and end-to-end browser flow before changing demo status from `verification-pending`.

## Current status

**Audit complete; implementation and deployment pending.** No FrameFlux demo URL is currently listed in the portfolio project inventory, and no public backend or worker has been verified for recruiter access. Do not label it live until the full flow passes from a clean browser session.
