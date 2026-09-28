(() => {
  "use strict";

  const root = document.documentElement;
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];

  /* ---------- Theme ---------- */
  const readTheme = () => {
    try { return localStorage.getItem("portfolio-theme") || "dark"; }
    catch { return "dark"; }
  };

  const applyTheme = (theme) => {
    const isDark = theme === "dark";
    root.dataset.theme = isDark ? "dark" : "light";
    const button = $(".theme-button");
    if (button) {
      $(".theme-label", button)?.replaceChildren(document.createTextNode(isDark ? "Dark" : "Light"));
      button.setAttribute("aria-label", isDark ? "Switch to light theme" : "Switch to dark theme");
      button.setAttribute("aria-pressed", String(isDark));
    }
    $("meta[name='theme-color']")?.setAttribute("content", isDark ? "#080b0d" : "#efeee8");
  };

  applyTheme(readTheme());
  $(".theme-button")?.addEventListener("click", () => {
    const next = root.dataset.theme === "dark" ? "light" : "dark";
    applyTheme(next);
    try { localStorage.setItem("portfolio-theme", next); } catch {}
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
        ["How does he approach engineering?", "approach"],
        ["What's in the stack?", "stack"],
        ["What kind of engineer is he?", "profile"],
        ["Get in touch", "contact"]
      ]
    },
    projects: {
      context: "PROJECTS",
      message: "There are two featured systems here. Pick the one you want to understand first.",
      choices: [
        ["Explore FrameFlux", "frameflux"],
        ["Explore Telemetry", "telemetry"],
        ["See the full work section", "goto-work"],
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
      message: "The selected systems span backend APIs, durable data, asynchronous work, realtime transport, media processing, frontend applications, and automated verification.",
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
      message: "PostgreSQL provides durable state, Redis/ARQ handles background work, WebSockets carry live updates, FFmpeg handles media processing, and automated tests verify behavior.",
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

  /* ---------- Guide context awareness ---------- */
  const sectionContext = {
    top: "HOME",
    work: "WORK",
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
    ["Selected work", "Work", "work"],
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

  /* ---------- Footer / date ---------- */
  const year = $("#year");
  if (year) year.textContent = String(new Date().getFullYear());

  /* ---------- Small attention cue ---------- */
  window.setTimeout(() => {
    if (!guidePanel || guidePanel.hidden) guideDock?.classList.add("is-attention");
  }, 4800);

  guideLauncher?.addEventListener("click", () => guideDock?.classList.remove("is-attention"), { once: true });

  updateGuideModeUI();
  updateGuideProgress();
})();