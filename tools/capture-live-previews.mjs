import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import sharp from "sharp";

const targets = [
  { slug: "sayphora", name: "Sayphora", url: "https://sayphora.vercel.app/" },
  { slug: "focus-journal", name: "Focus Journal", url: "https://focus-journal-frontend.vercel.app/" },
  { slug: "nexora", name: "Nexora", url: "https://nexora-frontend-hazel.vercel.app/" },
  { slug: "telemetry", name: "Telemetry", url: "https://telemetry-frontend-chi.vercel.app/" },
  { slug: "feature-flag-platform", name: "Feature Flag Platform", url: "https://feature-flag-platform-frontend-lsf9.vercel.app/" },
  { slug: "fieldline-crm", name: "Fieldline CRM", url: "https://fieldline-crm-frontend.vercel.app/" },
  { slug: "marketing-campaigns", name: "Marketing Campaign Management", url: "https://marketing-campaign-management-front.vercel.app/" },
  { slug: "mindbridge", name: "MindBridge", url: "https://mindbridge-demo-psi.vercel.app/" },
  { slug: "product-analytics", name: "Product Analytics", url: "https://product-analytics-frontend-un93.vercel.app/" },
  { slug: "gemini-frontend", name: "Gemini Frontend Clone", url: "https://gemini-frontend-clone.vercel.app/" },
  { slug: "intern-credits", name: "Intern Credits", url: "https://frontend-intern-credits.vercel.app/" },
  { slug: "agencyos", name: "AgencyOS", url: "https://agencyos-frontend-one.vercel.app/" },
  { slug: "cleanflow", name: "CleanFlow", url: "https://cleanflow-frontend-theta.vercel.app/" },
  { slug: "flowdesk", name: "FlowDesk", url: "https://flow-desk-frontend-three.vercel.app/" },
  { slug: "supportai", name: "SupportAI", url: "https://supportai-frontend-plum.vercel.app/" },
  { slug: "service-agreement-manager", name: "Service Agreement Manager", url: "https://service-agreement-manager-frontend.vercel.app/" },
  { slug: "autofix", name: "AutoFix", url: "https://autofix-frontend-phi.vercel.app/" },
  { slug: "jeca-homes", name: "Jeca Homes", url: "https://jecahomesforsalefl.com/" },
  { slug: "printoscar", name: "PrintOscar", url: "https://printoscar.com/" }
];

const outputDir = path.resolve("assets/site-previews");
fs.mkdirSync(outputDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const report = [];

for (const target of targets) {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    colorScheme: "dark"
  });
  const errors = [];
  page.on("pageerror", error => errors.push(error.message.slice(0, 240)));
  let status = null;
  let title = "";
  let screenshot = null;
  let failure = "";
  try {
    const response = await page.goto(target.url, { waitUntil: "domcontentloaded", timeout: 45000 });
    status = response?.status() ?? null;
    await page.waitForTimeout(2200);
    title = (await page.title()).slice(0, 180);
    const bodyText = (await page.locator("body").innerText({ timeout: 8000 }).catch(() => "")).replace(/\\s+/g, " ").slice(0, 600);
    const failureText = /deployment not found|404:\\s*NOT_FOUND|this deployment is paused|application error|internal server error|access denied|verify you are human|domain not found|this site can.t be reached/i;
    const pageIsError = failureText.test(title + " " + bodyText);
    if (status !== null && status >= 200 && status < 300 && !pageIsError && bodyText.trim().length > 20) {
      const png = await page.screenshot({ type: "png", animations: "disabled", timeout: 20000 });
      const file = path.join(outputDir, `${target.slug}.webp`);
      await sharp(png).resize({ width: 1440, height: 900, fit: "fill" }).webp({ quality: 80, effort: 5 }).toFile(file);
      screenshot = `assets/site-previews/${target.slug}.webp`;
    } else {
      failure = pageIsError ? "The returned page looks like an error or access-protection page." : `HTTP status/body did not qualify (status=${status}).`;
    }
    report.push({ ...target, status, title, screenshot, failure, consolePageErrors: errors });
  } catch (error) {
    failure = String(error?.message || error).slice(0, 300);
    report.push({ ...target, status, title, screenshot, failure, consolePageErrors: errors });
  } finally {
    await page.close();
  }
  const result = report.at(-1);
  console.log(`[${result.screenshot ? "CAPTURED" : "SKIPPED"}] ${target.name}: status=${status}; title=${title}; ${failure}`);
}

await browser.close();
fs.writeFileSync("capture-report.json", JSON.stringify(report, null, 2) + "\\n");
