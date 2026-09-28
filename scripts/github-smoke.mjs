const api = "https://api.github.com";
const headers = {
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2026-03-10",
  "User-Agent": "faizan-portfolio-live-chat-smoke"
};

async function get(path) {
  const response = await fetch(api + path, { headers });
  return { response, data: await response.json().catch(() => null) };
}

const portfolio = await get("/repos/faizansaiyed123/portfolio");
if (!portfolio.response.ok || portfolio.data?.name !== "portfolio") {
  throw new Error("Public portfolio repository could not be verified.");
}

const repos = await get("/users/faizansaiyed123/repos?per_page=100&type=owner");
if (!repos.response.ok || !Array.isArray(repos.data) || !repos.data.some((repo) => repo.name === "FrameFlux-Backend")) {
  throw new Error("Live repository discovery did not expose FrameFlux-Backend.");
}

const frameflux = await get("/repos/faizansaiyed123/FrameFlux-Backend/readme");
if (!frameflux.response.ok || typeof frameflux.data?.content !== "string") {
  throw new Error("README retrieval for FrameFlux-Backend failed.");
}

const languages = await get("/repos/faizansaiyed123/FrameFlux-Backend/languages");
if (!languages.response.ok || typeof languages.data !== "object") {
  throw new Error("Language retrieval for FrameFlux-Backend failed.");
}

const tree = await get("/repos/faizansaiyed123/FrameFlux-Backend/git/trees/main?recursive=1");
if (!tree.response.ok || !Array.isArray(tree.data?.tree)) {
  throw new Error("Repository tree retrieval for FrameFlux-Backend failed.");
}

const privateRepo = await get("/repos/faizansaiyed123/Nexora-backend");
if (privateRepo.response.status !== 404) {
  throw new Error(
    `Expected the private repository to be inaccessible without authentication; got HTTP ${privateRepo.response.status}.`
  );
}

console.log("GitHub smoke checks passed:", {
  publicRepositoryDiscovery: true,
  readmeRetrieval: true,
  languageRetrieval: true,
  treeRetrieval: true,
  privateRepositoryProtection: true
});
