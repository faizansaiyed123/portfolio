export const runtime = "nodejs";

import { rateLimit } from "../lib/cache.js";
import {
  GithubApiError,
  getChatEvidence,
  type RepoSummary
} from "../lib/github.js";
import {
  GeminiApiError,
  generateGroundedAnswer
} from "../lib/gemini.js";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type NodeRequest = {
  method?: string;
  headers: Record<string, string | string[] | undefined> & {
    get?: undefined;
  };
  body?: unknown;
  socket?: {
    remoteAddress?: string;
  };
};

type NodeResponse = {
  status(code: number): NodeResponse;
  json(data: unknown): NodeResponse;
  setHeader(name: string, value: string | string[]): void;
  end(): void;
};

type FetchLikeRequest = Request;

const DEFAULT_ORIGINS = [
  "https://faizansaiyed123.github.io",
  "http://localhost:8080",
  "http://127.0.0.1:8080"
];

function isFetchRequest(request: unknown): request is FetchLikeRequest {
  return (
    typeof request === "object" &&
    request !== null &&
    "headers" in request &&
    typeof (request as Request).headers?.get === "function"
  );
}

function header(request: NodeRequest | FetchLikeRequest, name: string) {
  if (isFetchRequest(request)) {
    return request.headers.get(name);
  }

  const value = request.headers?.[name.toLowerCase()] ?? request.headers?.[name];
  if (Array.isArray(value)) return value[0] || null;
  return typeof value === "string" ? value : null;
}

function corsHeaders(origin: string | null) {
  // This endpoint is an intentionally public, unauthenticated portfolio API.
  // CORS is browser compatibility here, not an access-control boundary;
  // rate limiting remains the abuse-control mechanism.
  return {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin",
    "Cache-Control": "no-store"
  };
}

function json(
  request: NodeRequest | FetchLikeRequest,
  response: NodeResponse | undefined,
  data: unknown,
  status = 200,
  origin: string | null = null
) {
  const headers = corsHeaders(origin);

  if (response) {
    for (const [name, value] of Object.entries(headers)) {
      response.setHeader(name, value);
    }
    return response.status(status).json(data);
  }

  return Response.json(data, {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...headers
    }
  });
}

function emptyResponse(
  response: NodeResponse | undefined,
  status: number,
  origin: string | null
) {
  const headers = corsHeaders(origin);

  if (response) {
    for (const [name, value] of Object.entries(headers)) {
      response.setHeader(name, value);
    }
    response.status(status).end();
    return;
  }

  return new Response(null, { status, headers });
}

function clientIp(request: NodeRequest | FetchLikeRequest) {
  return (
    header(request, "x-forwarded-for")?.split(",")[0].trim() ||
    header(request, "x-real-ip") ||
    header(request, "x-vercel-forwarded-for") ||
    (!isFetchRequest(request) ? request.socket?.remoteAddress : null) ||
    "unknown"
  );
}

async function requestBody(request: NodeRequest | FetchLikeRequest) {
  if (isFetchRequest(request)) {
    return request.json();
  }

  if (typeof request.body === "string") {
    return JSON.parse(request.body);
  }

  return request.body ?? {};
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
  return (
    /\b(open|link|url|source)\b/.test(value) &&
    /\b(repo|repository|github)\b/.test(value)
  );
}

function isRepositoryNameRequest(question: string) {
  return /\brepository\b|\brepo\b|\bgithub\b/.test(question.toLowerCase());
}

function hasProjectSignal(value: string) {
  return /\b(faizan|portfolio|github|repos?\b|repositories?\b|projects?\b|frameflux|telemetry|nexora|codebase|source code|architecture|api|apis|endpoint|stack|technology|technologies|framework|built|developed|implemented|implementation|features?|frontend|backend|database|worker|queue|security|deployment|deploy|commit|commits|activity|updated|changed|files?|repository tree)\b/i.test(
    value
  );
}

function isConversationalQuestion(question: string, history: ChatMessage[]) {
  const value = question.trim().toLowerCase().replace(/[!?.,]+$/g, "");
  if (!value || value.length > 2_000) return false;

  if (hasProjectSignal(value)) return false;

  const recentContext = history
    .slice(-4)
    .map((message) => message.content)
    .join(" ");

  if (hasProjectSignal(recentContext)) return false;

  return true;
}

