(() => {
  "use strict";

  const root = document.querySelector("#project-explorer");
  if (!root) return;

  const $ = (selector) => root.querySelector(selector);
  const imageStack = $("[data-showcase-image-stack]");
  const initialImage = $("[data-showcase-current]");
  const imageLink = $("[data-showcase-link]");
  const loading = $("[data-showcase-loading]");
  const indicators = $("[data-showcase-indicators]");
  const counter = $("[data-showcase-counter]");
  const position = $("[data-showcase-position]");
  const category = $("[data-showcase-category]");
  const name = $("[data-showcase-name]");
  const description = $("[data-showcase-description]");
  const address = $("[data-showcase-address]");
  const progress = $("[data-showcase-progress]");
  const timerCopy = $("[data-showcase-timer-copy]");
  const countdown = $("[data-showcase-countdown]");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const ROTATION_SECONDS = 5;

  const state = {
    projects: [],
    index: 0,
    currentImage: initialImage,
    pendingImage: null,
    interval: null,
    remainingSeconds: ROTATION_SECONDS,
    paused: false,
    hovered: false,
    focused: false,
    transitionToken: 0
  };

  const pad = (value) => String(value).padStart(2, "0");
  const assetUrl = (path) => new URL(path.replace(/^\.\//, ""), document.baseURI).href;

  const buildProjectList = (work, personal) => {
    const clientProjects = (Array.isArray(work.clientWork) ? work.clientWork : []).map((item) => ({
      id: item.id,
      name: item.name,
      type: "FREELANCE / CLIENT WORK",
      category: item.projectType || "CLIENT PROJECT",
      description: item.description,
      image: item.previewImage,
      url: item.url,
      external: true
    }));

    const internshipProjects = (Array.isArray(work.internshipWork) ? work.internshipWork : []).map((item) => ({
      id: item.id,
      name: item.name,
      type: "INTERNSHIP",
      category: item.projectType || "COMPANY PROJECT",
      description: item.description,
      image: item.previewImage,
      url: item.url,
      external: true
    }));

    const personalProjects = (Array.isArray(personal.projects) ? personal.projects : []).map((item) => ({
      id: item.id,
      name: item.name,
      type: "PERSONAL PROJECT",
      category: item.category || "SOFTWARE PRODUCT",
      description: item.oneLiner || item.overview || "A personal software project.",
      image: item.previewImage,
      url: item.appUrl || ("./project-lab.html?id=" + encodeURIComponent(item.id)),
      external: Boolean(item.appUrl)
    }));

    return [...clientProjects, ...internshipProjects, ...personalProjects]
      .filter((item) => item.id && item.name && item.image && item.url);
  };

  const updateProgress = () => {
    if (progress) {
      const elapsed = ROTATION_SECONDS - state.remainingSeconds;
      progress.style.width = ((elapsed / ROTATION_SECONDS) * 100) + "%";
    }
    if (timerCopy) timerCopy.textContent = state.paused ? "AUTO-PLAY PAUSED" : "NEXT PROJECT IN";
    if (countdown) countdown.textContent = state.remainingSeconds + "S";
    root.classList.toggle("is-paused", state.paused);
  };

  const shouldPause = () => state.hovered || state.focused || document.hidden || reducedMotion.matches;

  const startRotation = () => {
    window.clearInterval(state.interval);
    state.remainingSeconds = ROTATION_SECONDS;
    state.paused = shouldPause();
    updateProgress();

    if (reducedMotion.matches || state.projects.length < 2) return;

    state.interval = window.setInterval(() => {
      if (shouldPause()) {
        if (!state.paused) {
          state.paused = true;
          updateProgress();
        }
        return;
      }

      if (state.paused) {
        state.paused = false;
        updateProgress();
      }

      state.remainingSeconds = Math.max(0, state.remainingSeconds - 1);
      updateProgress();

      if (state.remainingSeconds === 0) {
        showProject(state.index + 1, true);
        state.remainingSeconds = ROTATION_SECONDS;
        updateProgress();
      }
    }, 1000);
  };

  const setPausedState = () => {
    const paused = shouldPause();
    if (paused === state.paused) return;
    state.paused = paused;
    updateProgress();
  };

  const updateLink = (project) => {
    imageLink.href = project.url;
    imageLink.target = project.external ? "_blank" : "_self";
    imageLink.rel = project.external ? "noopener noreferrer" : "";
    imageLink.setAttribute("aria-label", "Open " + project.name + " — " + project.type.toLowerCase());
  };

  const updateIndicators = () => {
    [...indicators.children].forEach((button, index) => {
      const active = index === state.index;
      button.setAttribute("aria-current", active ? "true" : "false");
      button.setAttribute("aria-label", "Show project " + (index + 1) + ": " + state.projects[index].name);
      button.title = state.projects[index].name;
    });
  };

  const updateCopy = (project) => {
    const number = pad(state.index + 1);
    const total = pad(state.projects.length);
    if (counter) counter.innerHTML = number + ' <span>/ ' + total + '</span>';
    if (position) position.textContent = number + " / " + total + " PROJECTS";
    if (category) category.textContent = project.type + " · " + project.category;
    if (name) name.textContent = project.name;
    if (description) description.textContent = project.description;
    if (address) address.textContent = project.external ? "PROJECT HOMEPAGE" : "PROJECT LAB / DETAILS";
    updateLink(project);
    updateIndicators();
  };

  const showProject = (requestedIndex, animate) => {
    if (!state.projects.length) return;
    const nextIndex = (requestedIndex + state.projects.length) % state.projects.length;
    if (nextIndex === state.index && root.classList.contains("is-ready")) return;

    state.index = nextIndex;
    const project = state.projects[nextIndex];
    updateCopy(project);

    const imageUrl = assetUrl(project.image);
    if (!animate || !state.currentImage || !root.classList.contains("is-ready")) {
      if (state.pendingImage) state.pendingImage.remove();
      state.currentImage.src = imageUrl;
      state.currentImage.alt = "Homepage preview of " + project.name;
      state.currentImage.className = "showcase-slide-image is-current";
      root.classList.add("is-ready");
      updateProgress();
      return;
    }

    const token = ++state.transitionToken;
    if (state.pendingImage) state.pendingImage.remove();

    const incoming = document.createElement("img");
    incoming.className = "showcase-slide-image is-entering effect-" + pad(nextIndex);
    incoming.alt = "Homepage preview of " + project.name;
    incoming.decoding = "async";
    incoming.src = imageUrl;
    state.pendingImage = incoming;
    imageStack.append(incoming);

    let finished = false;
    const finish = () => {
      if (finished || token !== state.transitionToken) return;
      finished = true;
      state.currentImage?.remove();
      incoming.className = "showcase-slide-image is-current";
      state.currentImage = incoming;
      state.pendingImage = null;
    };
    incoming.addEventListener("animationend", finish, { once: true });
    window.setTimeout(finish, 1450);
    updateProgress();
  };

  const renderIndicators = () => {
    indicators.replaceChildren();
    state.projects.forEach((project, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "showcase-indicator";
      button.dataset.projectIndex = String(index);
      button.setAttribute("aria-label", "Show project " + (index + 1) + ": " + project.name);
      button.addEventListener("click", () => {
        showProject(index, true);
        startRotation();
      });
      indicators.append(button);
    });
  };

  const preloadImages = () => {
    state.projects.forEach((project) => {
      const preload = new Image();
      preload.decoding = "async";
      preload.src = assetUrl(project.image);
    });
  };

  const loadProjects = async () => {
    try {
      const [workResponse, projectResponse] = await Promise.all([
        fetch("./data/work-showcase.json", { cache: "no-cache" }),
        fetch("./data/projects.json", { cache: "no-cache" })
      ]);
      if (!workResponse.ok || !projectResponse.ok) throw new Error("Project records could not be loaded.");
      const [work, personal] = await Promise.all([workResponse.json(), projectResponse.json()]);
      state.projects = buildProjectList(work, personal);
      if (!state.projects.length) throw new Error("No project previews are available.");

      renderIndicators();
      showProject(0, false);
      preloadImages();
      startRotation();
    } catch (error) {
      console.error("Explorer project showcase failed to load:", error);
      if (loading) loading.textContent = "Project previews are temporarily unavailable.";
      if (description) description.textContent = "Browse the full project collection below.";
      if (imageLink) {
        imageLink.href = "#products";
        imageLink.target = "_self";
        imageLink.setAttribute("aria-label", "Browse personal projects");
      }
    }
  };

  $("[data-showcase-prev]")?.addEventListener("click", () => {
    showProject(state.index - 1, true);
    startRotation();
  });
  $("[data-showcase-next]")?.addEventListener("click", () => {
    showProject(state.index + 1, true);
    startRotation();
  });

  root.addEventListener("pointerenter", () => {
    state.hovered = true;
    setPausedState();
  });
  root.addEventListener("pointerleave", () => {
    state.hovered = false;
    setPausedState();
  });
  root.addEventListener("focusin", () => {
    state.focused = true;
    setPausedState();
  });
  root.addEventListener("focusout", (event) => {
    if (!root.contains(event.relatedTarget)) {
      state.focused = false;
      setPausedState();
    }
  });
  document.addEventListener("visibilitychange", setPausedState);
  reducedMotion.addEventListener?.("change", () => {
    setPausedState();
    startRotation();
  });

  loadProjects();
})();