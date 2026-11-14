# SupportAI — source audit and recruiter demo design

Audit date: 14 November 2026

Repositories:
- Frontend: https://github.com/faizansaiyed123/supportai_frontend
- Backend: https://github.com/faizansaiyed123/supportai_backend

## Product understood from source

SupportAI is an internal customer-support workspace built around an organization-specific knowledge base and retrieval-augmented assistant. It combines document ingestion, cited answers, conversation history, human escalation and agent ticket management.

The verified product loop is:
1. Create an organization and its owner account.
2. Add customers and team members; assign owner/admin/agent/viewer permissions.
3. Upload a PDF, plain-text, Markdown or HTML support document, or import a URL.
4. The API stores a versioned source file and enqueues asynchronous ingestion.
5. The worker extracts text, chunks it, creates local embeddings and stores chunks/vectors in PostgreSQL with pgvector. The document progresses through pending, processing, ready or failed.
6. Create a conversation for a customer and ask a support question.
7. The live RAG pipeline embeds the query, performs tenant-scoped hybrid vector/full-text retrieval, optionally reranks candidates, calls the configured generation model, persists an assistant reply and source citations.
8. If retrieval has insufficient material or generation fails, surface the low-confidence/human-handoff state rather than pretending a confident answer exists.
9. Escalate a conversation to a human, manage tickets, assign agents, change ticket state and add internal ticket notes.
10. Review historical conversations, message citations, customers, documents, team and roles.

This is not a static “chat with PDF” mockup: the repository includes the actual ingestion worker, vector/full-text retrieval, model-provider abstraction, chat persistence and ticket workflows.

## Architecture verified from source

- Frontend: Next.js 15 App Router, React/TypeScript, TanStack Query and Playwright; runs as a standalone Node container.
- Backend: Python 3.12+, FastAPI, SQLAlchemy async, Alembic and PostgreSQL 16 with pgvector.
- Procrastinate uses PostgreSQL as its durable job queue. The API enqueues ingestion jobs and a separate worker executes them. There is no Redis.
- Default generation provider: local Ollama, model llama3.1:8b.
- Default embedding provider: local Sentence Transformers, BAAI/bge-small-en-v1.5, 384 dimensions.
- Default reranking provider: local Sentence Transformers cross-encoder, cross-encoder/ms-marco-MiniLM-L-6-v2; reranking is optional/configurable.
- Optional generation provider: OpenAI-compatible hosted endpoint, configured via HOSTED_AI_API_KEY and HOSTED_AI_BASE_URL. Local embedding/reranking remain the default implementation.
- Access token lifetime defaults to 15 minutes. The refresh token is HttpOnly/Secure in production/SameSite=Strict, stored server-side as a hash, rotated on refresh, and refresh-token reuse revokes the session family.
- Frontend keeps the access token in module memory, not localStorage, and refreshes from the HttpOnly cookie after reload.
- Uploaded files live on persistent local-disk storage, grouped by organization/document/version. Compose has named volumes for PostgreSQL, Ollama model files, uploaded documents and Hugging Face model cache.
- Local Docker Compose starts PostgreSQL, Ollama, a one-shot migration/role initializer, model-pull service, API and worker. Frontend is a separate Docker Compose stack and is not started by the backend compose file.
- There is no production cloud provider dependency required for the default local AI path, but the local language model and embeddings require persistent disk/RAM/CPU or GPU.

## Important findings from source inspection

### Organization isolation and authorization

- Signup creates a new Organization, a User and an active OWNER Membership in one database transaction.
- The API authenticates a bearer JWT into an immutable Actor containing user ID, org ID and role. Service functions take that Actor rather than trusting a raw organization ID from a request.
- Routes that include org_id explicitly check it matches the authenticated actor's org before invoking the service.
- Customers, knowledge sources, documents, document versions, chunks, conversations, messages, citations, tickets, ticket notes and audit records carry or are queried with org_id.
- Vector search and full-text search both join documents and filter by the Actor's organization. Search only includes chunks for documents whose state is ready; chunks from pending/processing/failed documents are excluded.
- Role permissions are stored in system roles seeded by the initialization command. The owner role uses a wildcard; admin/agent/viewer have specific permission lists. Org-custom roles are a documented future extension, not implemented in the inspected version.
- Backend tests explicitly create separate organizations and assert one organization cannot list another's documents, read another's ticket or customer, or use an expired/tampered token. Frontend Playwright opens two separate browser contexts and verifies isolation for documents, conversations, tickets, customers and team members.
- These are useful security foundations for the public demo. Do not create one shared demo organization. Bootstrap an isolated temporary organization and synthetic users per recruiter session.

### Authentication and team access

