import {
  findRepositoriesUsingTechnology,
  getChatEvidence,
  resolveRepositories
} from "../lib/github.ts";

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message);
}

const list = await getChatEvidence("What projects has Faizan built?");
assert(list.kind === "list", "Expected repository list classification.");
assert(
  list.repositories.some((repo) => repo.fullName === "faizansaiyed123/FrameFlux-Backend"),
  "Live discovery did not include FrameFlux-Backend."
);

const latestRepos = await getChatEvidence("latest repos");
assert(latestRepos.kind === "list", "Natural latest-repository query should resolve to a live repository list.");
assert(
  latestRepos.repositories.length > 0,
  "Latest repository query returned no public repositories."
);
assert(
  latestRepos.repositories[0]?.updatedAt >= latestRepos.repositories[latestRepos.repositories.length - 1]?.updatedAt,
  "Repository list should remain ordered by GitHub updated time."
);

const resolution = await resolveRepositories("FrameFlux");
assert(
  resolution.status === "group" || resolution.status === "single",
  "FrameFlux should resolve to a public repository or portfolio repository group."
);
assert(
  resolution.repositories.some((repo) => repo.name === "FrameFlux-Backend"),
  "FrameFlux resolution missing backend repository."
);

const frameflux = await getChatEvidence("Explain FrameFlux.");
assert(
  frameflux.kind === "group" || frameflux.kind === "single",
  "FrameFlux evidence retrieval did not resolve."
);
assert(
  frameflux.repositories.some((repo) => repo.name === "FrameFlux-Backend"),
  "FrameFlux evidence missing backend repository."
);
assert(
  frameflux.evidence.some((item) => item.type === "readme"),
  "FrameFlux evidence missing README."
);
assert(
  frameflux.evidence.some((item) => item.type === "dependency"),
  "FrameFlux evidence missing dependency manifest."
);
assert(
  frameflux.evidence.some((item) => item.type === "source"),
  "FrameFlux evidence missing relevant source code."
);


const architecture = await getChatEvidence(
  "Explain FrameFlux architecture and tell me which APIs it uses."
);
assert(
  architecture.kind === "group",
  "Explicit FrameFlux architecture/API question should resolve the FrameFlux project group."
);
assert(
  architecture.repositories.length === 2 &&
    architecture.repositories.some((repo) => repo.name === "FrameFlux-Frontend") &&
    architecture.repositories.some((repo) => repo.name === "FrameFlux-Backend"),
  "FrameFlux architecture question should include both frontend and backend repositories."
);
assert(
  architecture.evidence.some((item) => item.repository === "faizansaiyed123/FrameFlux-Frontend") &&
    architecture.evidence.some((item) => item.repository === "faizansaiyed123/FrameFlux-Backend"),
  "FrameFlux architecture question should retrieve evidence from both repositories."
);

const followUp = await getChatEvidence(
  "What APIs are used in this project?",
  [{ role: "user", content: "Explain FrameFlux." }]
);
assert(
  followUp.repositories.some((repo) => repo.name === "FrameFlux-Backend"),
  "Follow-up question did not retain the previous repository context."
);

const technology = await findRepositoriesUsingTechnology("Which projects use React?");
assert(technology, "React technology detection did not trigger.");
assert(technology.repositories.length > 0, "React retrieval found no verified repositories.");

const inaccessible = await getChatEvidence("Explain Nexora-backend.");
assert(
  inaccessible.kind === "inaccessible",
  "Private/inaccessible repository handling did not return the protected state."
);

console.log("Live repository retrieval checks passed:", {
  publicDiscovery: true,
  projectResolution: true,
  repositoryEvidence: true,
  followUpContext: true,
  technologyDetection: true,
  inaccessibleRepositoryProtection: true
});
