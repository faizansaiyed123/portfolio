(() => {
  "use strict";

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];
  const root = document.documentElement;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const dateFormatter = new Intl.DateTimeFormat("en", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
  const monthFormatter = new Intl.DateTimeFormat("en", { month: "short", timeZone: "UTC" });

  const escapeHTML = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);

  const asDate = (isoDate) => new Date(isoDate + "T00:00:00Z");
  const dateKey = (date) => [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0")
  ].join("-");
  const formatDate = (value) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "Date unavailable" : dateFormatter.format(date);
  };
  const titleCase = (value) => String(value || "").replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  const state = {
    projects: [],
    activity: [],
    releases: [],
    selectedCategory: "all",
    search: "",
    selectedRepository: "all",
    activeProject: null
  };

  /* ---------- Theme ---------- */
  const THEME_KEY = "faizan-product-lab-theme";
  const applyTheme = (theme, persist = false) => {
    const next = theme === "light" ? "light" : "dark";
    root.dataset.theme = next;
    const button = $(".theme-toggle");
    if (button) {
      button.setAttribute("aria-label", next === "dark" ? "Switch to light theme" : "Switch to dark theme");
      button.setAttribute("title", next === "dark" ? "Switch to light theme" : "Switch to dark theme");
      button.innerHTML = next === "dark"
        ? '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3.5"></circle><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"></path></svg>'
        : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.5 14.2A8.4 8.4 0 0 1 9.8 3.5 8.7 8.7 0 1 0 20.5 14.2Z"></path></svg>';
    }
    const meta = $("meta[name='theme-color']");
    meta?.setAttribute("content", next === "dark" ? "#111016" : "#f3eee8");
    if (persist) {
      try { localStorage.setItem(THEME_KEY, next); } catch { /* Theme still applies for this visit. */ }
    }
  };

  let storedTheme = null;
  try { storedTheme = localStorage.getItem(THEME_KEY); } catch { /* Storage is optional. */ }
  applyTheme(storedTheme === "light" || storedTheme === "dark" ? storedTheme : "dark");
  $(".theme-toggle")?.addEventListener("click", () => {
    applyTheme(root.dataset.theme === "dark" ? "light" : "dark", true);
  });

  /* ---------- Mobile navigation ---------- */
  const menuButton = $(".mobile-menu-button");
  const mobileNav = $("#mobile-nav");
  const closeMobileNav = () => {
    mobileNav?.classList.remove("is-open");
    menuButton?.setAttribute("aria-expanded", "false");
    menuButton?.setAttribute("aria-label", "Open navigation");
  };
  menuButton?.addEventListener("click", () => {
    const open = !mobileNav?.classList.contains("is-open");
    mobileNav?.classList.toggle("is-open", open);
    menuButton?.setAttribute("aria-expanded", String(open));
    menuButton?.setAttribute("aria-label", open ? "Close navigation" : "Open navigation");
  });
  $$("#mobile-nav a").forEach((link) => link.addEventListener("click", closeMobileNav));
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeMobileNav();
  });

  /* ---------- Opening explorer tabs ---------- */
  const explorerContent = {
    try: {
      title: "Use the product, not just its screenshots.",
      body: "Each public demo will use real application behavior and isolated fictional data. No personal account or setup should be required."
    },
    trace: {
      title: "Follow the action through the system.",
      body: "Move from browser interaction to API, domain service, database, and background work. Inspect real implementation details."
    },
    verify: {
      title: "Check the evidence behind the work.",
      body: "Review repositories, tests, merged pull requests, official releases, and documented constraints. Claims stay attached to sources."
    }
  };
  const explorerPanel = $("[data-explorer-panel]");
  $$(".explorer-tab").forEach((button) => {
    button.addEventListener("click", () => {
      const key = button.dataset.explorerTab;
      const content = explorerContent[key];
      if (!content || !explorerPanel) return;
      $$(".explorer-tab").forEach((tab) => {
        const active = tab === button;
        tab.classList.toggle("is-active", active);
        tab.setAttribute("aria-selected", String(active));
      });
      explorerPanel.innerHTML = "<strong>" + escapeHTML(content.title) + "</strong><p>" + escapeHTML(content.body) + "</p>";
    });
  });

  /* ---------- Load the structured portfolio evidence ---------- */
  const loadJSON = async (path) => {
    const url = new URL(path, document.baseURI);
    const response = await fetch(url, { headers: { Accept: "application/json" }, cache: "no-cache" });
    if (!response.ok) throw new Error("Could not load " + path + " (" + response.status + ").");
    return response.json();
  };

  const setLoadingError = (selector, message) => {
    const element = $(selector);
    if (element) element.innerHTML = '<div class="loading-card">' + escapeHTML(message) + "</div>";
  };

  const renderProjectCounts = () => {
    $("#project-count").textContent = String(state.projects.length);
    $("#all-projects-count").textContent = String(state.projects.length);
    $("#contribution-count").textContent = String(state.activity.length);
    $("#release-count").textContent = String(state.releases.length);
    $("#external-pr-total").textContent = String(state.activity.length);
  };

  /* ---------- Project library ---------- */
  const projectGrid = $("#project-grid");
  const projectFilters = $("#project-filters");
  const projectSearch = $("#project-search");
  const projectResults = $("#project-results");
  const projectEmpty = $("#project-empty");

  const categoryCounts = () => {
    const counts = new Map();
    state.projects.forEach((project) => counts.set(project.category, (counts.get(project.category) || 0) + 1));
    return [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  };

  const renderCategoryFilters = () => {
    const categories = categoryCounts();
    const filters = [{ key: "all", label: "All work", count: state.projects.length }]
      .concat(categories.map(([label, count]) => ({ key: label, label, count })));
    projectFilters.innerHTML = filters.map((item) => {
      const active = state.selectedCategory === item.key;
      return '<button class="filter-chip' + (active ? " is-active" : "") + '" type="button" data-category="' +
        escapeHTML(item.key) + '" aria-pressed="' + String(active) + '">' + escapeHTML(item.label) +
        " <span>" + item.count + "</span></button>";
    }).join("");
  };

  const getFilteredProjects = () => {
    const query = state.search.trim().toLowerCase();
    return state.projects.filter((project) => {
      const categoryMatches = state.selectedCategory === "all" || project.category === state.selectedCategory;
      const searchable = [
        project.name, project.category, project.oneLiner, project.overview,
        ...(project.features || []), ...(project.stack || [])
      ].join(" ").toLowerCase();
      return categoryMatches && (!query || searchable.includes(query));
    });
  };

  const iconForProject = (project) => {
    const icons = {
      "Media infrastructure": "◫",
      "Realtime observability": "⌁",
      "Commerce": "◇",
      "Personal productivity": "✳",
      "Price intelligence": "⌘",
      "Developer infrastructure": "⚑",
      "Business operations": "▦",
      "Marketing operations": "↗",
      "Data and analytics": "▥",
      "AI applications": "✧",
      "Financial operations": "◈",
      "Field service operations": "⌖",
      "Project operations": "▤",
      "AI and retrieval": "⌕",
      "Workshop operations": "⚙",
      "Finance operations": "◷"
    };
    return icons[project.category] || project.name.slice(0, 1).toUpperCase();
  };

  const renderProjectCard = (project, index) => {
    const stack = (project.stack || []).slice(0, 3);
    const wide = index === 0 || index === 1;
    return '<button class="project-card' + (wide ? " is-wide" : "") + '" type="button" data-project-id="' + escapeHTML(project.id) + '" aria-label="Open project lab: ' + escapeHTML(project.name) + '">' +
      '<span class="project-card-top"><span class="project-number">LAB / ' + escapeHTML(project.number) + '</span><span class="project-domain">' + escapeHTML(project.category) + '</span></span>' +
      '<span class="project-emblem" aria-hidden="true">' + escapeHTML(iconForProject(project)) + '</span>' +
      '<span><h3>' + escapeHTML(project.name) + '</h3><p>' + escapeHTML(project.oneLiner) + '</p></span>' +
      '<span class="project-card-bottom"><span class="project-stack">' + stack.map((tag) => "<span>" + escapeHTML(tag) + "</span>").join("") + '</span><span class="project-open" aria-hidden="true">↗</span></span>' +
      "</button>";
  };

  const renderProjects = () => {
    if (!projectGrid) return;
    const visible = getFilteredProjects();
    projectGrid.innerHTML = visible.length
      ? visible.map(renderProjectCard).join("")
      : "";
    projectEmpty.hidden = visible.length !== 0;
    projectGrid.hidden = visible.length === 0;
    projectResults.textContent = "Showing " + visible.length + " of " + state.projects.length + " personal projects";
  };

  projectFilters?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-category]");
    if (!button) return;
    state.selectedCategory = button.dataset.category;
    renderCategoryFilters();
    renderProjects();
  });
  projectSearch?.addEventListener("input", () => {
    state.search = projectSearch.value;
    renderProjects();
  });
  $("#clear-project-filters")?.addEventListener("click", () => {
    state.selectedCategory = "all";
    state.search = "";
    projectSearch.value = "";
    renderCategoryFilters();
    renderProjects();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "/" && !event.ctrlKey && !event.metaKey && !event.altKey) {
      const target = event.target;
      const isTyping = target instanceof HTMLElement &&
        (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));
      if (!isTyping && !$("#project-dialog")?.open) {
        event.preventDefault();
        projectSearch?.focus();
      }
    }
  });

  /* ---------- Project lab dialog ---------- */
  const dialog = $("#project-dialog");
  const dialogContent = $("#dialog-content");
  const closeDialogButton = $(".dialog-close");
  let previousFocus = null;

  const renderProjectDialog = (project) => {
    const demoPending = project.demoStatus !== "ready";
    const stack = (project.stack || []).map((item) => "<span>" + escapeHTML(item) + "</span>").join("");
    const features = (project.features || []).map((item) => "<li>" + escapeHTML(item) + "</li>").join("");
    const architecture = (project.architecture || []).map((item, index, all) =>
      '<span class="architecture-node">' + escapeHTML(item) + "</span>" +
      (index < all.length - 1 ? '<span class="architecture-arrow" aria-hidden="true">→</span>' : "")
    ).join("");
    const sourceLinks = [];
    if (project.frontendRepo) {
      sourceLinks.push('<a href="https://github.com/faizansaiyed123/' + encodeURIComponent(project.frontendRepo) + '" target="_blank" rel="noopener noreferrer">Frontend source <span aria-hidden="true">↗</span></a>');
    }
    if (project.backendRepo) {
      sourceLinks.push('<a href="https://github.com/faizansaiyed123/' + encodeURIComponent(project.backendRepo) + '" target="_blank" rel="noopener noreferrer">Backend source <span aria-hidden="true">↗</span></a>');
    }
    let publicFrontendLink = "";
    if (project.appUrl) {
      publicFrontendLink = '<a href="' + escapeHTML(project.appUrl) + '" target="_blank" rel="noopener noreferrer">Open listed frontend URL <span aria-hidden="true">↗</span></a>';
    }

    $("#dialog-kicker").textContent = "PROJECT LAB / " + project.number + " — " + project.category.toUpperCase();
    dialogContent.innerHTML =
      '<div class="dialog-hero">' +
        '<div><span class="dialog-category">' + escapeHTML(project.category.toUpperCase()) + '</span><h2 id="dialog-title">' + escapeHTML(project.name) + '</h2><p>' + escapeHTML(project.overview) + '</p></div>' +
        '<span class="dialog-state">' + (demoPending ? "Demo verification pending" : "Demo available") + "</span>" +
      "</div>" +
      '<div class="dialog-columns">' +
        '<section class="dialog-block"><h3>What you can explore</h3><ul class="dialog-feature-list">' + features + "</ul></section>" +
        '<section class="dialog-block"><h3>Technology</h3><div class="stack-list">' + stack + '</div><h3 style="margin-top:21px">System path</h3><div class="architecture-flow">' + architecture + "</div></section>" +
      "</div>" +
      '<section class="dialog-block demo-readiness" style="margin-top:14px">' +
        "<h3>Recruiter demo environment</h3>" +
        '<p>' + escapeHTML(project.demoPlan || "The demo environment has not yet been verified.") + "</p>" +
        (demoPending ? '<div class="demo-warning">This project is in the rebuild queue. Its existing frontend URL, when listed below, is not represented as a complete working demo until the real API, required services, and key workflows have been checked.</div>' : "") +
        '<div class="dialog-status-line"><span>STATUS: ' + escapeHTML(titleCase(project.demoStatus)) + '</span><span>DATA POLICY: SYNTHETIC / ISOLATED</span></div>' +
        '<div class="dialog-repo-links">' + (publicFrontendLink ? publicFrontendLink : "") + sourceLinks.join("") + "</div>" +
      "</section>";
  };

  const openProject = (id) => {
    const project = state.projects.find((item) => item.id === id);
    if (!project || !dialog || !dialogContent) return;
    state.activeProject = project;
    previousFocus = document.activeElement;
    renderProjectDialog(project);
    if (typeof dialog.showModal === "function") {
      dialog.showModal();
      closeDialogButton?.focus();
    } else {
      dialog.setAttribute("open", "");
    }
  };

  projectGrid?.addEventListener("click", (event) => {
    const card = event.target.closest("[data-project-id]");
    if (card) openProject(card.dataset.projectId);
  });
  closeDialogButton?.addEventListener("click", () => dialog?.close());
  dialog?.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
  dialog?.addEventListener("close", () => {
    state.activeProject = null;
    if (previousFocus instanceof HTMLElement) previousFocus.focus();
  });

  /* ---------- External contribution graph ---------- */
  const activityList = $("#activity-list");
  const heatmap = $("#contribution-heatmap");
  const heatmapMonths = $("#heatmap-months");
  const repoSelect = $("#contribution-repository");

  const renderContributionGraph = () => {
    if (!heatmap || !heatmapMonths) return;
    const counts = new Map();
    state.activity.forEach((item) => {
      const key = String(item.mergedAt || "").slice(0, 10);
      if (/^\d{4}-\d{2}-\d{2}$/.test(key)) counts.set(key, (counts.get(key) || 0) + 1);
    });

    // A rolling year ending in the current week. The label and counts are limited
    // to merged PRs in repositories outside the account's own repositories.
    const today = new Date();
    const weekEnd = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
    weekEnd.setUTCDate(weekEnd.getUTCDate() + (6 - weekEnd.getUTCDay()));
    const weekStart = new Date(weekEnd);
    weekStart.setUTCDate(weekStart.getUTCDate() - (52 * 7 - 1));
    const cells = [];
    const monthLabels = Array.from({ length: 52 }, () => "");
    let current = new Date(weekStart);

    for (let week = 0; week < 52; week += 1) {
      const firstDay = new Date(current);
      if (firstDay.getUTCDate() <= 7) monthLabels[week] = monthFormatter.format(firstDay);
      for (let day = 0; day < 7; day += 1) {
        const key = dateKey(current);
        const count = counts.get(key) || 0;
        const level = count === 0 ? 0 : count === 1 ? 1 : count === 2 ? 2 : 3;
        const label = count + " merged external " + (count === 1 ? "PR" : "PRs") + " on " + formatDate(key);
        cells.push('<span class="heat-cell" data-level="' + level + '" title="' + escapeHTML(label) + '" aria-label="' + escapeHTML(label) + '"></span>');
        current.setUTCDate(current.getUTCDate() + 1);
      }
    }
    heatmapMonths.innerHTML = monthLabels.map((label) => "<span>" + escapeHTML(label) + "</span>").join("");
    heatmap.innerHTML = cells.join("");
  };

  const renderContributionList = () => {
    if (!activityList) return;
    const items = [...state.activity]
      .filter((item) => state.selectedRepository === "all" || item.repository === state.selectedRepository)
      .sort((a, b) => new Date(b.mergedAt) - new Date(a.mergedAt));
    activityList.innerHTML = items.length ? items.map((item) => {
      const repoLabel = item.repository || "Unknown repository";
      const date = formatDate(item.mergedAt);
      return '<a class="contribution-row" href="' + escapeHTML(item.url) + '" target="_blank" rel="noopener noreferrer">' +
        '<span class="contribution-repo">' + escapeHTML(repoLabel) + '</span>' +
        '<span class="contribution-detail"><strong>' + escapeHTML(item.title) + '</strong><span>' + escapeHTML(item.kind || "Merged contribution") + " · PR #" + Number(item.number) + '</span></span>' +
        '<time class="contribution-date" datetime="' + escapeHTML(item.mergedAt) + '">' + escapeHTML(date) + '</time>' +
        '<span class="contribution-arrow" aria-hidden="true">↗</span></a>';
    }).join("") : '<div class="loading-card">No matching contribution records.</div>';
  };

  const renderContributionFilters = () => {
    const repos = [...new Set(state.activity.map((item) => item.repository).filter(Boolean))].sort();
    repoSelect.innerHTML = '<option value="all">All repositories (' + state.activity.length + ')</option>' +
      repos.map((repo) => {
        const count = state.activity.filter((item) => item.repository === repo).length;
        return '<option value="' + escapeHTML(repo) + '">' + escapeHTML(repo) + " (" + count + ")</option>";
      }).join("");
  };
  repoSelect?.addEventListener("change", () => {
    state.selectedRepository = repoSelect.value;
    renderContributionList();
  });

  /* ---------- Verified release credits ---------- */
  const releaseGrid = $("#release-grid");
  const renderReleases = () => {
    if (!releaseGrid) return;
    releaseGrid.innerHTML = state.releases.map((item) =>
      '<article class="release-card">' +
        '<div class="release-card-top"><span class="release-project">' + escapeHTML(item.project) + '</span><span class="release-version">' + escapeHTML(item.version) + " · " + escapeHTML(item.releaseDate) + '</span></div>' +
        '<h3>' + escapeHTML(item.title) + '</h3><p>' + escapeHTML(item.summary) + '</p>' +
        '<div class="release-links"><a href="' + escapeHTML(item.release) + '" target="_blank" rel="noopener noreferrer">Official release notes ↗</a><a href="' + escapeHTML(item.pullRequest) + '" target="_blank" rel="noopener noreferrer">Merged pull request ↗</a></div>' +
      "</article>"
    ).join("");
  };

  const updateActivityFreshness = (activity) => {
    const element = $("#activity-updated");
    if (!element) return;
    element.textContent = "Snapshot · " + formatDate(activity.fetchedAt);
  };

  const loadAll = async () => {
    const [projectsResult, activityResult, releasesResult] = await Promise.allSettled([
      loadJSON("data/projects.json"),
      loadJSON("data/activity.json"),
      loadJSON("data/release-credits.json")
    ]);

    if (projectsResult.status === "fulfilled" && Array.isArray(projectsResult.value.projects)) {
      state.projects = projectsResult.value.projects;
      renderCategoryFilters();
      renderProjects();
    } else {
      setLoadingError("#project-grid", "The project library could not be loaded. Please use the source repository links or try again later.");
    }

    if (activityResult.status === "fulfilled" && Array.isArray(activityResult.value.items)) {
      state.activity = activityResult.value.items;
      $("#external-pr-total").textContent = String(state.activity.length);
      renderContributionGraph();
      renderContributionFilters();
      renderContributionList();
      updateActivityFreshness(activityResult.value);
    } else {
      setLoadingError("#activity-list", "Contribution records are temporarily unavailable.");
      heatmap && (heatmap.innerHTML = "");
    }

    if (releasesResult.status === "fulfilled" && Array.isArray(releasesResult.value.items)) {
      state.releases = releasesResult.value.items;
      renderReleases();
    } else {
      setLoadingError("#release-grid", "Verified release-credit records are temporarily unavailable.");
    }

    renderProjectCounts();
  };

  loadAll().catch((error) => {
    console.error("Portfolio data initialization failed:", error);
  });

  /* ---------- Small interaction feedback ---------- */
  const observerSupported = "IntersectionObserver" in window;
  if (observerSupported && !reducedMotion.matches) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-in-view");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08 });
    $$(".section-heading, .method-lead, .method-step, .closing-card").forEach((element) => observer.observe(element));
  }
})();