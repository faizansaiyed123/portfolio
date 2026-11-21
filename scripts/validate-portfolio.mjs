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
const work = readJson("data/work-showcase.json");
const previewStatusPath = resolve(root, "data/homepage-preview-status.json");
const previewStatus = existsSync(previewStatusPath) ? readJson("data/homepage-preview-status.json") : null;
const projects = projectsData.projects;

assert(projectsData.schemaVersion === 1, "projects schemaVersion must be 1");
assert(Array.isArray(projects) && projects.length === 17, "expected exactly 17 personal projects");
assert(new Set(projects.map((p) => p.id)).size === projects.length, "project ids must be unique");
assert(work.schemaVersion === 1, "work showcase schemaVersion must be 1");
assert(Array.isArray(work.clientWork) && work.clientWork.length === 2, "expected two freelance client projects");
assert(Array.isArray(work.internshipWork) && work.internshipWork.length === 1, "expected one internship project");
for (const item of [...work.clientWork, ...work.internshipWork]) {
  assert(item.id && item.name && item.roleLabel && item.description, "work showcase record is incomplete");
  assert(/^https:\/\//.test(item.url || ""), "work showcase URL must use HTTPS: " + item.id);
  assert(item.previewImage && item.previewImage.startsWith("assets/site-previews/") && item.previewImage.endsWith(".webp"), "work showcase needs a homepage screenshot path: " + item.id);
}
if (previewStatus) {
  assert(previewStatus.schemaVersion === 1, "homepage preview manifest schemaVersion must be 1");
  assert(Array.isArray(previewStatus.items) && previewStatus.items.length === 20, "expected 20 homepage screenshots");
  for (const shot of previewStatus.items) {
    if (shot.status === "blocked") {
      assert(!shot.path && shot.error, "blocked screenshot must explain that the homepage is unavailable: " + shot.id);
    } else {
      assert(["captured", "reused-existing"].includes(shot.status), "homepage screenshot failed: " + shot.id + " (" + (shot.error || "unknown error") + ")");
      assert(shot.path && existsSync(resolve(root, shot.path)), "homepage screenshot file is missing: " + shot.id);
    }
  }
  assert(previewStatus.blocked === previewStatus.items.filter((shot) => shot.status === "blocked").length, "homepage screenshot blocked count is inconsistent");
}

const expectedCategoryCounts = {
  "AI and retrieval": 1,
  "AI applications": 1,
  "Business operations": 2,
  "Commerce": 1,
  "Data and analytics": 1,
  "Developer infrastructure": 1,
  "Field service operations": 2,
  "Finance operations": 1,
  "Marketing operations": 1,
  "Media infrastructure": 1,
  "Personal productivity": 1,
  "Price intelligence": 1,
  "Project operations": 1,
  "Realtime observability": 1,
  "Workshop operations": 1
};
const actualCategoryCounts = Object.fromEntries(
  [...projects.reduce((counts, project) => {
    counts.set(project.category, (counts.get(project.category) || 0) + 1);
    return counts;
  }, new Map())].sort(([a], [b]) => a.localeCompare(b))
);
assert(
  JSON.stringify(actualCategoryCounts) === JSON.stringify(expectedCategoryCounts),
  "project categories and counts must match the published 17-project taxonomy"
);

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
  if (project.previewImage) {
    assert(project.previewImage.startsWith("assets/site-previews/") && project.previewImage.endsWith(".webp"), "invalid homepage preview path: " + project.id);
    if (previewStatus) assert(existsSync(resolve(root, project.previewImage)), "missing captured homepage preview: " + project.id);
  } else {
    assert(previewStatus?.items.some((shot) => shot.id === project.id && shot.status === "blocked"), "project without a homepage screenshot needs an explicit blocked record: " + project.id);
  }
}

