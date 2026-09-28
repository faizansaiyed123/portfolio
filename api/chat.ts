import { cacheConfigured, rateLimit } from "../lib/cache.js";
import {
  GithubApiError,
  getChatEvidence,
  listPublicRepositories,
  probeRepositoryAccess,
  type RepoSummary
} from "../lib/github.js";
import { generateGroundedAnswer } from "../lib/openai.js";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

const DEFAULT_ORIGINS = [
  "https://faizansaiyed123.github.io",
  "http://localhost:8080",
  "http://127.0.0.1:8080"
];

function allowedOrigins() {
  return new Set(
    (process.env.CORS_ORIGINS || DEFAULT_ORIGINS.join(","))
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean)
  );
}

function corsHeaders(origin: string | null) {
  const origins = allowedOrigins();
  const allowOrigin = origin && origins.has(origin) ? origin : DEFAULT_ORIGINS[0];

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin",
    "Cache-Control": "no-store"
  };
}

function json(data: unknown, status = 200, origin: string | null = null) {
  return Response.json(data, {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...corsHeaders(origin)
    }
  });
}

function clientIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();

  return (
    request.headers.get("x-real-ip") ||
    request.headers.get("x-vercel-forwarded-for") ||
    "unknown"
  );
}

function cleanHistory(value: unknown): ChatMessage[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter((message): message is ChatMessage => {
      return (
        typeof message === "object" &&
        message !== null &&
        (((message as ChatMessage).role === "user") ||
          ((message as ChatMessage).role === "assistant")) &&
        typeof (message as ChatMessage).content === "string"
      );
    })
    .slice(-8)
    .map((message) => ({
      role: message.role,
      content: message.content.trim().slice(0, 4_000)
    }));
}

function publicRepoPayload(repo: RepoSummary) {
  return {
    name: repo.name,
    fullName: repo.fullName,
    description: repo.description,
    language: repo.language,
    stars: repo.stars,
    forks: repo.forks,
    openIssues: repo.openIssues,
    archived: repo.archived,
    defaultBranch: repo.defaultBranch,
    homepage: repo.homepage,
    url: repo.htmlUrl,
    updatedAt: repo.updatedAt,
    pushedAt: repo.pushedAt,
    topics: repo.topics
  };
}

function evidencePayload(evidence: any) {
  return {
    kind: evidence.kind,
    repositories: (evidence.repositories || []).map(publicRepoPayload),
    sources: (evidence.evidence || []).slice(0, 16).map((item: any) => ({
      type: item.type,
      repository: item.repository,
      path: item.path || null,
      title: item.title,
      url: item.url
    })),
    featuredRepositories: evidence.featuredRepositories || [],
    activity: evidence.activity || {}
  };
}

function isOpenRequest(question: string) {
  const value = question.toLowerCase();
  return /\b(open|link|url|source)\b/.test(value) &&
    /\b(repo|repository|github)\b/.test(value);
}

function isRepositoryNameRequest(question: string) {
  return /\brepository\b|\brepo\b|\bgithub\b/.test(question.toLowerCase());
}

async function handlePrivateHint(question: string) {
  const match = question.match(/\b[A-Za-z0-9][A-Za-z0-9._-]{2,}-[A-Za-z0-9._-]{2,}\b/);
  if (!match) return null;

  return probeRepositoryAccess(match[0]);
}

export default {
  async fetch(request: Request) {
    const origin = request.headers.get("origin");

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(origin)
      });
    }

    if (request.method !== "POST") {
      return json(
        { ok: false, code: "METHOD_NOT_ALLOWED", error: "Use POST /api/chat." },
        405,
        origin
      );
    }

    if (origin && !allowedOrigins().has(origin)) {
      return json(
        { ok: false, code: "ORIGIN_NOT_ALLOWED", error: "This client origin is not allowed." },
        403,
        origin
      );
    }

    if (process.env.VERCEL_ENV === "production" && !cacheConfigured()) {
      return json(
        {
          ok: false,
          code: "CACHE_NOT_CONFIGURED",
          error: "The production chat service requires its rate-limit/cache store."
        },
        503,
        origin
      );
    }

    const limit = await rateLimit(`ip:${clientIp(request)}`);
    if (!limit.success) {
      const retryAfter = Math.max(
        1,
        Math.ceil((limit.reset - Date.now()) / 1000)
      );

      return new Response(
        JSON.stringify({
          ok: false,
          code: "RATE_LIMITED",
          error: "Too many chat requests. Please try again after the current limit resets.",
          retryAfterSeconds: retryAfter
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Retry-After": String(retryAfter),
            ...corsHeaders(origin)
          }
        }
      );
    }

    let body: any;
    try {
      body = await request.json();
    } catch {
      return json(
        { ok: false, code: "INVALID_JSON", error: "Request body must be valid JSON." },
        400,
        origin
      );
    }

    const question = typeof body?.message === "string" ? body.message.trim() : "";
    const history = cleanHistory(body?.history);

    if (!question) {
      return json(
        { ok: false, code: "EMPTY_MESSAGE", error: "Message is required." },
        400,
        origin
      );
    }

    if (question.length > 2_000) {
      return json(
        { ok: false, code: "MESSAGE_TOO_LONG", error: "Message must be 2,000 characters or fewer." },
        413,
        origin
      );
    }

    try {
      const evidence = await getChatEvidence(question, history);
      const common = evidencePayload(evidence);

      if (evidence.kind === "ambiguous") {
        return json(
          {
            ok: true,
            status: "ambiguous",
            message:
              "I found several public repositories that could match that request. Choose the one you mean.",
            ...common
          },
          200,
          origin
        );
      }

      if (evidence.kind === "inaccessible") {
        return json(
          {
            ok: true,
            status: "inaccessible",
            message:
              "I found a repository name that appears to refer to a non-public or inaccessible repository. Its source is intentionally not exposed through this public assistant.",
            ...common
          },
          200,
          origin
        );
      }

      const response = isOpenRequest(question) && isRepositoryNameRequest(question)
        ? null
        : await generateGroundedAnswer(question, history, evidence);

      if (response) {
        return json(
          {
            ok: true,
            status: "answer",
            answer: response.answer,
            model: response.model,
            ...common
          },
          200,
          origin
        );
      }

      return json(
        {
          ok: true,
          status: "links",
          answer:
            "Here are the public repository links I could verify for that request.",
          ...common
        },
        200,
        origin
      );
    } catch (error) {
      if (error instanceof GithubApiError) {
        if (error.status === 403 || error.status === 429) {
          return json(
            {
              ok: false,
              code: "GITHUB_RATE_LIMIT",
              error:
                "GitHub temporarily limited repository access. Please retry after the limit resets.",
              retryAfterSeconds: error.retryAfterSeconds
            },
            503,
            origin
          );
        }

        if (error.status === 404) {
          return json(
            {
              ok: true,
              status: "inaccessible",
              message:
                "That repository could not be verified as an accessible public repository, so I will not guess about its contents."
            },
            200,
            origin
          );
        }
      }

      const message =
        error instanceof Error ? error.message : "The assistant could not complete the request.";

      return json(
        {
          ok: false,
          code: "CHAT_UNAVAILABLE",
          error: message
        },
        502,
        origin
      );
    }
  }
};
