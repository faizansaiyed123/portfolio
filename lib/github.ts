import { cacheGet, cacheSet } from "./cache.js";

const OWNER = process.env.GITHUB_OWNER || "faizansaiyed123";
const PORTFOLIO_REPO = process.env.PORTFOLIO_REPO || `${OWNER}/portfolio`;
const GITHUB_API = "https://api.github.com";
const GITHUB_VERSION = "2026-03-10";

export type RepoSummary = {
  fullName: string;
  name: string;
  description: string | null;
  language: string | null;
  stars: number;
  forks: number;
  openIssues: number;
  archived: boolean;
  defaultBranch: string;
  homepage: string | null;
  htmlUrl: string;
  updatedAt: string;
  pushedAt: string;
  topics: string[];
};

export type RepoDetails = RepoSummary & {
  license: string | null;
  visibility: string;
  sizeKb: number;
  watchers: number;
};

export type EvidenceItem = {
  type: "repository" | "readme" | "languages" | "tree" | "dependency" | "source" | "activity";
  repository: string;
  path?: string;
  title: string;
  url: string;
  content: string;
};

export type ActivityItem = {
  sha: string;
  message: string;
  date: string;
  url: string;
};

export type RepositoryEvidence = {
  repositories: RepoDetails[];
  evidence: EvidenceItem[];
  activity: Record<string, ActivityItem[]>;
  featuredRepositories: string[];
  truncatedTrees: string[];
};

export class GithubApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly retryAfterSeconds?: number
  ) {
    super(message);
    this.name = "GithubApiError";
  }
}

async function githubRequest<T>(path: string): Promise<T> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": GITHUB_VERSION,
    "User-Agent": "faizan-portfolio-live-chat"
  };

  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  const response = await fetch(`${GITHUB_API}${path}`, {
    headers,
    signal: AbortSignal.timeout(12000)
  });

  if (!response.ok) {
    const resetHeader = response.headers.get("x-ratelimit-reset");
    const retryHeader = response.headers.get("retry-after");
    const retryAfter =
      retryHeader && Number.isFinite(Number(retryHeader))
        ? Number(retryHeader)
        : resetHeader
          ? Math.max(1, Number(resetHeader) - Math.floor(Date.now() / 1000))
          : undefined;

    let message = `GitHub returned HTTP ${response.status}.`;
    try {
      const body = await response.json() as { message?: string };
      if (body.message) message = body.message;
    } catch {
      // Keep the generic message.
    }

    throw new GithubApiError(message, response.status, retryAfter);
  }

  return response.json() as Promise<T>;
}

function encodePath(path: string) {
  return path.split("/").map(encodeURIComponent).join("/");
}

function decodeGithubContent(content: string) {
  return Buffer.from(content.replace(/\s/g, ""), "base64").toString("utf8");
}

async function cachedJson<T>(key: string, loader: () => Promise<T>, ttlSeconds: number) {
  const cached = await cacheGet<T>(key);
  if (cached !== null) return cached;

  const value = await loader();
  await cacheSet(key, value, ttlSeconds);
  return value;
}

export async function listPublicRepositories(): Promise<RepoSummary[]> {
  return cachedJson(
    `github:public-repos:${OWNER}`,
    async () => {
      const results: RepoSummary[] = [];
      let page = 1;

      while (page <= 5) {
        const data = await githubRequest<Array<any>>(
          `/users/${encodeURIComponent(OWNER)}/repos?per_page=100&page=${page}&sort=updated&direction=desc&type=owner`
        );

        for (const repo of data) {
          if (repo.private) continue;

          results.push({
            fullName: repo.full_name,
            name: repo.name,
            description: repo.description ?? null,
            language: repo.language ?? null,
            stars: Number(repo.stargazers_count || 0),
            forks: Number(repo.forks_count || 0),
            openIssues: Number(repo.open_issues_count || 0),
            archived: Boolean(repo.archived),
            defaultBranch: repo.default_branch || "main",
            homepage: repo.homepage || null,
            htmlUrl: repo.html_url,
            updatedAt: repo.updated_at,
            pushedAt: repo.pushed_at,
            topics: Array.isArray(repo.topics) ? repo.topics : []
          });
        }

        if (data.length < 100) break;
        page += 1;
      }

      return results;
    },
    600
  );
}