- Passwords use Argon2id.
- Access JWTs include user ID, organization ID and role. The API refresh cookie is HttpOnly; production adds Secure and SameSite=Strict.
- Refresh tokens are high-entropy random values; only SHA-256 hashes are stored. Each successful refresh rotates the token, and using a previously revoked token revokes all live tokens in its family.
- Logout revokes all refresh sessions for the user and clears the cookie.
- Registration, login and password-reset requests have per-process rate limiters. Document uploads, RAG questions and ticket writes are also rate-limited by actor ID.
- The frontend keeps the access token in memory and sends credentials for refresh-cookie handling. It does not write the access token to localStorage.
- Team invitations create a pending membership and a single-use hashed ActionToken; the authenticated owner/admin can retrieve the invite link in the management UI and share it. The acceptance flow sets a real password and activates the membership.
- Password reset currently has a delivery blocker: the backend creates a one-hour single-use token and stores its hash, but the README/service comment explicitly says no real email provider is wired. The raw reset token is logged in server-side development logs, not sent by email or returned to the public API. This is not a production-usable reset delivery flow and must not be represented as one. For recruiter mode, bootstrap accounts without needing password reset, and avoid logging tokens.
- The app's cookie/session behavior is well suited to a same-site reverse-proxy deployment. Frontend and API origins must be configured consistently.

### Document ingestion is a true background pipeline

- Supported source formats are plain text, Markdown, HTML and PDF.
- The backend detects the actual MIME type using python-magic, rather than trusting the browser's Content-Type or filename extension alone. If libmagic is unavailable, the current helper falls back to a conservative extension-based guess; production images should include and test libmagic.
- Upload size defaults to 25 MB. The API route reads the complete UploadFile into memory before knowledge_service checks the byte limit. Enforce a hard request-body cap at the reverse proxy and a bounded streaming read to avoid buffering arbitrarily large requests.
- Files are stored below an organization/document/version UUID-based path; only a safe extension is retained. The file abstraction resolves paths under the configured root to prevent traversal. Re-upload creates a new immutable version rather than overwriting the previous version's bytes.
- PDF extraction uses pypdf; HTML extraction removes script/style tags and extracts text. Extraction failures are recorded on the document version/status path.
- Chunking is structure-aware: it splits at headings/paragraphs, has an 800-token default chunk ceiling and overlap for oversized sections.
- upload_document saves the source and enqueues a Procrastinate task; it does not block the request while extraction/embedding runs.
- The ingestion worker reads the versioned source, extracts text, chunks it, embeds chunks, writes pgvector rows and marks document state ready. Failures are recorded and re-raised so the task retry policy (three retries) can handle transient problems.
- The default local embedding model is loaded lazily and cached. Initial model download/cache and inference are CPU work; embedding runs in a worker thread so a cold model load does not block the FastAPI event loop.

### URL ingestion has meaningful SSRF protections, with one explicit residual risk

- URL import is authenticated, requires the knowledge:manage permission and shares the document-upload rate limit.
- Only HTTP/HTTPS is accepted; hostname DNS resolution is checked; any private, loopback, link-local, reserved, multicast or unspecified answer is rejected.
- HTTPX automatic redirect following is disabled. The code manually follows at most three redirects and re-validates each redirect destination before requesting it.
- The response body is streamed and capped at the configured 25 MB maximum.
- The URL-fetch module explicitly documents its residual DNS-rebinding/TOCTOU risk: it resolves and checks the hostname, then the HTTP client separately resolves/opens the connection. A malicious DNS answer can theoretically change between validation and connect. Fully closing it requires pinning the resolved IP to the socket while preserving Host/SNI, or an egress proxy.
- Do not expose arbitrary URL import to public demo sessions until this gap is closed or the demo restricts URL fetch to a fixed, backend-enforced allowlist of portfolio-owned fixtures. The frontend alone is not a security boundary.

### RAG answering is grounded and citation-aware, but not infallible

- The answer pipeline checks the conversation belongs to the authenticated organization before saving a customer message.
- It builds the retrieval query from the current question plus up to three recent customer turns. Previous AI answers are deliberately excluded from the retrieval query to avoid feeding potentially wrong model responses back into retrieval.
- Query embedding uses the configured embedding provider.
- Hybrid retrieval combines pgvector cosine similarity and PostgreSQL full-text search, then combines rankings with reciprocal-rank fusion (RRF).
- The reranker takes the candidate pool and selects the configured top N (default five). If the reranker fails or returns an unexpected score count, the system falls back to the original retrieval order rather than failing the entire answer.
- Retrieved material is explicitly labeled as untrusted reference data in the system prompt, with instructions not to obey instructions embedded in documents. The source is clear that prompt-based protection is not airtight and a separate output moderation pass remains future work.
- The prompt instructs the model to answer only from reference material, say plainly when there is not enough information and suggest human handoff; it should not invent information.
- The returned API response includes the answer, citations and low_confidence signal. Each citation refers to persisted source chunks and is attached to the assistant message in PostgreSQL.
- If embeddings fail, the implementation proceeds with no ranked chunks and marks the answer low-confidence. If generation fails, it stores a clear human-handoff/unavailable message and marks low-confidence.
- The system still calls the generation model when no chunks were found, but the system prompt says no relevant material was found. The UI displays a warning for low-confidence answers. A recruiter demo must preserve this warning and show no-citation/low-confidence cases rather than quietly presenting them as verified answers.
- Conversations and message/citation history are stored by organization. The frontend E2E includes a real upload → background ingestion → local LLM question → cited answer journey and a separate low-confidence warning case.