const frameflux = projects.find((project) => project.id === "frameflux");
const framefluxDemo = frameflux?.demoBuild;
assert(framefluxDemo?.status === "source-tested-not-hosted", "FrameFlux source demo status must be explicit");
assert(frameflux?.demoStatus === "verification-pending" && frameflux.appUrl === null, "FrameFlux must not appear as a hosted live demo");
assert(/^https:\/\/github\.com\/faizansaiyed123\/FrameFlux-Frontend\/tree\/demo$/.test(framefluxDemo?.frontendBranchUrl || ""), "FrameFlux frontend demo branch link is missing");
assert(/^https:\/\/github\.com\/faizansaiyed123\/FrameFlux-Backend\/tree\/demo$/.test(framefluxDemo?.backendBranchUrl || ""), "FrameFlux backend demo branch link is missing");
assert(Number.isInteger(framefluxDemo?.browserTestsPassed) && framefluxDemo.browserTestsPassed === 5, "FrameFlux browser test evidence is missing");
assert(Number.isInteger(framefluxDemo?.backendApiTestsPassed) && framefluxDemo.backendApiTestsPassed === 10, "FrameFlux backend API test evidence is missing");
assert(/^https:\/\/github\.com\/faizansaiyed123\/FrameFlux-Frontend\/actions\/runs\//.test(framefluxDemo?.browserIntegrationWorkflowUrl || ""), "FrameFlux browser integration workflow link is missing");
assert(/^https:\/\/github\.com\/faizansaiyed123\/FrameFlux-Backend\/actions\/runs\//.test(framefluxDemo?.backendApiWorkflowUrl || ""), "FrameFlux backend API workflow link is missing");

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

for (const path of ["index.html", "script.js", "style.css", "portfolio-polish.css", "work-showcase.css", "explorer-showcase.css", "explorer-showcase.js", "data/work-showcase.json", "scripts/capture-homepage-previews.mjs", "project-lab.html", "project-lab.js", "project-lab.css", "frameflux-demo-preview.js", "frameflux-demo-preview.css", "scripts/build-portfolio-preview.sh"]) {
  assert(existsSync(resolve(root, path)), "missing portfolio entrypoint asset: " + path);
}

const indexHtml = readFileSync(resolve(root, "index.html"), "utf8");
const appScript = readFileSync(resolve(root, "script.js"), "utf8");
const portfolioPolishStyles = readFileSync(resolve(root, "portfolio-polish.css"), "utf8");
const previewBuildScript = readFileSync(resolve(root, "scripts/build-portfolio-preview.sh"), "utf8");
assert(indexHtml.includes('<html lang="en" data-theme="dark">'), "portfolio must start in dark mode for every visitor");
assert(appScript.includes('const THEME_KEY = "faizan-product-lab-theme-v2";') && appScript.includes('storedTheme === "light" || storedTheme === "dark" ? storedTheme : "dark"') && appScript.includes('localStorage.setItem(THEME_KEY, next)'), "portfolio must default dark for existing visitors while remembering new explicit theme choices");
assert(portfolioPolishStyles.includes('html[data-theme="dark"] { color-scheme: dark; }'), "dark theme must set the native browser color scheme");
assert(portfolioPolishStyles.includes('.contribution-filters .select-wrap select option'), "opened contribution dropdown options must receive theme styling");
assert(indexHtml.includes('href="./portfolio-polish.css'), "index.html must load the portfolio polish stylesheet");
assert(previewBuildScript.includes('"$ROOT/work-showcase.css"'), "Vercel preview packaging must copy work-showcase.css into out/");
assert(indexHtml.includes('href="./work-showcase.css'), "index.html must load the work showcase stylesheet");
assert(indexHtml.includes('href="./explorer-showcase.css'), "index.html must load the Explorer showcase stylesheet");
assert(indexHtml.includes('src="./explorer-showcase.js'), "index.html must load the Explorer showcase script");
assert(previewBuildScript.includes('"$ROOT/explorer-showcase.css"') && previewBuildScript.includes('"$ROOT/explorer-showcase.js"'), "Vercel preview packaging must copy the Explorer showcase assets into out/");
assert(indexHtml.includes('id="client-work-grid"') && indexHtml.includes('id="internship-work-grid"'), "client and internship sections are required");
assert(!indexHtml.includes("INDEPENDENT SOFTWARE / 2026"), "remove the old generic wordmark tagline");
assert(previewBuildScript.includes('"$ROOT/portfolio-polish.css"'), "Vercel preview packaging must copy portfolio-polish.css into out/");

if (process.exitCode) process.exit(process.exitCode);
console.log("Portfolio data validation passed: " + projects.length + " personal projects, " + work.clientWork.length + " client projects, " + work.internshipWork.length + " internship projects, " + activity.items.length + " external merged PRs, " + releases.items.length + " release credits.");
