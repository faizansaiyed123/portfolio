(() => {
  "use strict";

  const $ = (selector) => document.querySelector(selector);
  const escapeHTML = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
  const safeHttps = (value) => {
    try {
      const url = new URL(String(value || ""));
      return url.protocol === "https:" ? url.href : "";
    } catch {
      return "";
    }
  };
  const repoUrl = (name) => name
    ? "https://github.com/faizansaiyed123/" + encodeURIComponent(name)
    : "";

  const themeKey = "faizan-product-lab-theme";
  const themeButton = $(".theme-toggle");
  const applyTheme = (theme, persist = false) => {
    const next = theme === "light" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    if (themeButton) {
      themeButton.setAttribute("aria-label", next === "dark" ? "Switch to light theme" : "Switch to dark theme");
      themeButton.setAttribute("title", next === "dark" ? "Switch to light theme" : "Switch to dark theme");
    }
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", next === "dark" ? "#111016" : "#f3eee8");
    if (persist) {
      try { localStorage.setItem(themeKey, next); } catch { /* Theme applies for this visit. */ }
    }
  };
  let storedTheme = null;
  try { storedTheme = localStorage.getItem(themeKey); } catch { /* Storage is optional. */ }
  applyTheme(storedTheme === "light" || storedTheme === "dark" ? storedTheme : "dark");
  themeButton?.addEventListener("click", () => {
    applyTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark", true);
  });

  const query = new URLSearchParams(window.location.search);
  const projectId = query.get("id") || "";
  const loading = $("#lab-loading");
  const error = $("#lab-error");
  const article = $("#project-lab");

  const addLink = (container, label, url) => {
    const safe = safeHttps(url);
    if (!safe) return;
    const anchor = document.createElement("a");
    anchor.href = safe;
    anchor.target = "_blank";
    anchor.rel = "noopener noreferrer";
    anchor.textContent = label + " ↗";
    container.append(anchor);
  };

  const setText = (selector, value) => {
    const element = $(selector);
    if (element) element.textContent = String(value ?? "");
  };

  const render = (project, projects) => {
    const pending = project.demoStatus !== "ready" || !safeHttps(project.demoUrl);
    const title = project.name + " — Project Lab";
    document.title = title + " | Faizan Saiyed";
    setText("#lab-breadcrumb-current", project.name);
    setText("#lab-number", "PROJECT LAB / " + project.number);
    setText("#lab-category", project.category);
    setText("#lab-title", project.name);
    setText("#lab-overview", project.overview);
    setText("#lab-category-card", project.category);\n    setText("#lab-runtime", project.runtimeType || "Per-visitor isolated workspace");\n    setText("#lab-runtime-detail", project.runtimeDetail || "A temporary synthetic environment with bounded use and automatic expiry.");
    setText("#lab-stack-summary", (project.stack || []).slice(0, 4).join(" · "));
    setText("#lab-status", pending ? "Verification pending" : "Demo available");
    setText(
      "#lab-status-detail",
      pending
        ? "No public launch is marked ready until the real application, API, data store and required workers pass the full browser journey."
        : "The configured demo endpoint has passed the recorded readiness checks."
    );

    const previewWrap = $("#lab-preview-wrap");
    const preview = $("#lab-preview");
    const imageUrl = String(project.previewImage || "");
    if (/^assets\/[a-zA-Z0-9/_-]+\.(?:webp|png|jpe?g|svg)$/i.test(imageUrl)) {
      preview.src = imageUrl;
      preview.alt = project.name + " project interface preview";
      previewWrap.hidden = false;
      $("#lab-preview-caption").textContent = project.oneLiner || project.name;
      preview.addEventListener("error", () => { previewWrap.hidden = true; }, { once: true });
    } else {
      previewWrap.hidden = true;
    }

    const heroActions = $("#lab-hero-actions");
    heroActions.innerHTML = "";
    const primary = document.createElement("a");
    if (pending) {
      primary.className = "button button-disabled";
      primary.setAttribute("aria-disabled", "true");
      primary.textContent = "Demo not verified yet";
      primary.addEventListener("click", (event) => event.preventDefault());
    } else {
      primary.className = "button button-primary";
      primary.href = safeHttps(project.demoUrl);
      primary.target = "_blank";
      primary.rel = "noopener noreferrer";
      primary.textContent = "Try the live product ↗";
    }
    heroActions.append(primary);

    const workflow = $("#lab-workflow");
    workflow.innerHTML = (project.workflow || []).map((step, index) =>
      '<li><span class="lab-step-number">' + String(index + 1).padStart(2, "0") +
      '</span><div><strong>' + escapeHTML(step) + '</strong></div></li>'
    ).join("");

    const architecture = $("#lab-architecture");
    const nodes = project.architecture || [];
    architecture.innerHTML = nodes.length
      ? nodes.map((node, index) =>
          (index ? '<span class="lab-system-arrow" aria-hidden="true">→</span>' : "") +
          '<span class="lab-system-node">' + escapeHTML(node) + '</span>'
        ).join("")
      : '<p class="lab-empty-note">Architecture notes are being prepared.</p>';

    const stack = $("#lab-stack");
    stack.innerHTML = (project.stack || []).map(item => '<span>' + escapeHTML(item) + '</span>').join("");

    const features = $("#lab-features");
    features.innerHTML = (project.features || []).map(item => '<li>' + escapeHTML(item) + '</li>').join("");

    setText(
      "#lab-demo-plan",
      project.demoPlan || "The demo plan is being prepared from the source audit. This project remains unavailable until its full application path is verified."
    );
    setText("#lab-demo-status", pending
      ? "STATUS: VERIFICATION PENDING · DATA: SYNTHETIC ONLY · PUBLIC BACKEND: NOT VERIFIED"
      : "STATUS: VERIFIED LIVE · DATA: SYNTHETIC / ISOLATED");
    const demoAction = $("#lab-demo-action");
    demoAction.innerHTML = "";
    const demoNote = document.createElement("p");
    demoNote.className = "lab-demo-action-note";
    demoNote.textContent = pending
      ? "The demo link will appear here after a complete clean-browser verification. A frontend URL alone is not enough."
      : "This opens the actual deployed application, not a browser-only simulation.";
    demoAction.append(demoNote);
    if (!pending) addLink(demoAction, "Open verified product", project.demoUrl);

    const repositories = $("#lab-repository-links");
    repositories.innerHTML = "";
    addLink(repositories, "Frontend repository", repoUrl(project.frontendRepo));
    if (project.backendRepo) addLink(repositories, "Backend repository", repoUrl(project.backendRepo));
    if (!repositories.children.length) repositories.textContent = "Repository links unavailable.";

    const audit = safeHttps(
      "https://github.com/faizansaiyed123/portfolio/blob/redesign/interactive-product-portfolio-followup/" +
      String(project.auditPath || "").replace(/^\/+/, "")
    );
    const auditLink = $("#lab-audit-link");
    if (audit && project.auditPath) {
      auditLink.href = audit;
      auditLink.hidden = false;
    } else {
      auditLink.hidden = true;
    }

    const listedUrl = safeHttps(project.appUrl);
    const listedLink = $("#lab-listed-url");
    if (listedUrl) {
      listedLink.href = listedUrl;
      listedLink.hidden = false;
      listedLink.textContent = "Open listed frontend URL (availability unverified) ↗";
      $("#lab-listed-url-note").textContent = "This URL is present in the project record. It has not been verified as a complete frontend/backend deployment; do not treat it as a working demo.";
    } else {
      listedLink.hidden = true;
      $("#lab-listed-url-note").textContent = "No public frontend URL is currently recorded for this project.";
    }

    const index = projects.findIndex(item => item.id === project.id);
    const previous = projects[index - 1];
    const next = projects[index + 1];
    const neighbours = $("#lab-neighbour-links");
    neighbours.innerHTML = "";
    if (previous) {
      const a = document.createElement("a");
      a.href = "./project-lab.html?id=" + encodeURIComponent(previous.id);
      a.textContent = "← " + previous.name;
      neighbours.append(a);
    }
    if (next) {
      const a = document.createElement("a");
      a.href = "./project-lab.html?id=" + encodeURIComponent(next.id);
      a.textContent = next.name + " →";
      neighbours.append(a);
    }
  };

  const main = async () => {
    if (!/^[a-z0-9-]{1,64}$/.test(projectId)) {
      loading.hidden = true;
      error.hidden = false;
      return;
    }
    try {
      const response = await fetch("./data/projects.json", { headers: { Accept: "application/json" }, cache: "no-cache" });
      if (!response.ok) throw new Error("Project records unavailable.");
      const data = await response.json();
      const projects = Array.isArray(data.projects) ? data.projects : [];
      const project = projects.find(item => item.id === projectId);
      if (!project) throw new Error("Project not found.");
      render(project, projects);
      loading.hidden = true;
      article.hidden = false;
    } catch (err) {
      console.error("Project lab failed to load:", err);
      loading.hidden = true;
      error.hidden = false;
    }
  };

  main();
})();
