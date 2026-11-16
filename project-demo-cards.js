(() => {
  "use strict";

  const cardConfig = {
    frameflux: {
      className: "public-demo-card--frameflux",
      ariaLabel: "FrameFlux recruiter preview. Open the supplied preview or view project details."
    },
    "service-agreement-manager": {
      className: "public-demo-card--service-agreement",
      ariaLabel: "Service Agreement Manager recruiter preview. Open the supplied preview or view project details."
    }
  };

  const safePreviewUrl = (value) => {
    try {
      const url = new URL(String(value || ""), window.location.href);
      return url.protocol === "https:" && url.hostname.endsWith(".vercel.app") ? url.href : "";
    } catch {
      return "";
    }
  };

  const makeAnchor = (url, label) => {
    const anchor = document.createElement("a");
    anchor.className = "public-demo-launch";
    anchor.href = url;
    anchor.target = "_blank";
    anchor.rel = "noopener noreferrer";
    anchor.textContent = label;
    return anchor;
  };

  const enhanceCard = (project, grid) => {
    const config = cardConfig[project.id];
    const url = safePreviewUrl(project.recruiterDemoUrl);
    if (!config || !url) return;

    const original = grid.querySelector('.project-card[data-project-id="' + project.id + '"]');
    if (!original || original.dataset.publicDemoEnhanced === "true") return;

    const card = document.createElement("article");
    card.className = original.className + " public-demo-card " + config.className;
    card.dataset.publicDemoEnhanced = "true";
    card.setAttribute("role", "group");
    card.setAttribute("aria-label", config.ariaLabel);
    card.tabIndex = 0;
    while (original.firstChild) card.append(original.firstChild);

    const badge = document.createElement("span");
    badge.className = "public-demo-badge";
    badge.textContent = "RECRUITER PREVIEW · AVAILABILITY UNVERIFIED";
    const top = card.querySelector(".project-card-top");
    if (top) top.insertAdjacentElement("afterend", badge);

    const actions = document.createElement("div");
    actions.className = "public-demo-actions";
    actions.append(makeAnchor(url, "Open recruiter preview ↗"));

    const details = document.createElement("button");
    details.type = "button";
    details.className = "public-demo-details";
    details.dataset.projectId = project.id;
    details.textContent = "Project details";
    actions.append(details);
    card.append(actions);

    card.addEventListener("click", (event) => {
      if (event.target.closest("a, button")) return;
      window.open(url, "_blank", "noopener,noreferrer");
    });
    card.addEventListener("keydown", (event) => {
      if (event.target !== card || (event.key !== "Enter" && event.key !== " ")) return;
      event.preventDefault();
      window.open(url, "_blank", "noopener,noreferrer");
    });

    original.replaceWith(card);
  };

  const start = async () => {
    const grid = document.querySelector("#project-grid");
    if (!grid) return;
    let projects = [];
    const enhance = () => {
      for (const project of projects) enhanceCard(project, grid);
    };
    const observer = new MutationObserver(enhance);
    observer.observe(grid, { childList: true, subtree: true });

    try {
      const response = await fetch("./data/projects.json", {
        headers: { Accept: "application/json" },
        cache: "no-cache"
      });
      if (!response.ok) throw new Error("Project preview records unavailable.");
      const data = await response.json();
      projects = Array.isArray(data.projects) ? data.projects : [];
      enhance();
    } catch (error) {
      console.error("Recruiter preview cards could not load:", error);
    }
  };

  start();
})();