async function getRawRepository(fullName: string): Promise<any> {
  const [repoOwner, repoName] = fullName.split("/");
  if (!repoOwner || !repoName || repoOwner.toLowerCase() !== OWNER.toLowerCase()) {
    throw new GithubApiError("Repository is outside the configured portfolio owner.", 400);
  }

  return githubRequest<any>(`/repos/${encodeURIComponent(repoOwner)}/${encodeURIComponent(repoName)}`);
}

export async function getRepositoryDetails(fullName: string): Promise<RepoDetails> {
  const publicRepo = (await listPublicRepositories()).find(
    (repo) => repo.fullName.toLowerCase() === fullName.toLowerCase()
  );

  if (!publicRepo) {
    const raw = await getRawRepository(fullName);

    if (raw.private || raw.visibility !== "public") {
      throw new GithubApiError(
        "This repository is private and is not exposed through the public portfolio assistant.",
        403
      );
    }

    throw new GithubApiError("This repository is not in the public repository set.", 404);
  }

  return cachedJson(
    `github:repo:${publicRepo.fullName}`,
    async () => {
      const raw = await getRawRepository(publicRepo.fullName);
      return {
        ...publicRepo,
        license: raw.license?.spdx_id || null,
        visibility: raw.visibility || "public",
        sizeKb: Number(raw.size || 0),
        watchers: Number(raw.watchers_count || 0)
      };
    },
    900
  );
}

export async function getReadme(fullName: string, branch?: string): Promise<{ content: string; url: string }> {
  const ref = branch ? `:${branch}` : "";
  return cachedJson(
    `github:readme:${fullName}${ref}`,
    async () => {
      try {
        const data = await githubRequest<any>(
          `/repos/${encodeURIComponent(OWNER)}/${encodeURIComponent(fullName.split("/")[1])}/readme${branch ? `?ref=${encodeURIComponent(branch)}` : ""}`
        );
        return {
          content: decodeGithubContent(data.content || ""),
          url: data.html_url || `https://github.com/${fullName}#readme`
        };
      } catch (error) {
        if (error instanceof GithubApiError && error.status === 404) {
          return {
            content: "",
            url: `https://github.com/${fullName}#readme`
          };
        }
        throw error;
      }
    },
    1800
  );
}

export async function getLanguages(fullName: string): Promise<Record<string, number>> {
  return cachedJson(
    `github:languages:${fullName}`,
    () => githubRequest<Record<string, number>>(
      `/repos/${encodeURIComponent(OWNER)}/${encodeURIComponent(fullName.split("/")[1])}/languages`
    ),
    1800
  );
}

type TreeNode = {
  path: string;
  mode: string;
  type: string;
  sha: string;
  size?: number;
  url: string;
};

export async function getRepositoryTree(
  fullName: string,
  branch: string
): Promise<{ tree: TreeNode[]; truncated: boolean; url: string }> {
  return cachedJson(
    `github:tree:${fullName}:${branch}`,
    async () => {
      const data = await githubRequest<any>(
        `/repos/${encodeURIComponent(OWNER)}/${encodeURIComponent(fullName.split("/")[1])}/git/trees/${encodeURIComponent(branch)}?recursive=1`
      );

      const tree = Array.isArray(data.tree)
        ? data.tree.filter((item: TreeNode) => item.type === "blob")
        : [];

      return {
        tree,
        truncated: Boolean(data.truncated),
        url: `https://github.com/${fullName}/tree/${encodeURIComponent(branch)}`
      };
    },
    1800
  );
}

export async function getFile(fullName: string, path: string, branch: string): Promise<{ content: string; url: string }> {
  const safePath = encodePath(path);

  return cachedJson(
    `github:file:${fullName}:${branch}:${path}`,
    async () => {
      const data = await githubRequest<any>(
        `/repos/${encodeURIComponent(OWNER)}/${encodeURIComponent(fullName.split("/")[1])}/contents/${safePath}?ref=${encodeURIComponent(branch)}`
      );

      if (data.type !== "file" || typeof data.content !== "string") {
        throw new GithubApiError("Requested repository path is not a text file.", 422);
      }

      const content = decodeGithubContent(data.content);
      if (content.length > 160_000) {
        return {
          content: content.slice(0, 160_000) + "\n...[file truncated by retrieval guard]...",
          url: data.html_url || `https://github.com/${fullName}/blob/${branch}/${path}`
        };
      }

      return {
        content,
        url: data.html_url || `https://github.com/${fullName}/blob/${branch}/${path}`
      };
    },
    1800
  );
}

