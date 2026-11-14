(() => {
  "use strict";

  const root = document.documentElement;
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];

  /* ---------- Theme ---------- */
  const themeStorageKey = "faizan-portfolio-theme";
  const readTheme = () => {
    try {
      const stored = window.localStorage.getItem(themeStorageKey);
      if (stored === "dark" || stored === "light") return stored;
    } catch {
      // Storage can be unavailable in private or restricted browser contexts.
    }
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches
      ? "light"
      : "dark";
  };

  const applyTheme = (theme, persist = false) => {
    const isDark = theme === "dark";
    root.dataset.theme = isDark ? "dark" : "light";
    const button = $(".theme-button");
    if (button) {
      $(".theme-label", button)?.replaceChildren(document.createTextNode(isDark ? "Dark" : "Light"));
      button.setAttribute("aria-label", isDark ? "Switch to light theme" : "Switch to dark theme");
      button.setAttribute("aria-pressed", String(isDark));
    }
    $("meta[name='theme-color']")?.setAttribute("content", isDark ? "#080b0d" : "#efeee8");
    if (persist) {
      try {
        window.localStorage.setItem(themeStorageKey, isDark ? "dark" : "light");
      } catch {
        // The current-page theme still changes when storage is unavailable.
      }
    }
  };

  applyTheme(readTheme());
  $(".theme-button")?.addEventListener("click", () => {
    const next = root.dataset.theme === "dark" ? "light" : "dark";
    applyTheme(next, true);
  });

  /* ---------- Mobile navigation ---------- */
  const mobileNav = $("#mobile-nav");
  const menuButton = $("#menu-button");

  const closeMenu = () => {
    mobileNav?.classList.remove("is-open");
    menuButton?.setAttribute("aria-expanded", "false");
  };

  menuButton?.addEventListener("click", () => {
    const open = mobileNav?.classList.toggle("is-open") ?? false;
    menuButton?.setAttribute("aria-expanded", String(open));
  });

  $$("#mobile-nav a").forEach((link) => link.addEventListener("click", closeMenu));

  /* ---------- Scroll system ---------- */
  const progressBar = $(".reading-progress span");
  const updateProgress = () => {
    const total = document.documentElement.scrollHeight - window.innerHeight;
    const percent = total > 0 ? Math.min(100, (window.scrollY / total) * 100) : 0;
    if (progressBar) progressBar.style.width = percent + "%";
  };
  window.addEventListener("scroll", updateProgress, { passive: true });
  updateProgress();

  /* ---------- Pointer atmosphere ---------- */
  const pointerOrb = $(".pointer-orb");
  const stage = $("#stage-frame");

  if (window.matchMedia("(pointer:fine)").matches) {
    window.addEventListener("pointermove", (event) => {
      if (pointerOrb) {
        pointerOrb.style.left = event.clientX + "px";
        pointerOrb.style.top = event.clientY + "px";
      }

      if (!stage || prefersReducedMotion.matches) return;
      const rect = stage.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;

      if (x < -0.72 || x > 0.72 || y < -0.72 || y > 0.72) return;
      stage.style.transform =
        "perspective(950px) rotateX(" + (-y * 4) + "deg) rotateY(" + (x * 5) + "deg)";

      $$(".stage-chip", stage).forEach((chip, index) => {
        chip.style.transform =
          "translate(" + (x * (index + 1) * 8) + "px," + (y * (index + 1) * 6) + "px)";
      });
    }, { passive: true });

    stage?.addEventListener("pointerleave", () => {
      stage.style.transform = "";
      $$(".stage-chip", stage).forEach((chip) => chip.style.transform = "");
    });
  }

  /* ---------- Image fallback ---------- */
  const portrait = $("#profile-image");
  portrait?.addEventListener("error", () => {
    const fallback = portrait.dataset.fallback;
    if (!fallback || portrait.dataset.failed === "1") return;
    portrait.dataset.failed = "1";
    portrait.src = fallback;
    portrait.alt = "Faizan Saiyed — local profile fallback";
  }, { once: true });

  /* ---------- Project preview image loading states ---------- */
  // Each client and personal-project preview owns its own loading indicator.
  const projectPreviewImages = Array.from(document.querySelectorAll(".freelance-card-media, .personal-project-preview"));

  projectPreviewImages.forEach((preview) => {
    const image = $("img", preview);
    if (!image) return;

    const loader = document.createElement("span");
    loader.className = "preview-image-loader";
    loader.setAttribute("aria-hidden", "true");

    const loaderRing = document.createElement("span");
    loaderRing.className = "preview-image-loader-ring";

    const loaderLabel = document.createElement("span");
    loaderLabel.className = "preview-image-loader-label";
    loaderLabel.textContent = "Loading preview";

    loader.append(loaderRing, loaderLabel);
    preview.classList.add("is-image-loading");
    preview.append(loader);

    const markLoaded = () => {
      preview.classList.remove("is-image-loading", "is-image-error");
      preview.classList.add("is-image-loaded");
      loader.remove();
    };

    const markFailed = () => {
      preview.classList.remove("is-image-loading", "is-image-loaded");
      preview.classList.add("is-image-error");
      loader.classList.add("is-error");
      loaderRing.replaceWith(Object.assign(document.createElement("span"), {
        className: "preview-image-loader-error-mark",
        textContent: "!"
      }));
      loaderLabel.textContent = "Preview unavailable";
    };

    image.addEventListener("load", markLoaded, { once: true });
    image.addEventListener("error", markFailed, { once: true });

    // Cached images may finish before this script attaches its listeners.
    if (image.complete) {
      if (image.naturalWidth > 0) markLoaded();
      else markFailed();
    }
  });

  /* ---------- Project switcher ---------- */
  const projectTabs = $$(".project-tab");
  const projectPanels = $$(".project-panel");

  const activateProject = (name, moveToWork = false) => {
    projectTabs.forEach((tab) => {
      const active = tab.dataset.projectTab === name;
      tab.classList.toggle("is-active", active);
      tab.setAttribute("aria-selected", String(active));
    });

    projectPanels.forEach((panel) => {
      panel.classList.toggle("is-active", panel.dataset.projectPanel === name);
    });

    if (moveToWork) {
      $("#work")?.scrollIntoView({
        behavior: prefersReducedMotion.matches ? "auto" : "smooth",
        block: "start"
      });
    }
  };

  projectTabs.forEach((tab) => {
    tab.addEventListener("click", () => activateProject(tab.dataset.projectTab || "frameflux"));
  });

  /* ---------- Expanders ---------- */
  $$(".expand-button").forEach((button) => {
    button.addEventListener("click", () => {
      const id = button.getAttribute("aria-controls");
      const target = id ? document.getElementById(id) : null;
      if (!target) return;

      const open = target.hidden;
      target.hidden = !open;
      button.setAttribute("aria-expanded", String(open));

      if (open && !prefersReducedMotion.matches && target.animate) {
        target.animate(
          [
            { opacity: 0, transform: "translateY(-8px)" },
            { opacity: 1, transform: "translateY(0)" }
          ],
          { duration: 220, easing: "cubic-bezier(.22,.61,.36,1)" }
        );
      }
    });
  });

/* ---------- Portfolio guide / guided portfolio companion ---------- */
  const guidePanel = $("#guide-panel");
  const guideLauncher = $("#guide-launcher");
  const guideTopButton = $("#guide-top-button");
  const guideClose = $("#guide-close");
  const guideThread = $("#guide-thread");
  const guideActions = $("#guide-actions");
  const guideRestart = $("#guide-restart");
  const guideDock = $("#guide-dock");
  const guideContext = $("#guide-context");
  const guideProgress = $("#guide-progress");

  const guideState = {
    history: [],
    path: [],
    typing: false,
    currentNode: "start"
  };

  const guideFlow = {
    start: {
      context: "WELCOME",
      message: "Hi — welcome to Faizan's portfolio. What would you like to explore?",
      choices: [
        ["Show me the projects", "projects"],
        ["View professional experience", "experience"],
        ["How does he approach engineering?", "approach"],
        ["What's in the stack?", "stack"],
        ["What kind of engineer is he?", "profile"],
        ["Get in touch", "contact"]
      ]
    },
    projects: {
      context: "PROJECTS",
      message: "Explore the selected engineering case studies, browse the full-stack project index, or see work contributed to other projects.",
      choices: [
        ["Explore FrameFlux", "frameflux"],
        ["Explore Telemetry", "telemetry"],
        ["Open the full-stack project gallery", "goto-personal-projects"],
        ["See merged open-source contributions", "goto-opensource"],
        ["Explore client and industry work", "goto-freelance"],
        ["View professional experience", "goto-experience"],
        ["Back to start", "start"]
      ]
    },
    frameflux: {
      context: "FRAMEFLUX",
      message: "FrameFlux is an asynchronous media system built to keep heavy processing out of the request path. Explore the architecture, the case study, or the source.",
      choices: [
        ["See the FrameFlux case study", "goto-frameflux"],
        ["Architecture & workflow", "frameflux-architecture"],
        ["Open backend source", "link-frameflux-backend"],
        ["Open frontend source", "link-frameflux-frontend"],
        ["Back to projects", "projects"]
      ]
    },
    "frameflux-architecture": {
      context: "FRAMEFLUX / ARCHITECTURE",
      message: "The flow is explicit: upload state is persisted, validation happens before expensive work, Redis/ARQ queues background jobs, workers run FFmpeg processing, and progress remains visible to the client.",
      choices: [
        ["Open the case study", "goto-frameflux"],
        ["Explore Telemetry", "telemetry"],
        ["Back to projects", "projects"]
      ]
    },
    telemetry: {
      context: "TELEMETRY",
      message: "Telemetry is a realtime observability system where the backend owns live state, anomaly detection, alert lifecycle, persistence, authenticated streaming, and dashboard updates.",
      choices: [
        ["See the Telemetry case study", "goto-telemetry"],
        ["Architecture & realtime flow", "telemetry-architecture"],
        ["Open backend source", "link-telemetry-backend"],
        ["Open frontend source", "link-telemetry-frontend"],
        ["Back to projects", "projects"]
      ]
    },
    "telemetry-architecture": {
      context: "TELEMETRY / REALTIME",
      message: "Signals are detected and persisted on the backend, then streamed through WebSockets to the dashboard. The browser presents state; it does not become the authority for lifecycle or access control.",
      choices: [
        ["Open the case study", "goto-telemetry"],
        ["Explore FrameFlux", "frameflux"],
        ["Back to projects", "projects"]
      ]
    },
    experience: {
      context: "PROFESSIONAL EXPERIENCE",
      message: "Faizan contributed to the existing Gyansetu AI backend during his internship at IT Idol Technologies, refactoring Python/Flask code and working with PostgreSQL. The card includes the AWS technology tag and links to the live product and company.",
      choices: [
        ["View the experience card", "goto-experience"],
        ["Open Gyansetu AI", "link-gyansetu"],
        ["Visit IT Idol Technologies", "link-itidol"],
        ["Back to start", "start"]
      ]
    },
    "open-source": {
      context: "OPEN SOURCE",
      message: "This portfolio lists merged pull requests in the upstream repositories, with each card linking to the original change.",
      choices: [
        ["View merged contributions", "goto-opensource"],
        ["Browse personal projects", "goto-personal-projects"],
        ["Back to start", "start"]
      ]
    },
    freelance: {
      context: "FREELANCE WORK",
      message: "This section brings together two client-facing websites with genuine captures and Gyansetu AI, the education product Faizan contributed to during his backend internship.",
      choices: [
        ["Browse the client and industry cards", "goto-freelance"],
        ["Browse personal projects", "goto-personal-projects"],
        ["Back to start", "start"]
      ]
    },
    gallery: {
      context: "PERSONAL PROJECTS",
      message: "The full-stack gallery contains project screenshots, technology tags, live links when a deployment is verified, and links to the actual source repositories.",
      choices: [
        ["Browse the project gallery", "goto-personal-projects"],
        ["See merged open-source contributions", "goto-opensource"],
        ["Back to start", "start"]
      ]
    },
    approach: {
      context: "ENGINEERING APPROACH",
      message: "The portfolio keeps returning to four ideas: explicit state, clear ownership, validation before expensive work, and verification from the outside in.",
      choices: [
        ["Why explicit state?", "approach-state"],
        ["How is backend authority used?", "approach-authority"],
        ["How is reliability verified?", "approach-verification"],
        ["See systems thinking", "goto-systems"],
        ["Back to start", "start"]
      ]
    },
    "approach-state": {
      context: "APPROACH / STATE",
      message: "Long-running and realtime work is easier to trust when its state is explicit. Uploads, jobs, alerts, and simulation state can be observed, resumed, retried, and verified instead of being hidden inside a single request.",
      choices: [
        ["See a concrete example", "frameflux"],
        ["Back to approach", "approach"]
      ]
    },
    "approach-authority": {
      context: "APPROACH / OWNERSHIP",
      message: "The interface can guide the user, but important rules live where they can be enforced: backend authorization, durable state transitions, and system lifecycle decisions.",
      choices: [
        ["See it in Telemetry", "telemetry"],
        ["Back to approach", "approach"]
      ]
    },
    "approach-verification": {
      context: "APPROACH / VERIFICATION",
      message: "Verification moves from isolated behavior to integration and browser-level behavior. The goal is not just that code runs, but that the system remains understandable and trustworthy from the outside.",
      choices: [
        ["See the verification notes", "goto-systems"],
        ["Back to approach", "approach"]
      ]
    },
    stack: {
      context: "STACK",
      message: "The selected systems span backend APIs, durable data, asynchronous work, realtime transport, local AI inference and retrieval, media processing, frontend applications, and automated verification.",
      choices: [
        ["Backend", "stack-backend"],
        ["Frontend", "stack-frontend"],
        ["Data & infrastructure", "stack-systems"],
        ["See the full stack section", "goto-stack"],
        ["Back to start", "start"]
      ]
    },
    "stack-backend": {
      context: "STACK / BACKEND",
      message: "Python, FastAPI, Flask, Pydantic, SQLAlchemy, Alembic, Uvicorn, and Docker cover the backend work shown across the selected systems.",
      choices: [
        ["Explore FrameFlux", "frameflux"],
        ["Explore Telemetry", "telemetry"],
        ["Back to stack", "stack"]
      ]
    },
    "stack-frontend": {
      context: "STACK / FRONTEND",
      message: "React, Next.js, TypeScript, Vite, and Tailwind CSS appear across the frontend work. This portfolio itself is intentionally framework-free.",
      choices: [
        ["Explore Telemetry", "telemetry"],
        ["Back to stack", "stack"]
      ]
    },
    "stack-systems": {
      context: "STACK / SYSTEMS",
      message: "PostgreSQL provides durable state; pgvector supports retrieval for SupportAI, and Ollama runs its local generation model. Redis/ARQ handles background work, WebSockets carry live updates, FFmpeg handles media processing, and automated tests verify behavior.",
      choices: [
        ["See FrameFlux architecture", "frameflux-architecture"],
        ["See Telemetry architecture", "telemetry-architecture"],
        ["Back to stack", "stack"]
      ]
    },
    profile: {
      context: "ABOUT FAIZAN",
      message: "Faizan's work is centered on backend and full-stack engineering: APIs, realtime systems, asynchronous workflows, data, and interfaces that expose those systems clearly.",
      choices: [
        ["See the projects", "projects"],
        ["See the engineering approach", "approach"],
        ["Open contact", "contact"],
        ["Back to start", "start"]
      ]
    },
    contact: {
      context: "CONTACT",
      message: "Ready to continue the conversation? Open the contact section, LinkedIn, or GitHub.",
      choices: [
        ["Open contact section", "goto-contact"],
        ["Open LinkedIn", "link-linkedin"],
        ["Open GitHub", "link-github"],
        ["Back to start", "start"]
      ]
    }
  };

  const externalLinks = {
    "link-frameflux-backend": "https://github.com/faizansaiyed123/FrameFlux-Backend",
    "link-frameflux-frontend": "https://github.com/faizansaiyed123/FrameFlux-Frontend",
    "link-telemetry-backend": "https://github.com/faizansaiyed123/telemetry-backend",
    "link-telemetry-frontend": "https://github.com/faizansaiyed123/telemetry-frontend",
    "link-gyansetu": "https://www.gyansetu.ai/",
    "link-itidol": "https://itidoltechnologies.com/",
    "link-github": "https://github.com/faizansaiyed123",
    "link-linkedin": "https://www.linkedin.com/in/faizan-saiyed-52b289228/"
  };

  const setGuideContext = (value) => {
    if (guideContext) guideContext.textContent = value;
  };

  const updateGuideProgress = () => {
    const step = Math.min(9, guideState.path.length);
    if (guideProgress) guideProgress.textContent = step ? "STEP " + step : "READY";
  };

  const appendMessage = (message, role, type = false) => {
    const element = document.createElement("p");
    element.className = "guide-message guide-message-" + role;
    guideThread?.appendChild(element);

    if (!type || prefersReducedMotion.matches) {
      element.textContent = message;
      guideThread && (guideThread.scrollTop = guideThread.scrollHeight);
      return Promise.resolve(element);
    }

    guideState.typing = true;
    guideDock?.classList.add("is-thinking");

    return new Promise((resolve) => {
      let index = 0;
      const tick = () => {
        if (index >= message.length) {
          guideState.typing = false;
          guideDock?.classList.remove("is-thinking");
          guideThread && (guideThread.scrollTop = guideThread.scrollHeight);
          resolve(element);
          return;
        }

        element.appendChild(document.createTextNode(message[index]));
        index += 1;
        guideThread && (guideThread.scrollTop = guideThread.scrollHeight);
        window.setTimeout(tick, 5);
      };
      tick();
    });
  };

  const renderChoices = (choices = []) => {
    if (!guideActions) return;
    guideActions.replaceChildren();

    choices.forEach(([label, action]) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "guide-action";
      button.setAttribute("aria-label", "Choose " + label);

      const labelEl = document.createElement("span");
      labelEl.className = "guide-action-copy";
      labelEl.textContent = label;

      const iconEl = document.createElement("span");
      iconEl.className = "guide-action-icon";
      iconEl.textContent = "→";
      iconEl.setAttribute("aria-hidden", "true");

      button.append(labelEl, iconEl);
      button.addEventListener("click", async () => {
        if (guideState.typing) return;

        $$(".guide-action", guideActions).forEach((item) => {
          item.disabled = true;
          item.classList.remove("is-selected");
        });
        button.classList.add("is-selected");

        await handleChoice(label, action);
      });
      guideActions.appendChild(button);
    });
  };

  const scrollToSection = (id) => {
    document.getElementById(id)?.scrollIntoView({
      behavior: prefersReducedMotion.matches ? "auto" : "smooth",
      block: "start"
    });
  };

  const openGuide = () => {
    if (!guidePanel) return;
    guidePanel.hidden = false;
    guideLauncher?.setAttribute("aria-expanded", "true");
    guideTopButton?.setAttribute("aria-expanded", "true");
    guideDock?.classList.add("is-open");
    guideDock?.classList.remove("is-attention");

    if (!guideState.history.length) {
      void showNode("start");
    } else {
      renderChoices(guideFlow[guideState.currentNode]?.choices || []);
    }
  };

  const closeGuide = () => {
    guidePanel && (guidePanel.hidden = true);
    guideLauncher?.setAttribute("aria-expanded", "false");
    guideTopButton?.setAttribute("aria-expanded", "false");
    guideDock?.classList.remove("is-open", "is-thinking");
  };

  const handleRoute = async (label, action) => {
    await appendMessage(label, "user");
    guideState.history.push({ role: "user", content: label });
    guideState.path.push(action);
    updateGuideProgress();

    const responses = {
      "goto-work": "Taking you to the selected work.",
      "goto-experience": "Here is the professional experience card.",
      "goto-opensource": "Here are the merged open-source contributions.",
      "goto-freelance": "Here are the client and industry project cards.",
      "goto-personal-projects": "Opening the full-stack project index.",
      "goto-frameflux": "Here is the FrameFlux case study.",
      "goto-telemetry": "Here is the Telemetry case study.",
      "goto-systems": "Taking you to the systems-thinking section.",
      "goto-stack": "Taking you to the stack.",
      "goto-contact": "Taking you to the contact section."
    };

    await appendMessage(responses[action] || "Opening the selected section.", "bot", true);

    if (action === "goto-frameflux") activateProject("frameflux", true);
    else if (action === "goto-telemetry") activateProject("telemetry", true);
    else scrollToSection(action.replace("goto-", ""));

    renderChoices(guideFlow[guideState.currentNode]?.choices || []);
  };

  const handleExternalLink = async (label, action) => {
    const href = externalLinks[action];
    if (!href) return;

    await appendMessage(label, "user");
    guideState.history.push({ role: "user", content: label });
    guideState.path.push(action);
    updateGuideProgress();

    window.open(href, "_blank", "noopener,noreferrer");
    await appendMessage("Opening that link in a new tab.", "bot", true);
    renderChoices(guideFlow[guideState.currentNode]?.choices || []);
  };

  const showNode = async (id, userLabel) => {
    const node = guideFlow[id];
    if (!node || guideState.typing) return;

    if (userLabel) {
      await appendMessage(userLabel, "user");
      guideState.history.push({ role: "user", content: userLabel });
    }

    guideState.currentNode = id;
    guideState.path.push(id);
    updateGuideProgress();
    setGuideContext(node.context);

    await appendMessage(node.message, "bot", true);
    guideState.history.push({ role: "assistant", content: node.message });
    renderChoices(node.choices);
  };

  const handleChoice = async (label, action) => {
    if (guideState.typing) return;

    if (action === "close") {
      closeGuide();
      return;
    }

    if (externalLinks[action]) {
      await handleExternalLink(label, action);
      return;
    }

    if (action.startsWith("goto-")) {
      await handleRoute(label, action);
      return;
    }

    await showNode(action, label);
  };

  guideLauncher?.addEventListener("click", () => {
    if (guidePanel?.hidden) openGuide();
    else closeGuide();
  });
  guideTopButton?.addEventListener("click", openGuide);
  $("#hero-guide")?.addEventListener("click", openGuide);
  $("#mobile-guide")?.addEventListener("click", () => { closeMenu(); openGuide(); });
  $("#footer-guide")?.addEventListener("click", openGuide);
  guideClose?.addEventListener("click", closeGuide);

  guideRestart?.addEventListener("click", () => {
    guideState.history.length = 0;
    guideState.path.length = 0;
    guideState.currentNode = "start";
    guideThread?.replaceChildren();
    guideActions?.replaceChildren();
    setGuideContext("WELCOME");
    updateGuideProgress();
    void showNode("start");
  });

  
