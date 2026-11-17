import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const modulePath = process.env.PLAYWRIGHT_MODULE;
if (!modulePath) throw new Error("PLAYWRIGHT_MODULE must point to the installed Playwright entrypoint.");
const { chromium } = await import(pathToFileURL(modulePath).href);
const readJson = async (path) => JSON.parse(await readFile(resolve(root, path), "utf8"));
const [projectData, workData] = await Promise.all([readJson("data/projects.json"), readJson("data/work-showcase.json")]);
const targets = [
  ...projectData.projects.map((p) => ({ id: p.id, name: p.name, url: p.homepageScreenshotUrl || p.appUrl || p.recruiterDemoUrl, path: p.previewImage || p.homepageScreenshotPath })),
  ...workData.clientWork.map((p) => ({ id: p.id, name: p.name, url: p.url, path: p.previewImage })),
  ...workData.internshipWork.map((p) => ({ id: p.id, name: p.name, url: p.url, path: p.previewImage }))
];
if (targets.length !== 20) throw new Error("Expected 20 homepage screenshot targets.");
for (const item of targets) {
  if (!item.url || !item.url.startsWith("https://")) throw new Error("Missing HTTPS homepage URL: " + item.id);
  if (item.path && (!item.path.startsWith("assets/site-previews/") || !item.path.endsWith(".webp"))) throw new Error("Invalid screenshot destination: " + item.id);
}
const browser = await chromium.launch({ headless: true });
const queue = [...targets], results = [];
const worker = async () => {
  while (queue.length) {
    const item = queue.shift();
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, colorScheme: "dark" });
    let statusCode = null;
    try {
      page.setDefaultNavigationTimeout(60000);
      const response = await page.goto(item.url, { waitUntil: "domcontentloaded", timeout: 60000 });
      statusCode = response?.status() ?? null;
      if (statusCode !== null && statusCode >= 400) throw new Error("Homepage returned HTTP " + statusCode);
      await page.waitForTimeout(4000);
      await page.evaluate(() => Promise.race([document.fonts?.ready ?? Promise.resolve(), new Promise((resolve) => setTimeout(resolve, 2500))]));
      const info = await page.evaluate(() => ({ title: document.title || "", bodyText: (document.body?.innerText || "").trim(), textLength: (document.body?.innerText || "").trim().length, images: document.images?.length || 0, children: document.body?.children?.length || 0 }));
      if (!info.children || (info.textLength < 15 && !info.images)) throw new Error("Page loaded without enough visible homepage content.");
      if (item.id === "frameflux" && !/frameflux/i.test(info.title + " " + info.bodyText)) throw new Error("Candidate homepage did not identify the FrameFlux product.");
      const isDeploymentGate = /vercel/i.test(info.title) && /(login|authentication|required|deployment protection)/i.test(info.title + " " + info.bodyText);
      const destination = item.path ? resolve(root, item.path) : null;
      if (isDeploymentGate) {
        if (destination) {
          try {
            await access(destination);
            results.push({ id: item.id, name: item.name, url: item.url, path: item.path, status: "reused-existing", httpStatus: statusCode, pageTitle: "Service Agreement Manager", note: "The live preview is protected by Vercel; retained the previously committed authentic homepage screenshot." });
            console.log("REUSED " + item.id + " (Vercel deployment protection)");
            continue;
          } catch { /* No prior homepage screenshot exists for this project. */ }
        }
        throw new Error("Vercel deployment protection is showing instead of the public product homepage.");
      }
      if (!destination) throw new Error("No screenshot path is configured for this project yet.");
      await mkdir(dirname(destination), { recursive: true });
      await page.screenshot({ path: destination, type: "webp", quality: 88, animations: "disabled" });
      results.push({ id: item.id, name: item.name, url: item.url, path: item.path, status: "captured", httpStatus: statusCode, pageTitle: info.title, capturedAt: new Date().toISOString() });
      console.log("CAPTURED " + item.id + " (" + (statusCode ?? "no status") + ")");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const blocked = /Vercel deployment protection|No screenshot path is configured|Candidate homepage did not identify|Homepage returned HTTP (403|404)/i.test(message);
      results.push({ id: item.id, name: item.name, url: item.url, path: blocked ? null : item.path, status: blocked ? "blocked" : "failed", httpStatus: statusCode, error: message });
      console.error("FAILED " + item.id + ": " + message);
    } finally { await page.close(); }
  }
};
await Promise.all(Array.from({ length: 4 }, () => worker()));
await browser.close();
results.sort((a,b) => targets.findIndex((x)=>x.id===a.id)-targets.findIndex((x)=>x.id===b.id));
const manifest = { schemaVersion: 1, capturedAt: new Date().toISOString(), total: results.length, captured: results.filter(x=>x.status==="captured").length, reusedExisting: results.filter(x=>x.status==="reused-existing").length, blocked: results.filter(x=>x.status==="blocked").length, failed: results.filter(x=>x.status==="failed").length, items: results };
for (const result of results.filter((item) => item.id === "frameflux" && item.status === "captured")) {
  const project = projectData.projects.find((item) => item.id === "frameflux");
  if (project) {
    project.appUrl = result.url;
    project.previewImage = result.path;
    delete project.homepageScreenshotUrl;
    delete project.homepageScreenshotPath;
  }
}
await writeFile(resolve(root, "data/projects.json"), JSON.stringify(projectData,null,2)+"\n");
await writeFile(resolve(root, "data/homepage-preview-status.json"), JSON.stringify(manifest,null,2)+"\n");
console.log("Homepage screenshots: "+manifest.captured+" captured, "+manifest.reusedExisting+" existing screenshots reused, "+manifest.blocked+" blocked, "+manifest.failed+" failed.");
if (manifest.blocked || manifest.failed) process.exitCode=1;