export async function getRecentActivity(fullName: string): Promise<ActivityItem[]> {
  return cachedJson(
    `github:activity:${fullName}`,
    async () => {
      const data = await githubRequest<Array<any>>(
        `/repos/${encodeURIComponent(OWNER)}/${encodeURIComponent(fullName.split("/")[1])}/commits?per_page=5`
      );

      return data.map((commit) => ({
        sha: commit.sha,
        message: String(commit.commit?.message || "").split("\n")[0],
        date: commit.commit?.author?.date || commit.commit?.committer?.date || "",
        url: commit.html_url
      }));
    },
    300
  );
}

async function getPortfolioFeaturedRepositories() {
  return cachedJson(
    `portfolio:featured:v2:${PORTFOLIO_REPO}`,
    async () => {
      const details = await getRepositoryDetails(PORTFOLIO_REPO);
      const sources = await Promise.allSettled([
        getFile(PORTFOLIO_REPO, "index.html", details.defaultBranch),
        getReadme(PORTFOLIO_REPO, details.defaultBranch)
      ]);

      const content = sources
        .filter((result): result is PromiseFulfilledResult<{ content: string }> => result.status === "fulfilled")
        .map((result) => result.value.content)
        .find((value) => value.trim()) || "";

      const matches = [
        ...content.matchAll(/https:\/\/github\.com\/([A-Za-z0-9._-]+)\/([A-Za-z0-9._-]+)/g)
      ];

      return [...new Set(matches.map((match) => `${match[1]}/${match[2]}`))];
    },
    1800
  );
}

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function compact(value: string) {
  return normalize(value).replace(/\s+/g, "");
}

function queryMentionsAny(query: string, values: string[]) {
  const normalized = normalize(query);
  return values.some((value) => normalized.includes(normalize(value)));
}

function scoreRepository(query: string, repo: RepoSummary, featured: Set<string>) {
  const q = normalize(query);
  const qTokens = q.split(/\s+/).filter((token) => token.length > 1);
  const name = normalize(repo.name);
  const description = normalize(repo.description || "");
  let score = 0;

  if (q === name) score += 1000;
  if (q.includes(name)) score += 420;
  if (name.includes(q) && q.length >= 4) score += 300;

  for (const token of qTokens) {
    if (name.includes(token)) score += 90;
    if (description.includes(token)) score += 35;
    if (repo.topics.some((topic) => normalize(topic).includes(token))) score += 55;
  }

  if (repo.language && q.includes(normalize(repo.language))) score += 40;
  if (featured.has(repo.fullName)) score += 30;

  return score;
}

function commonProjectStem(repos: RepoSummary[]) {
  if (repos.length < 2) return null;

  const firstTokens = repos.map((repo) => normalize(repo.name).split(/\s+/)[0]);
  if (firstTokens.every((token) => token === firstTokens[0]) && firstTokens[0].length >= 4) {
    return firstTokens[0];
  }

  const compactNames = repos.map((repo) => compact(repo.name));
  let prefix = compactNames[0];
  for (const name of compactNames.slice(1)) {
    let i = 0;
    while (i < prefix.length && i < name.length && prefix[i] === name[i]) i += 1;
    prefix = prefix.slice(0, i);
  }

  return prefix.length >= 5 ? prefix : null;
}

export type RepositoryResolution =
  | { status: "none"; candidates: RepoSummary[]; privateHint?: boolean; protectedHint?: boolean }
  | { status: "single"; repositories: RepoSummary[] }
  | { status: "group"; repositories: RepoSummary[]; stem: string }
  | { status: "ambiguous"; repositories: RepoSummary[] };

