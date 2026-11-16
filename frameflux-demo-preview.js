(() => {
  "use strict";

  let frameFluxProject = null;

  const safeGitHubUrl = (value) => {
    try {
      const url = new URL(value);
      return url.protocol === "https:" &&
        url.hostname === "github.com" &&
        url.pathname.startsWith("/faizansaiyed123/")
        ? url.href
        : "";
    } catch {
      return "";
    }
  };

  const appendLink = (container, label, value, className = "frameflux-demo-link") => {
    const url = safeGitHubUrl(value);
    if (!container || !url) return null;
    const link = document.createElement("a");
    link.className = className;
    link.href = url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = label + " ↗";
    container.append(link);
    return link;
  };

  const enhanceProjectCard = () => {
    const original = document.querySelector('#project-grid .project-card[data-project-id="frameflux"]');
    const build = frameFluxProject?.demoBuild;
    if (!original || !build || original.dataset.framefluxDemoEnhanced === "true") return;

    const article = document.createElement("article");
    article.className = original.className + " frameflux-demo-card";
    article.dataset.framefluxDemoEnhanced = "true";
    article.setAttribute("role", "group");
    article.setAttribute(
      "aria-label",
      "FrameFlux source-tested demo build. Open the frontend and backend demo branches or view project details."
    );
    while (original.firstChild) article.append(original.firstChild);

    const status = document.createElement("div");
    status.className = "frameflux-card-status";
    const statusLabel = document.createElement("span");
    statusLabel.className = "frameflux-card-status-label";
    statusLabel.textContent = "Demo branches · source-tested";
    const statusCopy = document.createElement("p");
    statusCopy.textContent =
      "The frontend and backend demo branches passed browser and API checks. This is a source build, not a hosted public workspace.";
    status.append(statusLabel, statusCopy);

    const facts = document.createElement("div");
    facts.className = "frameflux-card-facts";
    [
      String(build.browserTestsPassed || 0) + " browser tests passed",
      String(build.backendApiTestsPassed || 0) + " backend API tests passed",
      "No public deployment"
    ].forEach((value) => {
      const item = document.createElement("span");
      item.textContent = value;
      facts.append(item);
    });
    status.append(facts);

    const top = article.querySelector(".project-card-top");
    if (top) top.insertAdjacentElement("afterend", status);

    const actions = document.createElement("div");
    actions.className = "frameflux-card-actions";
    appendLink(actions, "Frontend demo branch", build.frontendBranchUrl, "frameflux-card-link");
    appendLink(actions, "Backend demo branch", build.backendBranchUrl, "frameflux-card-link");
    appendLink(actions, "Browser test run", build.browserIntegrationWorkflowUrl, "frameflux-card-link is-secondary");
    appendLink(actions, "Backend API tests", build.backendApiWorkflowUrl, "frameflux-card-link is-secondary");

    const details = document.createElement("button");
    details.type = "button";
    details.className = "frameflux-card-details";
    details.dataset.projectId = "frameflux";
    details.textContent = "Project details";
    actions.append(details);

    const boundary = document.createElement("p");
    boundary.className = "frameflux-card-boundary";
    boundary.textContent =
      "The API demo uses in-memory state and placeholder outputs. PostgreSQL, Redis, ARQ and FFmpeg are not run by this demo.";

    const cardBottom = article.querySelector(".project-card-bottom");
    if (cardBottom) cardBottom.insertAdjacentElement("beforebegin", actions);
    else article.append(actions);
    article.append(boundary);

    article.addEventListener("click", (event) => {
      if (event.target.closest("a, button")) return;
      window.location.href = "./project-lab.html?id=frameflux";
    });
    original.replaceWith(article);
  };

  const enhanceCardDialog = () => {
    const dialog = document.querySelector("#project-dialog");
    const content = document.querySelector("#dialog-content");
    const build = frameFluxProject?.demoBuild;
    if (!dialog?.open || !content || !build) return;
    if (content.querySelector("#dialog-title")?.textContent.trim() !== "FrameFlux") return;

    const readiness = content.querySelector(".demo-readiness");
    if (!readiness || readiness.dataset.framefluxDemoEnhanced === "true") return;
    readiness.dataset.framefluxDemoEnhanced = "true";

    const state = content.querySelector(".dialog-state");
    if (state) {
      state.textContent = "Source-tested · public demo pending";
      state.classList.add("frameflux-preview-state");
    }
    const description = readiness.querySelector("p");
    if (description) {
      description.textContent =
        "The two demo branches have passing automated checks. The browser/API integration is verified against a simulated in-memory backend; no public app or real media worker is deployed.";
    }
    const warning = readiness.querySelector(".demo-warning");
    if (warning) {
      warning.textContent =
        "Important boundary: the connected API demo does not use PostgreSQL, Redis, ARQ or FFmpeg. Job progress and output files are representative placeholders, not actual media transcoding.";
    }

    const statusLine = readiness.querySelector(".dialog-status-line");
    if (statusLine) {
      statusLine.replaceChildren();
      [
        "SOURCE CHECKS: PASSED",
        "PUBLIC FRONTEND / BACKEND: NOT DEPLOYED",
        "API: IN-MEMORY SIMULATION",
        "REAL MEDIA TRANSCODING: NOT RUN"
      ].forEach((value) => {
        const item = document.createElement("span");
        item.textContent = value;
        statusLine.append(item);
      });
    }

    const links = document.createElement("div");
    links.className = "frameflux-demo-source-links";
    appendLink(links, "Frontend demo branch", build.frontendBranchUrl);
    appendLink(links, "Backend demo branch", build.backendBranchUrl);
    appendLink(links, "Browser integration tests", build.browserIntegrationWorkflowUrl);
    appendLink(links, "Backend API tests", build.backendApiWorkflowUrl);
    appendLink(links, "Frontend lint and build", build.frontendChecksWorkflowUrl);
    readiness.append(links);
  };

  const enhanceProjectLab = () => {
    const article = document.querySelector("#project-lab");
    const title = document.querySelector("#lab-title");
    const build = frameFluxProject?.demoBuild;
    if (!article || article.hidden || title?.textContent.trim() !== "FrameFlux" || !build) return;
    if (article.dataset.framefluxDemoEnhanced === "true") return;
    article.dataset.framefluxDemoEnhanced = "true";

    const heroNote = document.querySelector(".lab-hero-note");
    if (heroNote) {
      heroNote.textContent =
        "The frontend and backend demo branches have passing automated checks. No public app is deployed; the connected API demo is in-memory and does not run FFmpeg or produce real transcoded files.";
    }

    const firstStatusCard = document.querySelector(".lab-status-row .lab-status-card");
    const statusLabel = firstStatusCard?.querySelector(".lab-meta-label");
    if (statusLabel) statusLabel.textContent = "DEMO BUILD VERIFICATION";
    const status = document.querySelector("#lab-status");
    if (status) status.textContent = "Source checks passed · hosting pending";
    const statusDetail = document.querySelector("#lab-status-detail");
    if (statusDetail) {
      statusDetail.textContent =
        String(build.browserTestsPassed) + " Playwright browser tests and " +
        String(build.backendApiTestsPassed) +
        " backend API tests passed. A public frontend/backend deployment and real media-worker journey remain unverified.";
    }

    const systemIntro = document.querySelector(".lab-system-section .lab-section-heading > p");
    if (systemIntro) {
      systemIntro.textContent =
        "The architecture map describes the intended production stack. The tested recruiter API is currently an in-memory simulation and does not start PostgreSQL, Redis, ARQ or FFmpeg.";
    }

    const demoStatus = document.querySelector("#lab-demo-status");
    if (demoStatus) {
      demoStatus.textContent =
        "STATUS: SOURCE CHECKS PASSED · PUBLIC HOSTING: PENDING · API: IN-MEMORY SIMULATION · FFMPEG: NOT RUN";
    }

    const demoAction = document.querySelector("#lab-demo-action");
    if (demoAction && !demoAction.querySelector(".frameflux-demo-source-links")) {
      const note = demoAction.querySelector(".lab-demo-action-note");
      if (note) {
        note.textContent =
          "No hosted demo URL is available yet. Inspect both tested source branches and the exact CI runs below, or run the demo locally using the frontend README.";
      }
      const links = document.createElement("div");
      links.className = "frameflux-demo-source-links";
      appendLink(links, "Frontend demo branch", build.frontendBranchUrl);
      appendLink(links, "Backend demo branch", build.backendBranchUrl);
      appendLink(links, "Browser integration tests", build.browserIntegrationWorkflowUrl);
      appendLink(links, "Backend API tests", build.backendApiWorkflowUrl);
      appendLink(links, "Frontend lint and build", build.frontendChecksWorkflowUrl);
      demoAction.append(links);
    }

    const listedLink = document.querySelector("#lab-listed-url");
    if (listedLink) listedLink.hidden = true;
    const listedNote = document.querySelector("#lab-listed-url-note");
    if (listedNote) {
      listedNote.textContent =
        "No public frontend or backend URL is deployed. Use the tested demo branch and CI links in the recruiter sandbox section.";
    }
  };

  const start = async () => {
    const grid = document.querySelector("#project-grid");
    if (grid) {
      const observer = new MutationObserver(enhanceProjectCard);
      observer.observe(grid, { childList: true, subtree: true });
    }

    const content = document.querySelector("#dialog-content");
    if (content) {
      const observer = new MutationObserver(enhanceCardDialog);
      observer.observe(content, { childList: true, subtree: true });
    }
    const dialog = document.querySelector("#project-dialog");
    if (dialog) {
      const observer = new MutationObserver(enhanceCardDialog);
      observer.observe(dialog, { attributes: true, attributeFilter: ["open"] });
    }
    const lab = document.querySelector("#project-lab");
    if (lab) {
      const observer = new MutationObserver(enhanceProjectLab);
      observer.observe(lab, { attributes: true, childList: true, subtree: true });
    }

    try {
      const response = await fetch("./data/projects.json", {
        headers: { Accept: "application/json" },
        cache: "no-cache"
      });
      if (!response.ok) throw new Error("Could not load FrameFlux demo verification metadata.");
      const data = await response.json();
      frameFluxProject = Array.isArray(data.projects)
        ? data.projects.find((project) => project.id === "frameflux")
        : null;
      enhanceProjectCard();
      enhanceCardDialog();
      enhanceProjectLab();
    } catch (error) {
      console.error("FrameFlux portfolio enhancement unavailable:", error);
    }
  };

  start();
})();
