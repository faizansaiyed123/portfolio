import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const readJson = (path) => JSON.parse(readFileSync(resolve(root, path), "utf8"));
const fail = (message) => {
  console.error("Portfolio validation failed: " + message);
  process.exitCode = 1;
};
const assert = (condition, message) => { if (!condition) fail(message); };

const projectsData = readJson("data/projects.json");
const activity = readJson("data/activity.json");
const releases = readJson("data/release-credits.json");
const projects = projectsData.projects;

assert(projectsData.schemaVersion === 1, "projects schemaVersion must be 1");
assert(Array.isArray(projects) && projects.length === 17, "expected exactly 17 personal projects");
assert(new Set(projects.map((p) => p.id)).size === projects.length, "project ids must be unique");

for (const project of projects) {
  assert(/^[a-z0-9-]{1,64}$/.test(project.id), "invalid project id: " + project.id);
  assert(project.name && project.oneLiner && project.overview, "missing project copy: " + project.id);
  assert(Array.isArray(project.workflow) && project.workflow.length === 4, "expected four workflow stages: " + project.id);
  assert(Array.isArray(project.features) && project.features.length > 0, "missing feature list: " + project.id);
  assert(Array.isArray(project.stack) && project.stack.length > 0, "missing stack: " + project.id);
  assert(project.runtimeType && project.runtimeDetail, "missing demo isolation description: " + project.id);
  assert(project.demoStatus === "ready" ? /^https:\/\//.test(project.demoUrl || "") : true, "ready demo requires HTTPS demoUrl: " + project.id);
  assert(project.demoStatus !== "ready" || project.demoVerifiedAt, "ready demo requires verification date: " + project.id);
  assert(project.auditPath && existsSync(resolve(root, project.auditPath)), "missing source audit: " + project.id);
  assert(project.previewImage && existsSync(resolve(root, project.previewImage)), "missing preview asset: " + project.id);
}

assert(activity.schemaVersion === 1, "activity schemaVersion must be 1");
assert(Array.isArray(activity.items) && activity.total === activity.items.length, "activity total must match items");
assert(new Set(activity.items.map((item) => item.url)).size === activity.items.length, "duplicate PR URLs");
for (const item of activity.items) {
  assert(/^https:\/\/github\.com\//.test(item.url || ""), "invalid PR URL");
  assert(item.repository && Number.isInteger(item.number), "PR is missing repository or number");
  assert(item.mergedAt && !Number.isNaN(Date.parse(item.mergedAt)), "invalid merge date");
}

assert(releases.schemaVersion === 1, "release schemaVersion must be 1");
assert(Array.isArray(releases.items) && releases.verifiedCount === releases.items.length, "release count must match items");
for (const item of releases.items) {
  assert(/^https:\/\/github\.com\//.test(item.release || ""), "invalid official release link");
  assert(/^https:\/\/github\.com\//.test(item.pullRequest || ""), "invalid merged PR link");
  assert(item.verification && item.version && item.releaseDate, "release credit missing verification metadata");
  assert(["stable", "prerelease"].includes(item.channel || "stable"), "unknown release channel");
}

for (const path of ["index.html", "script.js", "style.css", "project-lab.html", "project-lab.js", "project-lab.css"]) {
  assert(existsSync(resolve(root, path)), "missing portfolio entrypoint asset: " + path);
}

if (process.exitCode) process.exit(process.exitCode);
console.log("Portfolio data validation passed: 17 projects, " + activity.items.length + " external merged PRs, " + releases.items.length + " release credits.");