### AI provider and resource-cost constraints

- The default runtime is local Ollama using llama3.1:8b; the README says the model download is about 4.9 GB.
- A warm CPU answer has been measured around 12 seconds, while a cold call after an Ollama restart has been measured around 295 seconds while loading the model. These are project documentation measurements, not a guarantee of demo latency; cold/warm status must be shown honestly.
- Default embedding weights and the cross-encoder reranker also need local model cache/storage. The Hugging Face cache is a persistent Docker volume.
- The optional hosted OpenAI-compatible adapter sends the system prompt, user question and retrieved reference text to the configured hosted endpoint. If enabled for the demo, explicitly disclose the provider and bound request/token/concurrency budgets. Local Ollama is the default and does not send content to an external generation provider.
- The in-memory rate limiter is per API process. The README warns that multiple API workers/replicas reset independent counters; it must be externalized to Postgres/Redis before horizontal scaling.
- The default Compose stack is a single-host self-hosted runtime with one API process and one worker container; it is not a managed multi-region service. Scale-out requires attention to shared rate limits, Postgres connection pooling, worker concurrency and local Ollama throughput.

### Ticketing and internal notes

- Customers are organization-scoped records, but the inspected API does not include a separate customer login/portal. Conversations and tickets are created/managed through authenticated staff roles.
- Agents can create/manage conversations, escalate them, create/assign/update tickets, and read/write ticket notes subject to permissions.
- Ticket notes are explicitly internal-only; there is no customer-facing notes route. They are visible to organization members with the appropriate ticket permissions.
- A recruiter demo should make this distinction clear: the product demonstrates a staff support workspace and a knowledge-backed assistant, not a self-service external customer portal.

### Data and reset/cleanup implications

- Knowledge documents have versions; chunks reference documents and document versions. Deleting a document cascades chunk rows; local file cleanup is best-effort, so a failed delete can leave an orphaned file.
- Conversation, message, citation, ticket, customer, membership and audit data persist in PostgreSQL. Refresh tokens are stored hashed. Files and model caches live on persistent disk volumes.
- No anonymous demo mode or public demo-session lifecycle exists in the inspected source.
- A recruiter demo requires a temporary user/organization, synthetic customer/document/conversation/ticket records and an expiry/cleanup path. Cleanup must remove the exact temporary organization's DB rows and file directory, revoke all associated refresh-token families/action tokens and delete queued ingestion jobs before dropping or erasing the tenant. Do not share one public knowledge base or one common org.
- Keep the persistent model volumes across sessions; those are application assets, not visitor data. Only clear a specific demo org's uploads and database records.

### Existing verification evidence

- Backend tests cover auth, invite/password-reset token semantics, tenant isolation, RAG conversations/citations, URL ingestion safety, Procrastinate ingestion worker, chunking, reranking, evaluation heuristics, append-only audit behavior and security hardening.
- Frontend Playwright covers authentication, knowledge upload and document detail/deletion, actual answer generation with citations, low-confidence warnings, customer CRUD, conversation history, ticket lifecycle, role gating, team and cross-tenant isolation.
- The main AI answer E2E test uses the actual Ollama llama3.1:8b model on CPU, uploads an FAQ, waits for background ingestion to finish, asks a question and expects the correct “30 days” answer plus a visible citation. Its timeout is 900 seconds to accommodate cold model loading.
- The URL-ingestion tests reject private metadata IP destinations and unsupported schemes; URL-fetch service tests cover private/loopback/reserved address classification. They do not eliminate the documented DNS-rebinding gap.
- The local reranker implementation's own module comment says the real cross-encoder model weights had not been exercised end-to-end in the authoring environment; its orchestration is tested with a stub scorer. This is a verification limitation to resolve on the actual demo host.
- The repository trees inspected here did not include a GitHub Actions workflow. Tests exist and frontend Playwright journeys are substantive, but a current green CI run or a deployed public backend was not verified in this audit.
- The README describes a local Compose setup; no public frontend/API/DB/Ollama deployment was established from the inspected files.

## Recruiter demo experience to build