export async function resolveRepositories(query: string): Promise<RepositoryResolution> {
  const [repos, featured] = await Promise.all([
    listPublicRepositories(),
    getPortfolioFeaturedRepositories()
  ]);
  const featuredSet = new Set(featured.map((value) => value.toLowerCase()));

  // Resolve a portfolio project group from the live links in the portfolio README.
  // This prevents ordinary conversational words from overpowering an explicit
  // project name such as "FrameFlux" or "Telemetry".
  const featuredGroups = new Map<string, RepoSummary[]>();
  for (const fullName of featured) {
    const repo = repos.find((item) => item.fullName.toLowerCase() === fullName.toLowerCase());
    if (!repo) continue;
    const stem = normalize(repo.name).split(/\s+/)[0];
    if (!stem || stem.length < 4) continue;
    const group = featuredGroups.get(stem) || [];
    group.push(repo);
    featuredGroups.set(stem, group);
  }

  const normalizedQuery = normalize(query);

  // Resolve explicit multi-repository project names before fuzzy scoring.
  // Projects such as FrameFlux and Telemetry are split into frontend/backend
  // repositories, but the project name itself is unambiguous.
  const explicitProjectGroups = new Map<string, RepoSummary[]>();
  for (const repo of repos) {
    const normalizedName = normalize(repo.name);
    const match = normalizedName.match(/^([a-z0-9]+)\s+(?:frontend|backend)$/);
    if (!match) continue;
    const stem = match[1];
    const group = explicitProjectGroups.get(stem) || [];
    group.push(repo);
    explicitProjectGroups.set(stem, group);
  }

  for (const [stem, group] of explicitProjectGroups) {
    if (group.length >= 2 && normalizedQuery.includes(stem)) {
      return { status: "group", repositories: group.slice(0, 4), stem };
    }
  }

  for (const [stem, group] of featuredGroups) {
    if (group.length >= 2 && normalizedQuery.includes(stem)) {
      return { status: "group", repositories: group.slice(0, 4), stem };
    }
  }

  // Check an explicitly named repository before fuzzy scoring, so generic
  // tokens such as "backend" cannot mask a private/inaccessible exact match.
  const explicitRepositoryMatch = query.match(/([A-Za-z0-9][A-Za-z0-9._-]*-[A-Za-z0-9._-]+)/i)?.[1];
  if (explicitRepositoryMatch) {
    const exactPublic = repos.find(
      (repo) => repo.name.toLowerCase() === explicitRepositoryMatch.toLowerCase()
    );

    if (!exactPublic) {
      try {
        const raw = await getRawRepository(`${OWNER}/${explicitRepositoryMatch}`);
        if (raw.private || raw.visibility !== "public") {
          return { status: "none", candidates: [], privateHint: true };
        }
      } catch (error) {
        if (error instanceof GithubApiError && (error.status === 403 || error.status === 404)) {
          return { status: "none", candidates: [], protectedHint: true };
        }
      }
    }
  }

  const scored = repos
    .map((repo) => ({ repo, score: scoreRepository(query, repo, featuredSet) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);

  if (!scored.length) {
    const explicitMatch = query.match(/([A-Za-z0-9][A-Za-z0-9._-]*-[A-Za-z0-9._-]+)/i)?.[1];
    const stopWords = new Set([
      "explain", "tell", "show", "open", "what", "which", "about", "project",
      "repository", "repo", "github", "use", "using", "built", "does", "the"
    ]);
    const strippedTokens = query
      .split(/\s+/)
      .map((token) => token.replace(/[^a-z0-9]/gi, ""))
      .filter((token) => token.length >= 3 && !stopWords.has(token));
    const guessedName =
      explicitMatch?.[1] ||
      (strippedTokens.length >= 2 && strippedTokens.length <= 3
        ? strippedTokens.join("-")
        : null);

    if (guessedName) {
      const guess = `${OWNER}/${guessedName}`;
      try {
        const raw = await getRawRepository(guess);
        if (raw.private || raw.visibility !== "public") {
          return { status: "none", candidates: [], privateHint: true };
        }
      } catch (error) {
        if (error instanceof GithubApiError && (error.status === 403 || error.status === 404)) {
          return { status: "none", candidates: [], protectedHint: true };
        }
      }
    }

    return { status: "none", candidates: [] };
  }

  const topScore = scored[0].score;
  const candidates = scored
    .filter((entry) => entry.score >= Math.max(70, topScore * 0.58))
    .slice(0, 6)
    .map((entry) => entry.repo);

  if (candidates.length === 1) return { status: "single", repositories: candidates };

  const stem = commonProjectStem(candidates.slice(0, 4));
  const featuredCandidates = candidates.filter((repo) => featuredSet.has(repo.fullName.toLowerCase()));

  if (stem && featuredCandidates.length >= 2) {
    return { status: "group", repositories: featuredCandidates.slice(0, 4), stem };
  }

  // An explicit project name shared by the top matches means the user is
  // asking about one multi-repository project (for example FrameFlux has a
  // frontend and backend repository), not asking us to choose between them.
  if (
    stem &&
    normalizedQuery.includes(stem) &&
    candidates.length >= 2 &&
    candidates.every((repo) => compact(repo.name).startsWith(stem))
  ) {
    return { status: "group", repositories: candidates.slice(0, 4), stem };
  }

  return { status: "ambiguous", repositories: candidates.slice(0, 5) };
}

const dependencyBasenames = new Set([
  "package.json",
  "pyproject.toml",
  "requirements.txt",
  "requirements-dev.txt",
  "requirements-prod.txt",
  "pipfile",
  "go.mod",
  "cargo.toml",
  "pom.xml",
  "build.gradle",
  "build.gradle.kts",
  "gemfile",
  "composer.json"
]);

const sourceExtensions = new Set([
  ".py", ".js", ".jsx", ".ts", ".tsx", ".go", ".rs", ".java", ".kt",
  ".rb", ".php", ".cs", ".cpp", ".c", ".h", ".swift", ".sql"
]);

function isSourcePath(path: string) {
  const lower = path.toLowerCase();
  if (
    lower.includes("/node_modules/") ||
    lower.includes("/dist/") ||
    lower.includes("/build/") ||
    lower.includes("/coverage/") ||
    lower.includes("/.next/") ||
    lower.includes("/vendor/")
  ) {
    return false;
  }

  const extension = "." + (lower.split(".").pop() || "");
  return sourceExtensions.has(extension);
}

function scoreSourcePath(path: string, question: string) {
  const lower = path.toLowerCase();
  const q = normalize(question);
  let score = 0;

  const structuralTerms =
    /architecture|structure|api|route|router|controller|service|model|schema|database|db|websocket|worker|queue|job|auth|security|component|frontend|backend|integration/;

  if (structuralTerms.test(q)) {
    for (const token of [
      "src/", "app/", "api/", "routes/", "routers/", "controllers/", "services/",
      "models/", "schemas/", "workers/", "jobs/", "components/", "pages/",
      "server", "main", "index", "config", "database", "db"
    ]) {
      if (lower.includes(token)) score += 35;
    }
  }

  for (const token of q.split(/\s+/).filter((value) => value.length >= 3)) {
    if (lower.includes(token)) score += 12;
  }

  if (/react|nextjs|next\.js|frontend|ui|dashboard/.test(q) && /src\/|components\/|pages\/|app\//.test(lower)) {
    score += 45;
  }

  if (/api|endpoint|route|routes/.test(q) && /api|route|router|controller|server/.test(lower)) {
    score += 50;
  }

  if (/architecture|how.*work|flow|works/.test(q) && /main|app|server|service|manager|worker|orchestr/.test(lower)) {
    score += 40;
  }

  if (/test|verification/.test(q) && /test|spec|e2e|playwright/.test(lower)) {
    score += 40;
  }

  return score;
}

async function retrieveRepositoryEvidence(
  repositories: RepoSummary[],
  question: string
): Promise<RepositoryEvidence> {
  const evidence: EvidenceItem[] = [];
  const activity: Record<string, ActivityItem[]> = {};
  const truncatedTrees: string[] = [];
  const featured = await getPortfolioFeaturedRepositories();
  const featuredSet = new Set(featured.map((value) => value.toLowerCase()));

  for (const summary of repositories.slice(0, 4)) {
    const details = await getRepositoryDetails(summary.fullName);
    evidence.push({
      type: "repository",
      repository: summary.fullName,
      title: summary.name,
      url: summary.htmlUrl,
      content: JSON.stringify({
        description: details.description,
        language: details.language,
        stars: details.stars,
        forks: details.forks,
        openIssues: details.openIssues,
        archived: details.archived,
        defaultBranch: details.defaultBranch,
        homepage: details.homepage,
        visibility: details.visibility,
        license: details.license,
        updatedAt: details.updatedAt,
        pushedAt: details.pushedAt,
        watchers: details.watchers,
        featuredInPortfolio: featuredSet.has(summary.fullName.toLowerCase())
      })
    });

    const [readme, languages, tree] = await Promise.all([
      getReadme(summary.fullName, details.defaultBranch),
      getLanguages(summary.fullName),
      getRepositoryTree(summary.fullName, details.defaultBranch)
    ]);

    if (readme.content.trim()) {
      evidence.push({
        type: "readme",
        repository: summary.fullName,
        title: "README.md",
        url: readme.url,
        path: "README.md",
        content: readme.content.slice(0, 60_000)
      });
    }

    evidence.push({
      type: "languages",
      repository: summary.fullName,
      title: "GitHub language breakdown",
      url: summary.htmlUrl,
      content: JSON.stringify(languages)
    });

    const importantPaths = tree.tree
      .map((entry) => entry.path)
      .filter((path) => !path.toLowerCase().endsWith(".lock"))
      .slice(0, 250);

    evidence.push({
      type: "tree",
      repository: summary.fullName,
      title: "Repository tree",
      url: tree.url,
      content: importantPaths.join("\n")
    });

    if (tree.truncated) truncatedTrees.push(summary.fullName);

    const dependencyPaths = tree.tree
      .map((entry) => entry.path)
      .filter((path) => dependencyBasenames.has(path.split("/").pop()?.toLowerCase() || ""))
      .slice(0, 6);

    const dependencyResults = await Promise.all(
      dependencyPaths.map(async (path) => {
        try {
          const file = await getFile(summary.fullName, path, details.defaultBranch);
          return {
            type: "dependency" as const,
            repository: summary.fullName,
            title: path,
            url: file.url,
            path,
            content: file.content.slice(0, 45_000)
          };
        } catch {
          return null;
        }
      })
    );

    evidence.push(...dependencyResults.filter(Boolean) as EvidenceItem[]);

    const sourcePaths = tree.tree
      .map((entry) => entry.path)
      .filter(isSourcePath)
      .map((path) => ({ path, score: scoreSourcePath(path, question) }))
      .sort((a, b) => b.score - a.score)
      .filter((entry, index) => entry.score > 0 || index < 3)
      .slice(0, 8)
      .map((entry) => entry.path);

    const sourceResults = await Promise.all(
      sourcePaths.map(async (path) => {
        try {
          const file = await getFile(summary.fullName, path, details.defaultBranch);
          return {
            type: "source" as const,
            repository: summary.fullName,
            title: path.split("/").pop() || path,
            url: file.url,
            path,
            content: file.content.slice(0, 42_000)
          };
        } catch {
          return null;
        }
      })
    );

    evidence.push(...sourceResults.filter(Boolean) as EvidenceItem[]);

    if (/recent|activity|updated|update|commit|commits|latest|changed|change/.test(normalize(question))) {
      try {
        activity[summary.fullName] = await getRecentActivity(summary.fullName);
        if (activity[summary.fullName]?.length) {
          evidence.push({
            type: "activity",
            repository: summary.fullName,
            title: "Recent commits",
            url: `https://github.com/${summary.fullName}/commits/${details.defaultBranch}`,
            content: JSON.stringify(activity[summary.fullName])
          });
        }
      } catch {
        // Activity is optional evidence.
      }
    }
  }

  let totalChars = 0;
  const boundedEvidence: EvidenceItem[] = [];

  for (const item of evidence) {
    if (totalChars >= 110_000) break;
    const remaining = 110_000 - totalChars;
    const content = item.content.slice(0, remaining);
    boundedEvidence.push({ ...item, content });
    totalChars += content.length;
  }

  return {
    repositories: repositories.slice(0, 4).map((repo) => ({
      ...repo,
      license: null,
      visibility: "public",
      sizeKb: 0,
      watchers: 0
    })),
    evidence: boundedEvidence,
    activity,
    featuredRepositories: featured,
    truncatedTrees
  };
}

const technologyMatchers: Array<{ label: string; patterns: RegExp[]; languages?: string[] }> = [
  { label: "React", patterns: [/\breact\b/i, /@vitejs\/plugin-react/i], languages: ["JavaScript", "TypeScript"] },
  { label: "Next.js", patterns: [/\bnext(?:\.js|js)\b/i, /"next"\s*:/i], languages: ["JavaScript", "TypeScript"] },
  { label: "FastAPI", patterns: [/\bfastapi\b/i], languages: ["Python"] },
  { label: "Flask", patterns: [/\bflask\b/i], languages: ["Python"] },
  { label: "Django", patterns: [/\bdjango\b/i], languages: ["Python"] },
  { label: "TypeScript", patterns: [/\btypescript\b/i], languages: ["TypeScript"] },
  { label: "Tailwind CSS", patterns: [/\btailwind(?:\s+css)?\b/i] },
  { label: "PostgreSQL", patterns: [/postgres(?:ql)?/i, /psycopg/i] },
  { label: "Redis", patterns: [/\bredis\b/i] },
  { label: "Docker", patterns: [/\bdocker(?:file|\s+compose)?\b/i] },
  { label: "WebSockets", patterns: [/websocket|socket\.io/i] },
  { label: "FFmpeg", patterns: [/ffmpeg/i] }
];

function detectTechnology(question: string) {
  return technologyMatchers.find((matcher) =>
    matcher.patterns.some((pattern) => pattern.test(question))
  );
}

export async function findRepositoriesUsingTechnology(question: string) {
  const matcher = detectTechnology(question);
  if (!matcher) return null;

  const repos = await listPublicRepositories();
  const candidates = repos
    .filter((repo) => !matcher.languages || !repo.language || matcher.languages.includes(repo.language))
    .filter((repo) =>
      compact(repo.name).includes(compact(matcher.label)) ||
      repo.topics.some((topic) => compact(topic).includes(compact(matcher.label)))
    )
    .concat(
      repos.filter((repo) => !matcher.languages || matcher.languages.includes(repo.language || ""))
    );

  const unique = [...new Map(candidates.map((repo) => [repo.fullName, repo])).values()].slice(0, 40);
  const matches: Array<RepoSummary & {
    evidencePath?: string;
    evidenceContent?: string;
  }> = [];

  for (let i = 0; i < unique.length; i += 6) {
    const batch = unique.slice(i, i + 6);
    const results = await Promise.all(batch.map(async (repo) => {
      const depNames = [
        "package.json",
        "pyproject.toml",
        "requirements.txt",
        "requirements-dev.txt",
        "Pipfile",
        "go.mod",
        "Cargo.toml"
      ];

      for (const path of depNames) {
        try {
          const file = await getFile(repo.fullName, path, repo.defaultBranch);
          const candidateText = file.content.slice(0, 50_000);

          if (matcher.patterns.some((pattern) => pattern.test(candidateText))) {
            return {
              repo,
              evidencePath: path,
              evidenceContent: candidateText.slice(0, 8_000)
            };
          }
        } catch {
          // Try the next dependency manifest.
        }
      }

      if (repo.name.toLowerCase().includes(matcher.label.toLowerCase().replace(".js", ""))) {
        return {
          repo,
          evidencePath: undefined,
          evidenceContent: "Repository name matched the requested technology."
        };
      }

      return null;
    }));

    for (const result of results) {
      if (result) matches.push({ ...result.repo, evidencePath: result.evidencePath, evidenceContent: result.evidenceContent });
    }
  }

  return {
    technology: matcher.label,
    repositories: [...new Map(matches.map((repo) => [repo.fullName, repo])).values()].slice(0, 20)
  };
}

export async function getChatEvidence(question: string, history: Array<{ role: "user" | "assistant"; content: string }> = []) {
  const normalized = normalize(question);
  const isListQuery = /(?:\b(?:show|list|see|view|display|get|give|find|what|which)\b.*\b(?:repository|repositories|repo|repos|project|projects)\b)|(?:\b(?:latest|recent|newest|current|public)\b.*\b(?:repository|repositories|repo|repos|project|projects)\b)|(?:\b(?:repository|repositories|repo|repos|project|projects)\b.*\b(?:latest|recent|newest|current|public|faizan|my)\b)/.test(normalized);
  const tech = await findRepositoriesUsingTechnology(question);

  if (tech) {
    const sources: EvidenceItem[] = tech.repositories.slice(0, 12).map((repo) => ({
      type: "repository",
      repository: repo.fullName,
      title: repo.name,
      url: repo.htmlUrl,
      content: [
        JSON.stringify({
          description: repo.description,
          language: repo.language,
          stars: repo.stars,
          forks: repo.forks,
          pushedAt: repo.pushedAt
        }),
        repo.evidencePath ? `Verified dependency manifest: ${repo.evidencePath}` : "Repository-name evidence only.",
        repo.evidenceContent || ""
      ].join("\n")
    }));

    return {
      kind: "technology" as const,
      repositories: tech.repositories,
      evidence: sources,
      featuredRepositories: await getPortfolioFeaturedRepositories()
    };
  }

  if (isListQuery) {
    const repos = await listPublicRepositories();
    return {
      kind: "list" as const,
      repositories: repos,
      evidence: repos.slice(0, 40).map((repo) => ({
        type: "repository" as const,
        repository: repo.fullName,
        title: repo.name,
        url: repo.htmlUrl,
        content: JSON.stringify({
          description: repo.description,
          language: repo.language,
          stars: repo.stars,
          forks: repo.forks,
          openIssues: repo.openIssues,
          archived: repo.archived,
          updatedAt: repo.updatedAt,
          pushedAt: repo.pushedAt,
          homepage: repo.homepage
        })
      })),
      featuredRepositories: await getPortfolioFeaturedRepositories()
    };
  }

  let resolution = await resolveRepositories(question);

  if (resolution.status === "none") {
    const previousUserQuestion = [...history]
      .reverse()
      .find((message) => message.role === "user" && message.content.trim());

    if (previousUserQuestion) {
      const contextualResolution = await resolveRepositories(
        `${previousUserQuestion.content} ${question}`
      );

      if (contextualResolution.status !== "none") {
        resolution = contextualResolution;
      }
    }
  }

  if (resolution.status === "ambiguous") {
    return {
      kind: "ambiguous" as const,
      repositories: resolution.repositories,
      featuredRepositories: await getPortfolioFeaturedRepositories()
    };
  }

  if (resolution.status === "none") {
    if (resolution.privateHint || resolution.protectedHint) {
      return {
        kind: "inaccessible" as const,
        repositories: [],
        featuredRepositories: await getPortfolioFeaturedRepositories()
      };
    }

    const featured = await getPortfolioFeaturedRepositories();
    const publicRepos = await listPublicRepositories();
    const featuredRepos = publicRepos.filter((repo) =>
      featured.some((name) => name.toLowerCase() === repo.fullName.toLowerCase())
    );

    const portfolioWideQuery =
      /\b(what did (?:faizan|you) build|what have (?:faizan|you) built|what did you build|what have you built|what have i built|what projects? (?:did|has|have) (?:faizan|you) (?:build|built)|tell me about (?:faizan'?s|your) projects?|what is in (?:faizan'?s|your) portfolio|across (?:the )?(?:portfolio|projects?))\b/i.test(
        normalized
      );

    if (portfolioWideQuery && featuredRepos.length) {
      const detail = await retrieveRepositoryEvidence(featuredRepos.slice(0, 4), question);
      return {
        kind: "portfolio" as const,
        ...detail,
        featuredRepositories: featured
      };
    }

    const fallback = featuredRepos.slice(0, 4);

    return {
      kind: "general" as const,
      repositories: fallback.length ? fallback : publicRepos.slice(0, 8),
      evidence: [],
      featuredRepositories: featured
    };
  }

  const detail = await retrieveRepositoryEvidence(resolution.repositories, question);
  return {
    kind: resolution.status as "single" | "group",
    ...detail
  };
}

export async function probeRepositoryAccess(name: string) {
  const fullName = name.includes("/") ? name : `${OWNER}/${name}`;
  try {
    const raw = await getRawRepository(fullName);
    if (raw.private || raw.visibility !== "public") {
      return { accessible: false, private: true, fullName };
    }
    return { accessible: true, private: false, fullName };
  } catch (error) {
    if (error instanceof GithubApiError && error.status === 404) {
      return { accessible: false, private: false, fullName };
    }
    throw error;
  }
}

export function getOwner() {
  return OWNER;
}