/* ---------- Guide context awareness ---------- */
  const sectionContext = {
    top: "HOME",
    work: "WORK",
    experience: "PROFESSIONAL EXPERIENCE",
    opensource: "OPEN SOURCE",
    freelance: "CLIENT + INDUSTRY WORK",
    "personal-projects": "PROJECT GALLERY",
    systems: "SYSTEMS",
    stack: "STACK",
    contact: "CONTACT"
  };

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver((entries) => {
      const current = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

      if (current?.target?.id) setGuideContext(sectionContext[current.target.id] || "HOME");
    }, { rootMargin: "-35% 0px -55% 0px", threshold: [0.05, 0.2, 0.5] });

    Object.keys(sectionContext).forEach((id) => {
      const section = document.getElementById(id);
      if (section) observer.observe(section);
    });
  }

  /* ---------- Command palette ---------- */
  const commandBar = $("#command-bar");
  const commandInput = $("#command-input");
  const commandResults = $("#command-results");
  const commands = [
    ["Selected work", "Engineering case studies", "work"],
    ["Professional experience", "IT Idol Technologies · Gyansetu AI", "experience"],
    ["Open-source contributions", "17 merged pull requests", "opensource"],
    ["Client + industry work", "Jeca Homes · PrintOscar · Gyansetu AI", "freelance"],
    ["Personal full-stack projects", "Screenshots and technology filters", "personal-projects"],
    ["Systems thinking", "Method", "systems"],
    ["Stack", "Tools", "stack"],
    ["Contact", "Open channel", "contact"],
    ["Open portfolio guide", "Ask Faizan", "__guide__"],
    ["FrameFlux", "Async media system", "frameflux"],
    ["Telemetry", "Realtime observability", "telemetry"]
  ];

  const closeCommand = () => {
    if (commandBar) commandBar.hidden = true;
  };

  const renderCommands = (query = "") => {
    if (!commandResults) return;

    const q = normalize(query);
    commandResults.replaceChildren();

    commands
      .filter(([title, type]) => !q || normalize(title + " " + type).includes(q))
      .forEach(([title, type, target]) => {
        const item = document.createElement("button");
        item.type = "button";
        item.className = "command-result";

        const titleEl = document.createElement("b");
        titleEl.textContent = title;
        const typeEl = document.createElement("span");
        typeEl.textContent = type;

        item.append(titleEl, typeEl);
        item.addEventListener("click", () => {
          closeCommand();
          if (target === "__guide__") return openGuide();
          if (target === "frameflux" || target === "telemetry") activateProject(target);
          scrollToSection(target === "frameflux" || target === "telemetry" ? "work" : target);
        });

        commandResults.appendChild(item);
      });
  };

  const openCommand = () => {
    if (!commandBar) return;
    commandBar.hidden = false;
    renderCommands();
    if (commandInput) {
      commandInput.value = "";
      window.setTimeout(() => commandInput.focus(), 30);
    }
  };

  $("#command-close")?.addEventListener("click", closeCommand);
  commandInput?.addEventListener("input", () => renderCommands(commandInput.value));
  commandBar?.addEventListener("click", (event) => {
    if (event.target === commandBar) closeCommand();
  });

  /* ---------- Keyboard shortcuts ---------- */
  document.addEventListener("keydown", (event) => {
    const target = event.target;
    const isTyping =
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      target instanceof HTMLSelectElement ||
      target?.isContentEditable;

    if (event.key === "/" && !isTyping) {
      if (guidePanel && !guidePanel.hidden) return;
      event.preventDefault();
      openCommand();
    }

    if (event.key === "Escape") {
      closeCommand();
      closeGuide();
      closeMenu();
    }
  });


  /* ---------- Personal project technology filters ---------- */
  const projectFilterButtons = $$(".project-filter-button");
  const personalProjectCards = $$(".personal-project-card");
  const projectResultsCount = $("#project-results-count");
  const applyProjectFilter = (technology = "all") => {
    let visible = 0;
    personalProjectCards.forEach((card) => {
      const technologies = (card.dataset.techs || "").split(/\s+/).filter(Boolean);
      const matches = technology === "all" || technologies.includes(technology);
      card.hidden = !matches;
      if (matches) visible += 1;
    });

    projectFilterButtons.forEach((button) => {
      const active = button.dataset.projectFilter === technology;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });

    if (projectResultsCount) {
      projectResultsCount.textContent = technology === "all"
        ? "Showing all " + visible + " projects"
        : "Showing " + visible + " of " + personalProjectCards.length + " projects";
    }
  };

  projectFilterButtons.forEach((button) => {
    button.addEventListener("click", () => applyProjectFilter(button.dataset.projectFilter || "all"));
  });
  if (projectFilterButtons.length && personalProjectCards.length) applyProjectFilter("all");

  /* ---------- Footer / date ---------- */
  const year = $("#year");
  if (year) year.textContent = String(new Date().getFullYear());

  /* ---------- Small attention cue ---------- */
  window.setTimeout(() => {
    if (!guidePanel || guidePanel.hidden) guideDock?.classList.add("is-attention");
  }, 4800);

  guideLauncher?.addEventListener("click", () => guideDock?.classList.remove("is-attention"), { once: true });

  // Initialize the guide progress using the current decision-tree state.
  updateGuideProgress();


  /* ---------- Cursor-reactive open-source contribution cards ---------- */
  // A dedicated blue/violet cursor bloom for this section only.
  const openSourceContributionCards = $("#opensource .contribution-card");

  if (openSourceContributionCards.length) {
    const reduceOpenSourceMotion = prefersReducedMotion.matches;

    openSourceContributionCards.forEach((card) => {
      const spotlight = document.createElement("span");
      spotlight.className = "opensource-cursor-spotlight";
      spotlight.setAttribute("aria-hidden", "true");

      const dotGrid = document.createElement("span");
      dotGrid.className = "opensource-cursor-grid";
      dotGrid.setAttribute("aria-hidden", "true");

      const trailCanvas = document.createElement("canvas");
      trailCanvas.className = "opensource-cursor-trail";
      trailCanvas.setAttribute("aria-hidden", "true");

      card.append(spotlight, dotGrid, trailCanvas);

      const trailContext = trailCanvas.getContext("2d");
      const trailPoints = [];
      let trailFrame = 0;
      let previousPoint = null;
      let currentPoint = null;

      const getPalette = () => (
        document.documentElement.dataset.theme === "light"
          ? [
              { hex: "#3157D5", rgb: "49, 87, 213" },
              { hex: "#7540C7", rgb: "117, 64, 199" }
            ]
          : [
              { hex: "#4C6FFF", rgb: "76, 111, 255" },
              { hex: "#9B5CFF", rgb: "155, 92, 255" }
            ]
      );

      const resizeTrail = () => {
        if (!trailContext) return;
        const bounds = card.getBoundingClientRect();
        const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
        trailCanvas.width = Math.max(1, Math.round(bounds.width * pixelRatio));
        trailCanvas.height = Math.max(1, Math.round(bounds.height * pixelRatio));
        trailContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
        if (currentPoint) paintStaticGlow();
      };

      const drawBloom = (x, y, radius, rgb, alpha) => {
        if (!trailContext || alpha <= 0) return;
        const gradient = trailContext.createRadialGradient(x, y, 0, x, y, radius);
        gradient.addColorStop(0, "rgba(" + rgb + ", " + alpha + ")");
        gradient.addColorStop(.3, "rgba(" + rgb + ", " + (alpha * .58) + ")");
        gradient.addColorStop(.68, "rgba(" + rgb + ", " + (alpha * .16) + ")");
        gradient.addColorStop(1, "rgba(" + rgb + ", 0)");
        trailContext.fillStyle = gradient;
        trailContext.fillRect(x - radius, y - radius, radius * 2, radius * 2);
      };

      const paintPointGlow = (point, strength) => {
        const life = Math.max(0, point.life);
        const alpha = strength * life;
        const palette = getPalette();

        drawBloom(point.x - 12, point.y + 7, 108, palette[0].rgb, alpha * .72);
        drawBloom(point.x + 18, point.y - 14, 96, palette[1].rgb, alpha * .68);
      };

      const paintStaticGlow = () => {
        if (!trailContext || !currentPoint) return;
        trailContext.clearRect(0, 0, card.clientWidth, card.clientHeight);
        trailContext.globalCompositeOperation = "lighter";
        paintPointGlow(currentPoint, .56);
        trailContext.globalCompositeOperation = "source-over";
      };

      const paintTrail = () => {
        trailFrame = 0;
        if (!trailContext) return;

        trailContext.clearRect(0, 0, card.clientWidth, card.clientHeight);
        trailContext.globalCompositeOperation = "lighter";

        for (let index = trailPoints.length - 1; index >= 0; index -= 1) {
          trailPoints[index].life -= .026;
          if (trailPoints[index].life <= 0) trailPoints.splice(index, 1);
        }

        trailPoints.forEach((point, index) => {
          const isNewest = index === trailPoints.length - 1;
          const strength = isNewest ? .56 : .18;
          const progress = index / Math.max(1, trailPoints.length - 1);
          paintPointGlow(point, strength * progress + (isNewest ? .24 : 0));

          if (index > 0) {
            const previous = trailPoints[index - 1];
            const alpha = Math.min(previous.life, point.life) * progress;
            const distance = Math.max(
              Math.abs(point.x - previous.x),
              Math.abs(point.y - previous.y)
            );
            const stamps = Math.max(1, Math.ceil(distance / 4));
            const squareSize = alpha > .62 ? 7 : 4;

            trailContext.globalAlpha = alpha * .72;
            trailContext.fillStyle = point.color;

            for (let stamp = 0; stamp <= stamps; stamp += 1) {
              const step = stamp / stamps;
              const x = Math.round((previous.x + (point.x - previous.x) * step) / 3) * 3;
              const y = Math.round((previous.y + (point.y - previous.y) * step) / 3) * 3;
              trailContext.fillRect(
                x - squareSize / 2,
                y - squareSize / 2,
                squareSize,
                squareSize
              );
            }
          }
        });

        trailContext.globalAlpha = 1;
        trailContext.globalCompositeOperation = "source-over";

        if (trailPoints.length) {
          trailFrame = window.requestAnimationFrame(paintTrail);
        }
      };

      const onPointerMove = (event) => {
        if (event.pointerType === "touch") return;

        const bounds = card.getBoundingClientRect();
        const x = Math.max(0, Math.min(bounds.width, event.clientX - bounds.left));
        const y = Math.max(0, Math.min(bounds.height, event.clientY - bounds.top));

        card.style.setProperty("--oss-cursor-x", x + "px");
        card.style.setProperty("--oss-cursor-y", y + "px");
        card.classList.add("is-oss-pointer-active");

        currentPoint = { x, y, life: 1, color: getPalette()[0].hex };

        if (reduceOpenSourceMotion || !trailContext) {
          paintStaticGlow();
          return;
        }

        const palette = getPalette();
        const colour = palette[trailPoints.length % palette.length];
        const point = { ...currentPoint, color: colour.hex };

        if (previousPoint) {
          const distance = Math.hypot(point.x - previousPoint.x, point.y - previousPoint.y);
          if (distance < 2) return;
        }

        trailPoints.push(point);
        if (trailPoints.length > 30) trailPoints.shift();
        previousPoint = point;

        if (!trailFrame) {
          trailFrame = window.requestAnimationFrame(paintTrail);
        }
      };

      const onPointerLeave = () => {
        card.classList.remove("is-oss-pointer-active");
        previousPoint = null;
        currentPoint = null;

        if (reduceOpenSourceMotion) {
          if (trailContext) {
            trailContext.clearRect(0, 0, card.clientWidth, card.clientHeight);
          }
          return;
        }

        trailPoints.forEach((point) => {
          point.life = Math.min(point.life, .22);
        });

        if (trailContext && trailPoints.length && !trailFrame) {
          trailFrame = window.requestAnimationFrame(paintTrail);
        }
      };

      resizeTrail();

      if (typeof ResizeObserver === "function") {
        const resizeObserver = new ResizeObserver(resizeTrail);
        resizeObserver.observe(card);
      } else {
        window.addEventListener("resize", resizeTrail, { passive: true });
      }

      card.addEventListener("pointermove", onPointerMove, { passive: true });
      card.addEventListener("pointerleave", onPointerLeave);
      card.addEventListener("pointercancel", onPointerLeave);
    });
  }

  /* ---------- Cursor-reactive project image previews ---------- */
  // A layered colour bloom and fading pixel trail, scoped to each preview image.
  const imagePreviewTargets = $$(".freelance-card-media, .personal-project-preview");

  if (imagePreviewTargets.length) {
    const reduceImageMotion = prefersReducedMotion.matches;
    const imageTrailPalette = [
      { hex: "#4C6EFF", rgb: "76, 110, 255" },
      { hex: "#B84DFF", rgb: "184, 77, 255" },
      { hex: "#F044A6", rgb: "240, 68, 166" },
      { hex: "#25D7F2", rgb: "37, 215, 242" },
      { hex: "#FFC247", rgb: "255, 194, 71" }
    ];

    imagePreviewTargets.forEach((preview) => {
      const spotlight = document.createElement("span");
      spotlight.className = "portfolio-image-spotlight";
      spotlight.setAttribute("aria-hidden", "true");

      const dotGrid = document.createElement("span");
      dotGrid.className = "portfolio-image-grid";
      dotGrid.setAttribute("aria-hidden", "true");

      const trailCanvas = document.createElement("canvas");
      trailCanvas.className = "portfolio-image-trail";
      trailCanvas.setAttribute("aria-hidden", "true");

      preview.classList.add("has-cursor-effects");
      preview.append(spotlight, dotGrid, trailCanvas);

      const trailContext = trailCanvas.getContext("2d");
      const trailPoints = [];
      let trailFrame = 0;
      let trailColorIndex = 0;
      let previousPoint = null;
      let currentPoint = null;

      const resizeTrail = () => {
        if (!trailContext) return;
        const bounds = preview.getBoundingClientRect();
        const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
        trailCanvas.width = Math.max(1, Math.round(bounds.width * pixelRatio));
        trailCanvas.height = Math.max(1, Math.round(bounds.height * pixelRatio));
        trailContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
        if (currentPoint) paintStaticGlow();
      };

      const drawBloom = (x, y, radius, rgb, alpha) => {
        if (!trailContext || alpha <= 0) return;
        const gradient = trailContext.createRadialGradient(x, y, 0, x, y, radius);
        gradient.addColorStop(0, "rgba(" + rgb + ", " + alpha + ")");
        gradient.addColorStop(0.28, "rgba(" + rgb + ", " + (alpha * 0.62) + ")");
        gradient.addColorStop(0.62, "rgba(" + rgb + ", " + (alpha * 0.2) + ")");
        gradient.addColorStop(1, "rgba(" + rgb + ", 0)");
        trailContext.fillStyle = gradient;
        trailContext.fillRect(x - radius, y - radius, radius * 2, radius * 2);
      };

      const paintPointGlow = (point, strength) => {
        const life = Math.max(0, point.life);
        const alpha = strength * life;
        // Three overlapping hues create a blended, colourful aura behind the pointer.
        drawBloom(point.x - 18, point.y + 8, 126, "76, 110, 255", alpha * 0.78);
        drawBloom(point.x + 22, point.y - 17, 112, "184, 77, 255", alpha * 0.76);
        drawBloom(point.x + 5, point.y + 18, 94, "240, 68, 166", alpha * 0.58);
        drawBloom(point.x + 34, point.y + 30, 104, "37, 215, 242", alpha * 0.44);
        drawBloom(point.x - 34, point.y - 24, 84, "255, 194, 71", alpha * 0.35);
      };

      const paintStaticGlow = () => {
        if (!trailContext || !currentPoint) return;
        trailContext.clearRect(0, 0, preview.clientWidth, preview.clientHeight);
        trailContext.globalCompositeOperation = "lighter";
        paintPointGlow(currentPoint, 0.68);
        trailContext.globalCompositeOperation = "source-over";
      };

      const paintTrail = () => {
        trailFrame = 0;
        if (!trailContext) return;

        trailContext.clearRect(0, 0, preview.clientWidth, preview.clientHeight);
        trailContext.globalCompositeOperation = "lighter";

        for (let index = trailPoints.length - 1; index >= 0; index -= 1) {
          trailPoints[index].life -= 0.022;
          if (trailPoints[index].life <= 0) trailPoints.splice(index, 1);
        }

        trailPoints.forEach((point, index) => {
          const isNewest = index === trailPoints.length - 1;
          const strength = isNewest ? 0.62 : 0.23;
          paintPointGlow(point, strength * (index / Math.max(1, trailPoints.length - 1)) * 0.72 + (isNewest ? 0.3 : 0));

          if (index > 0) {
            const previous = trailPoints[index - 1];
            const alpha = Math.min(previous.life, point.life) * (index / trailPoints.length);
            const distance = Math.max(
              Math.abs(point.x - previous.x),
              Math.abs(point.y - previous.y)
            );
            const stamps = Math.max(1, Math.ceil(distance / 3));
            const squareSize = alpha > 0.65 ? 9 : 5;

            trailContext.globalAlpha = alpha * 0.92;
            trailContext.fillStyle = point.color;

            for (let stamp = 0; stamp <= stamps; stamp += 1) {
              const progress = stamp / stamps;
              const x = Math.round((previous.x + (point.x - previous.x) * progress) / 3) * 3;
              const y = Math.round((previous.y + (point.y - previous.y) * progress) / 3) * 3;
              trailContext.fillRect(
                x - squareSize / 2,
                y - squareSize / 2,
                squareSize,
                squareSize
              );
            }
          }
        });

        trailContext.globalAlpha = 1;
        trailContext.globalCompositeOperation = "source-over";
        if (trailPoints.length) trailFrame = window.requestAnimationFrame(paintTrail);
      };

      const onPointerMove = (event) => {
        if (event.pointerType === "touch") return;

        const bounds = preview.getBoundingClientRect();
        const x = Math.max(0, Math.min(bounds.width, event.clientX - bounds.left));
        const y = Math.max(0, Math.min(bounds.height, event.clientY - bounds.top));
        preview.style.setProperty("--image-cursor-x", x + "px");
        preview.style.setProperty("--image-cursor-y", y + "px");
        preview.classList.add("is-pointer-active");

        const colour = imageTrailPalette[trailColorIndex % imageTrailPalette.length];
        currentPoint = { x, y, life: 1, color: colour.hex };

        if (reduceImageMotion || !trailContext) {
          paintStaticGlow();
          return;
        }

        const point = { ...currentPoint, color: colour.hex };
        if (previousPoint) {
          const distance = Math.hypot(point.x - previousPoint.x, point.y - previousPoint.y);
          if (distance < 2) return;
        }

        trailColorIndex += 1;
        trailPoints.push(point);
        if (trailPoints.length > 42) trailPoints.shift();
        previousPoint = point;
        if (!trailFrame) trailFrame = window.requestAnimationFrame(paintTrail);
      };

      const onPointerLeave = () => {
        preview.classList.remove("is-pointer-active");
        previousPoint = null;
        currentPoint = null;

        if (reduceImageMotion) {
          if (trailContext) trailContext.clearRect(0, 0, preview.clientWidth, preview.clientHeight);
          return;
        }

        trailPoints.forEach((point) => {
          point.life = Math.min(point.life, 0.28);
        });
        if (trailContext && trailPoints.length && !trailFrame) {
          trailFrame = window.requestAnimationFrame(paintTrail);
        }
      };

      resizeTrail();
      if (typeof ResizeObserver === "function") {
        const resizeObserver = new ResizeObserver(resizeTrail);
        resizeObserver.observe(preview);
      } else {
        window.addEventListener("resize", resizeTrail, { passive: true });
      }

      preview.addEventListener("pointermove", onPointerMove, { passive: true });
      preview.addEventListener("pointerleave", onPointerLeave);
      preview.addEventListener("pointercancel", onPointerLeave);
    });
  }


  /* ---------- Mini Faizan artwork welcome sequence ---------- */
  const welcomeMascot = $("#welcome-mascot");
  const welcomeReplay = $("#welcome-mascot-replay");
  const welcomeClose = $("#welcome-mascot-close");

  if (welcomeMascot && welcomeReplay) {
    let welcomeTimers = [];

    const clearWelcomeTimers = () => {
      welcomeTimers.forEach((timer) => window.clearTimeout(timer));
      welcomeTimers = [];
    };

    const finishWelcome = () => {
      clearWelcomeTimers();
      welcomeMascot.hidden = true;
      welcomeMascot.classList.remove("is-visible", "is-entering", "is-greeting", "is-running", "is-exiting", "is-dismissed");
      welcomeReplay.hidden = false;
    };

    const startWelcome = () => {
      clearWelcomeTimers();
      welcomeReplay.hidden = true;
      welcomeMascot.hidden = false;
      welcomeMascot.classList.remove("is-visible", "is-entering", "is-greeting", "is-running", "is-exiting", "is-dismissed");
      void welcomeMascot.offsetWidth;
      welcomeMascot.classList.add("is-visible", "is-entering");

      if (prefersReducedMotion.matches) {
        welcomeMascot.classList.remove("is-entering");
        welcomeMascot.classList.add("is-greeting");
        welcomeTimers.push(window.setTimeout(() => {
          welcomeMascot.classList.add("is-dismissed");
        }, 3900));
        welcomeTimers.push(window.setTimeout(finishWelcome, 4160));
        return;
      }

      welcomeTimers.push(window.setTimeout(() => {
        welcomeMascot.classList.remove("is-entering");
        welcomeMascot.classList.add("is-greeting");
      }, 820));

      welcomeTimers.push(window.setTimeout(() => {
        welcomeMascot.classList.remove("is-greeting");
        welcomeMascot.classList.add("is-running", "is-exiting");
      }, 3300));

      welcomeTimers.push(window.setTimeout(finishWelcome, 4650));
    };

    welcomeReplay.addEventListener("click", startWelcome);
    welcomeClose?.addEventListener("click", () => {
      clearWelcomeTimers();
      welcomeMascot.classList.remove("is-entering", "is-greeting", "is-running", "is-exiting");
      welcomeMascot.classList.add("is-dismissed");
      welcomeTimers.push(window.setTimeout(finishWelcome, 240));
    });

    let alreadyWelcomed = false;
    try {
      alreadyWelcomed = window.sessionStorage.getItem("faizan-portfolio-welcomed") === "1";
      if (!alreadyWelcomed) window.sessionStorage.setItem("faizan-portfolio-welcomed", "1");
    } catch {
      // Session storage is optional; the welcome still works for this visit.
    }

    if (alreadyWelcomed) {
      welcomeReplay.hidden = false;
    } else {
      welcomeTimers.push(window.setTimeout(startWelcome, 550));
    }
  }


  /* ---------- Portfolio proof counts ---------- */
  const proofCounts = {
    projects: $(".personal-project-card").length,
    contributions: $(".contribution-card").length,
    clientBuilds: $("#freelance .freelance-card").length
  };
  $("[data-count-source]").forEach((element) => {
    const count = proofCounts[element.dataset.countSource];
    if (Number.isFinite(count)) {
      element.textContent = element.dataset.countSource === "clientBuilds"
        ? String(count).padStart(2, "0")
        : String(count);
    }
  });

  /* ---------- Open-source contribution filters ---------- */
  const contributionCards = $(".contribution-card");
  const contributionFilterButtons = $(".contribution-filter-button");
  const contributionResults = $("#contribution-results");

  const contributionGroupFor = (card) => {
    const repository = $(".contribution-repo", card)?.textContent.toLowerCase() || "";
    if (repository.includes("ci agent audit")) return "ci-agent-audit";
    if (repository.includes("sentry")) return "sentry";
    if (repository.includes("ansible")) return "ansible";
    return "other";
  };

  contributionCards.forEach((card, index) => {
    card.dataset.contributionGroup = contributionGroupFor(card);
    if (index < 4) card.classList.add("is-featured-contribution");
  });

  const contributionTotals = { all: contributionCards.length };
  contributionCards.forEach((card) => {
    const group = card.dataset.contributionGroup;
    contributionTotals[group] = (contributionTotals[group] || 0) + 1;
  });

  contributionFilterButtons.forEach((button) => {
    const group = button.dataset.contributionFilter || "all";
    const count = contributionTotals[group] || 0;
    const countNode = $("[data-filter-count]", button);
    if (countNode) countNode.textContent = String(count);
    button.addEventListener("click", () => {
      const selectedGroup = button.dataset.contributionFilter || "all";
      let visible = 0;
      contributionCards.forEach((card) => {
        const matches = selectedGroup === "all" || card.dataset.contributionGroup === selectedGroup;
        card.hidden = !matches;
        if (matches) visible += 1;
      });
      contributionFilterButtons.forEach((candidate) => {
        const active = candidate === button;
        candidate.classList.toggle("is-active", active);
        candidate.setAttribute("aria-pressed", String(active));
      });
      if (contributionResults) {
        contributionResults.textContent = selectedGroup === "all"
          ? "Showing all " + visible + " merged contributions"
          : "Showing " + visible + " of " + contributionCards.length + " merged contributions";
      }
    });
  });

  /* ---------- Trace Mode: source-linked engineering walkthrough ---------- */
  const traceSystems = {
    frameflux: {
      label: "FRAMEFLUX / ASYNC MEDIA PIPELINE",
      steps: [
        {
          title: "Make upload progress explicit.",
          type: "UPLOAD STATE",
          description: "Upload progress is recorded in Redis with an upload identifier, user association, status, bounded percentage, optional byte totals, and an expiry.",
          decision: "Progress is modeled as queryable state. The read path checks the user association before returning the upload record.",
          source: "https://github.com/faizansaiyed123/FrameFlux-Backend/blob/main/app/features/media/upload_progress.py",
          sourceLabel: "app/features/media/upload_progress.py",
          test: "https://github.com/faizansaiyed123/FrameFlux-Backend/blob/main/tests/test_validation_and_uploads.py",
          testLabel: "tests/test_validation_and_uploads.py"
        },
        {
          title: "Persist the job lifecycle.",
          type: "DURABLE JOB STATE",
          description: "Processing jobs are created with a queued state and persisted through the database session. Updates can carry status, progress, stage, error details, output names, and lifecycle timestamps.",
          decision: "The job record gives the interface a durable state model instead of relying only on a worker's transient response.",
          source: "https://github.com/faizansaiyed123/FrameFlux-Backend/blob/main/app/features/jobs/service.py",
          sourceLabel: "app/features/jobs/service.py",
          test: "https://github.com/faizansaiyed123/FrameFlux-Backend/blob/main/tests/test_status_and_jobs.py",
          testLabel: "tests/test_status_and_jobs.py"
        },
        {
          title: "Move expensive work to workers.",
          type: "BACKGROUND EXECUTION",
          description: "The ARQ worker registers media task functions and receives its Redis connection through worker startup and shutdown hooks.",
          decision: "Long-running media operations are dispatched as background tasks so the request path does not have to perform the full transformation.",
          source: "https://github.com/faizansaiyed123/FrameFlux-Backend/blob/main/app/infrastructure/worker.py",
          sourceLabel: "app/infrastructure/worker.py",
          test: "https://github.com/faizansaiyed123/FrameFlux-Backend/blob/main/tests/test_media_processing_and_editing.py",
          testLabel: "tests/test_media_processing_and_editing.py"
        },
        {
          title: "Keep processing stages inspectable.",
          type: "MEDIA TASKS",
          description: "The worker is wired to concrete task handlers for compression, conversion, editing, merging, transforms, overlays, splitting, clips, and workflow execution.",
          decision: "Task registration makes the supported work explicit and keeps execution concerns in the worker layer.",
          source: "https://github.com/faizansaiyed123/FrameFlux-Backend/blob/main/app/infrastructure/tasks.py",
          sourceLabel: "app/infrastructure/tasks.py",
          test: "https://github.com/faizansaiyed123/FrameFlux-Backend/blob/main/tests/test_media_processing_and_editing.py",
          testLabel: "tests/test_media_processing_and_editing.py"
        },
        {
          title: "Verify the lifecycle from the API.",
          type: "REGRESSION COVERAGE",
          description: "The job-status tests exercise queued, processing, completed, and failed responses, including returned progress and output details.",
          decision: "The user-facing contract is checked at the API boundary, not only by testing isolated helper functions.",
          source: "https://github.com/faizansaiyed123/FrameFlux-Backend/blob/main/app/features/jobs/routes.py",
          sourceLabel: "app/features/jobs/routes.py",
          test: "https://github.com/faizansaiyed123/FrameFlux-Backend/blob/main/tests/test_status_and_jobs.py",
          testLabel: "tests/test_status_and_jobs.py"
        }
      ]
    },
    telemetry: {
      label: "TELEMETRY / INGESTION TO REALTIME",
      steps: [
        {
          title: "Accept scoped telemetry batches.",
          type: "INGESTION",
          description: "The ingestion endpoint checks the host associated with the API key, persists the accepted batch, and sends accepted events through the telemetry manager.",
          decision: "The ingest path is host-scoped and reports received, accepted, and deduplicated event counts.",
          source: "https://github.com/faizansaiyed123/telemetry-backend/blob/main/app/api/ingestion.py",
          sourceLabel: "app/api/ingestion.py",
          test: "https://github.com/faizansaiyed123/telemetry-backend/blob/main/tests/integration/test_ingestion_quality.py",
          testLabel: "tests/integration/test_ingestion_quality.py"
        },
        {
          title: "Evaluate signals against history.",
          type: "ANOMALY DETECTION",
          description: "The detector maintains rolling per-host, per-metric history and evaluates z-scores after the configured minimum history is available.",
          decision: "A signal is not labelled anomalous before enough history exists; zero-variance windows are handled without dividing by zero.",
          source: "https://github.com/faizansaiyed123/telemetry-backend/blob/main/app/services/anomaly_detector.py",
          sourceLabel: "app/services/anomaly_detector.py",
          test: "https://github.com/faizansaiyed123/telemetry-backend/blob/main/tests/unit/test_anomaly_detector.py",
          testLabel: "tests/unit/test_anomaly_detector.py"
        },
        {
          title: "Persist alert changes off the hot path.",
          type: "ALERT LIFECYCLE",
          description: "Alert persistence uses a bounded asyncio queue and a background worker. Failed persistence retains the event for a retry; queue overflow is counted and logged.",
          decision: "The queue has an explicit capacity and failure behavior instead of silently allowing unbounded in-memory growth.",
          source: "https://github.com/faizansaiyed123/telemetry-backend/blob/main/app/services/alert_persistence.py",
          sourceLabel: "app/services/alert_persistence.py",
          test: "https://github.com/faizansaiyed123/telemetry-backend/blob/main/tests/unit/test_alert_persistence.py",
          testLabel: "tests/unit/test_alert_persistence.py"
        },
        {
          title: "Fan out updates to connected clients.",
          type: "WEBSOCKET DELIVERY",
          description: "The WebSocket manager protects its client set with an asyncio lock, broadcasts concurrently, and removes clients whose send operation fails.",
          decision: "One broken connection is removed without making every other connected client share the same failure.",
          source: "https://github.com/faizansaiyed123/telemetry-backend/blob/main/app/services/websocket_manager.py",
          sourceLabel: "app/services/websocket_manager.py",
          test: "https://github.com/faizansaiyed123/telemetry-backend/blob/main/tests/integration/test_websocket.py",
          testLabel: "tests/integration/test_websocket.py"
        },
        {
          title: "Verify the authenticated stream.",
          type: "INTEGRATION TESTING",
          description: "The WebSocket integration tests obtain a short-lived token, validate telemetry message shape and sequence progression, and exercise multiple clients and disconnect behavior.",
          decision: "The stream is tested through an authenticated client boundary, not just by calling the manager in isolation.",
          source: "https://github.com/faizansaiyed123/telemetry-backend/blob/main/app/api/websocket.py",
          sourceLabel: "app/api/websocket.py",
          test: "https://github.com/faizansaiyed123/telemetry-backend/blob/main/tests/integration/test_websocket.py",
          testLabel: "tests/integration/test_websocket.py"
        }
      ]
    }
  };

  const traceSystemButtons = $(".trace-system-button");
  const traceStepsRoot = $("#trace-steps");
  const traceSystemLabel = $("#trace-system-label");
  const traceStepCount = $("#trace-step-count");
  const traceDetailIndex = $("#trace-detail-index");
  const traceStageType = $("#trace-stage-type");
  const traceStageTitle = $("#trace-stage-title");
  const traceStageDescription = $("#trace-stage-description");
  const traceStageDecision = $("#trace-stage-decision");
  const traceSourceLink = $("#trace-source-link");
  const traceTestLink = $("#trace-test-link");
  let activeTraceSystem = "frameflux";
  let activeTraceStep = 0;

  const renderTrace = () => {
    const system = traceSystems[activeTraceSystem];
    if (!system || !traceStepsRoot) return;
    const step = system.steps[activeTraceStep];
    traceSystemLabel.textContent = system.label;
    traceStepCount.textContent = String(activeTraceStep + 1).padStart(2, "0") + " — " + String(system.steps.length).padStart(2, "0");
    traceDetailIndex.textContent = String(activeTraceStep + 1).padStart(2, "0") + " / " + activeTraceSystem.toUpperCase();
    traceStageType.textContent = step.type;
    traceStageTitle.textContent = step.title;
    traceStageDescription.textContent = step.description;
    traceStageDecision.textContent = step.decision;
    traceSourceLink.href = step.source;
    traceSourceLink.setAttribute("aria-label", "Inspect source file " + step.sourceLabel);
    traceSourceLink.replaceChildren(document.createTextNode("Inspect source file: " + step.sourceLabel + " "), (() => {
      const marker = document.createElement("b");
      marker.setAttribute("aria-hidden", "true");
      marker.textContent = "↗";
      return marker;
    })());
    traceTestLink.href = step.test;
    traceTestLink.setAttribute("aria-label", "View related tests " + step.testLabel);
    traceTestLink.replaceChildren(document.createTextNode("View related tests: " + step.testLabel + " "), (() => {
      const marker = document.createElement("b");
      marker.setAttribute("aria-hidden", "true");
      marker.textContent = "↗";
      return marker;
    })());

    const stepButtons = system.steps.map((item, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "trace-step" + (index === activeTraceStep ? " is-active" : "");
      button.setAttribute("aria-pressed", String(index === activeTraceStep));
      button.dataset.traceStep = String(index);
      const number = document.createElement("span");
      number.textContent = String(index + 1).padStart(2, "0");
      const title = document.createElement("b");
      title.textContent = item.type.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
      const marker = document.createElement("i");
      marker.setAttribute("aria-hidden", "true");
      button.append(number, title, marker);
      button.addEventListener("click", () => {
        activeTraceStep = index;
        renderTrace();
      });
      return button;
    });
    traceStepsRoot.replaceChildren(...stepButtons);
  };

  traceSystemButtons.forEach((button) => {
    button.addEventListener("click", () => {
      activeTraceSystem = button.dataset.traceSystem || "frameflux";
      activeTraceStep = 0;
      traceSystemButtons.forEach((candidate) => {
        const active = candidate === button;
        candidate.classList.toggle("is-active", active);
        candidate.setAttribute("aria-pressed", String(active));
      });
      renderTrace();
    });
  });
  if (traceStepsRoot && traceStageTitle) renderTrace();

})();