export default async function handler(
  request: NodeRequest | FetchLikeRequest,
  response?: NodeResponse
) {
  const origin = header(request, "origin");
  const method = request.method || "GET";

  console.log("[api/chat] request", {
    method,
    origin: origin || "none"
  });

  if (method === "OPTIONS") {
    return emptyResponse(response, 204, origin);
  }

  if (method !== "POST") {
    return json(
      request,
      response,
      { ok: false, code: "METHOD_NOT_ALLOWED", error: "Use POST /api/chat." },
      405,
      origin
    );
  }

  // Upstash provides durable distributed rate limiting when configured.
  // The built-in memory fallback keeps the free deployment usable when it is not.
  const limit = await rateLimit(`ip:${clientIp(request)}`);
  if (!limit.success) {
    const retryAfter = Math.max(
      1,
      Math.ceil((limit.reset - Date.now()) / 1000)
    );

    if (response) {
      for (const [name, value] of Object.entries({
        "Content-Type": "application/json; charset=utf-8",
        "Retry-After": String(retryAfter),
        ...corsHeaders(origin)
      })) {
        response.setHeader(name, value);
      }

      return response.status(429).json({
        ok: false,
        code: "RATE_LIMITED",
        error: "Too many chat requests. Please try again after the current limit resets.",
        retryAfterSeconds: retryAfter
      });
    }

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
    body = await requestBody(request);
  } catch {
    return json(
      request,
      response,
      { ok: false, code: "INVALID_JSON", error: "Request body must be valid JSON." },
      400,
      origin
    );
  }

  const question = typeof body?.message === "string" ? body.message.trim() : "";
  const history = cleanHistory(body?.history);

  if (!question) {
    return json(
      request,
      response,
      { ok: false, code: "EMPTY_MESSAGE", error: "Message is required." },
      400,
      origin
    );
  }

  if (question.length > 2_000) {
    return json(
      request,
      response,
      {
        ok: false,
        code: "MESSAGE_TOO_LONG",
        error: "Message must be 2,000 characters or fewer."
      },
      413,
      origin
    );
  }

  try {
    if (isConversationalQuestion(question, history)) {
      const aiResponse = await generateGroundedAnswer(
        question,
        history,
        {
          kind: "general",
          repositories: [],
          evidence: [],
          featuredRepositories: []
        },
        "conversation"
      );

      return json(
        request,
        response,
        {
          ok: true,
          status: "answer",
          answer: aiResponse.answer,
          model: aiResponse.model,
          kind: "conversation",
          repositories: [],
          sources: [],
          featuredRepositories: [],
          activity: {}
        },
        200,
        origin
      );
    }

    const evidence = await getChatEvidence(question, history);
    const common = evidencePayload(evidence);

    if (evidence.kind === "ambiguous") {
      return json(
        request,
        response,
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
        request,
        response,
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

    const aiResponse =
      isOpenRequest(question) && isRepositoryNameRequest(question)
        ? null
        : await generateGroundedAnswer(question, history, evidence);

    if (aiResponse) {
      return json(
        request,
        response,
        {
          ok: true,
          status: "answer",
          answer: aiResponse.answer,
          model: aiResponse.model,
          ...common
        },
        200,
        origin
      );
    }

    return json(
      request,
      response,
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
          request,
          response,
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
          request,
          response,
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

    if (error instanceof GeminiApiError) {
      if (error.status === 429) {
        return json(
          request,
          response,
          {
            ok: false,
            code: "AI_RATE_LIMIT",
            error: error.message,
            retryAfterSeconds: error.retryAfterSeconds
          },
          503,
          origin
        );
      }

      return json(
        request,
        response,
        {
          ok: false,
          code: "AI_PROVIDER_ERROR",
          error: "The AI service could not complete the request right now."
        },
        503,
        origin
      );
    }

    const message =
      error instanceof Error
        ? error.message
        : "The assistant could not complete the request.";

    return json(
      request,
      response,
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