1. Public intro explains that SupportAI is an internal support-agent workspace and that all organization, customers, tickets and knowledge documents are synthetic.
2. “Enter demo workspace” creates a short-lived organization, owner/agent/viewer identities and synthetic customer/ticket data. Recruiters do not manually register or type a phone/email/password.
3. Seed a small labelled knowledge library with a few short, well-tested FAQ documents; wait for real background ingestion and show pending/processing/ready/failed states and chunk counts.
4. Ask a question with a known answer. Run the actual local embedding → tenant-filtered hybrid retrieval → reranking → Ollama generation path and display source citations with document/version/heading information.
5. Ask an out-of-scope question to show the low-confidence banner/human handoff. Do not present an uncited answer as verified.
6. Show conversation history, escalate the conversation and open a related ticket. Assign the ticket to the synthetic agent, add an internal note and move it through Open/Pending/Resolved/Closed.
7. Open a second role session to show viewer permission restrictions and prove one organization cannot read another's documents, conversations, tickets, customers or team.
8. Permit file uploads only from a small synthetic fixture set and enforce reverse-proxy body caps; do not expose arbitrary URL ingestion in the initial demo. Once DNS pinning/egress defenses are deployed, URL import can be enabled only for a fixed allowlist.
9. Expire the temporary organization and clean its users, memberships, knowledge sources/documents/versions/chunks, customer/conversation/message/citation/ticket/note, audit/action/refresh tokens, queued ingestion jobs and uploaded files. Keep Ollama/HF cache volumes intact.

## Security and engineering gates

Before marking SupportAI demo-ready:
- Add a dedicated DemoSession record with opaque random ID/token hash, user/org linkage, timestamps, expiry and revocation; avoid identifying demo workspaces via an email prefix alone.
- Create one isolated organization per recruiter. Seed synthetic owners/agents/viewers/customers/documents only. Add two-browser tests for every data-bearing route plus background job isolation.
- Preserve HttpOnly refresh cookie, short-lived in-memory access token, hashed rotating refresh token, token-family reuse detection, logout revocation, strict CORS and production HTTPS/Secure/SameSite settings.
- Do not expose password reset as working until a real safe email sink/provider exists. Currently reset tokens are logged in server logs (even though they are not returned in API responses). For demo mode disable the reset action or route it to a private non-relaying capture inbox; never log raw token or expose it in shared logs.
- Add IP/process-shared rate limiting or enforce a single API replica. Bound demo bootstrap/session count, per-session document uploads, questions/minute, concurrent RAG requests, ticket writes, total data rows and Ollama tokens/requests.
- Close URL-ingestion SSRF gap by pinning validated DNS answers to the connection or routing through a hardened egress proxy. Continue rejecting private, loopback, link-local, reserved and metadata targets at each redirect; disable automatic redirects and cap response size. Until then, disable recruiter-entered URLs or backend-allowlist only fixed portfolio-owned fixture hosts.
- Enforce upload size at reverse proxy and with bounded streaming reads before buffering; keep Python-magic in the production image, verify fallback behavior and cap PDF page count/extraction complexity. Use a per-demo persistent file namespace.
- Keep RAG retrieval queries scoped by the actor's org and documents in ready state. Add adversarial tenant tests for vectors, full-text results, citations, conversation IDs and async ingestion jobs.
- Keep model provider honest and explicit. Default to local Ollama if capacity allows; otherwise disclose hosted provider and data sent to it. Keep credentials server-only. Warm the model/reranker cache before offering the demo and show cold/warm/readiness state rather than inventing a low latency.
- Verify actual reranker weights on the deployment host. Keep a clear fallback when reranking fails; do not label heuristic groundedness metrics as factual guarantees or LLM-judge evaluation.
- Keep prompt-injection defenses, citation display and low-confidence/human handoff visible. No real customer/support text or PII may be inserted into the sample workspace.
- Implement a verified cleanup path for all tenant rows, storage files and Procrastinate jobs; prevent worker jobs from continuing to mutate an expired demo organization.
- Deploy frontend, API, PostgreSQL/pgvector, Ollama, init/migration job, ingestion worker, persistent upload storage and model cache on a host with sufficient CPU/RAM/disk/GPU. Verify health, readiness, cookies, HTTPS proxy and model health in a clean browser.
- Run the complete E2E journey on the deployed stack, including true RAG response with citation, low-confidence state, role restrictions, cross-tenant denial and expiry cleanup.

## Current status

**Source audit complete; per-visitor demo organization, real public runtime/model capacity, URL-fetch DNS pinning, reset-email handling, bounded uploads and deployed RAG E2E verification pending.** SupportAI is a strong candidate for a real recruiter playground because its RAG, ingestion, worker, ticketing and tenant isolation are actual backend features, but its large local model and the documented URL DNS-rebinding gap must be solved before public use.
