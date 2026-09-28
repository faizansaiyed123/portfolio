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

/* ---------- Portfolio guide / deterministic interview flow ---------- */
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

  const interviewFlow = {
    start: {
      context: "INTERVIEW",
      message: "Welcome! How would you like to proceed with the interview?",
      choices: [
        ["Start Interview", "start-interview"],
        ["Review Candidate", "review-candidate"],
        ["Ask Technical Questions", "technical"],
        ["Ask Behavioral Questions", "behavioral"],
        ["End Interview", "end"]
      ]
    },
    "start-interview": {
      context: "START",
      message: "Let's begin with a structured interview. Choose the area you want to cover first.",
      choices: [
        ["Review Candidate", "review-candidate"],
        ["Ask Technical Questions", "technical"],
        ["Ask Behavioral Questions", "behavioral"],
        ["Back to Main Menu", "start"]
      ]
    },
    "review-candidate": {
      context: "CANDIDATE",
      message: "Faizan Saiyed is a full-stack engineer focused on backend APIs, realtime systems, asynchronous workflows, data systems, and polished web interfaces. What would you like to review?",
      choices: [
        ["Review Selected Projects", "projects"],
        ["Review Engineering Stack", "stack"],
        ["Review Engineering Approach", "method"],
        ["Open Contact", "contact"],
        ["Back to Main Menu", "start"]
      ]
    },
    projects: {
      context: "PROJECTS",
      message: "Two systems are presented as the selected casebook: FrameFlux for asynchronous media workflows and Telemetry for realtime observability.",
      choices: [
        ["Review FrameFlux", "frameflux"],
        ["Review Telemetry", "telemetry"],
        ["Open Work Casebook", "goto-work"],
        ["Back to Candidate Review", "review-candidate"]
      ]
    },
    frameflux: {
      context: "FRAMEFLUX",
      message: "FrameFlux keeps heavy media work out of the request path. The design uses explicit upload and processing state, validation, background jobs, progress, retries, cancellation, PostgreSQL, Redis/ARQ, FastAPI, and FFmpeg.",
      choices: [
        ["Open FrameFlux Case Study", "goto-frameflux"],
        ["Open Backend Repository", "link-frameflux-backend"],
        ["Open Frontend Repository", "link-frameflux-frontend"],
        ["Back to Projects", "projects"]
      ]
    },
    telemetry: {
      context: "TELEMETRY",
      message: "Telemetry models live system state for anomaly detection, persistence, alert lifecycle, authenticated streaming, and a realtime dashboard using FastAPI, PostgreSQL, WebSockets, React, and TypeScript.",
      choices: [
        ["Open Telemetry Case Study", "goto-telemetry"],
        ["Open Backend Repository", "link-telemetry-backend"],
        ["Open Frontend Repository", "link-telemetry-frontend"],
        ["Back to Projects", "projects"]
      ]
    },
    stack: {
      context: "STACK",
      message: "The selected systems provide direct evidence of backend APIs, persistence, asynchronous jobs, realtime streaming, frontend product interfaces, and automated verification.",
      choices: [
        ["Review Backend Stack", "stack-backend"],
        ["Review Frontend Stack", "stack-frontend"],
        ["Review Systems Stack", "stack-systems"],
        ["Back to Candidate Review", "review-candidate"]
      ]
    },
    "stack-backend": {
      context: "STACK / BACKEND",
      message: "Backend: Python, FastAPI, Flask, Pydantic, SQLAlchemy, Alembic, Uvicorn, and Docker. These cover APIs, validation, persistence, migrations, and deployment/runtime concerns.",
      choices: [
        ["Ask Backend Questions", "technical-backend"],
        ["Back to Stack", "stack"]
      ]
    },
    "stack-frontend": {
      context: "STACK / FRONTEND",
      message: "Frontend: React, Next.js, TypeScript, Vite, and Tailwind CSS. The portfolio itself is intentionally framework-free and uses plain HTML, CSS, and JavaScript.",
      choices: [
        ["Ask Frontend Questions", "technical-frontend"],
        ["Back to Stack", "stack"]
      ]
    },
    "stack-systems": {
      context: "STACK / SYSTEMS",
      message: "Systems: PostgreSQL for durable state, Redis and ARQ for background work, WebSockets for live updates, FFmpeg for media processing, and GitHub Actions/Playwright for verification.",
      choices: [
        ["Ask System Design Questions", "technical-system-design"],
        ["Back to Stack", "stack"]
      ]
    },
    method: {
      context: "APPROACH",
      message: "The repeated engineering moves are explicit state, backend authority, validation before expensive work, and verification from the outside in.",
      choices: [
        ["Open Systems Thinking", "goto-systems"],
        ["Review Projects", "projects"],
        ["Back to Candidate Review", "review-candidate"]
      ]
    },
    technical: {
      context: "TECHNICAL",
      message: "Select the technical area you'd like to evaluate:",
      choices: [
        ["Frontend", "technical-frontend"],
        ["Backend", "technical-backend"],
        ["Database", "technical-database"],
        ["System Design", "technical-system-design"],
        ["Git / GitHub", "technical-git"]
      ]
    },
    "technical-frontend": {
      context: "TECHNICAL / FRONTEND",
      message: "Suggested question: How would you structure a frontend that consumes backend-owned state without duplicating business authority? Evaluation focus: state boundaries, API contracts, user feedback, and testability.",
      choices: [
        ["Next Technical Area", "technical"],
        ["Review Frontend Stack", "stack-frontend"],
        ["Back to Main Menu", "start"]
      ]
    },
    "technical-backend": {
      context: "TECHNICAL / BACKEND",
      message: "Suggested question: How would you design a long-running operation so the request does not have to stay open? Evaluation focus: explicit job state, retries, cancellation, idempotency, and observability.",
      choices: [
        ["Next Technical Area", "technical"],
        ["Review FrameFlux", "frameflux"],
        ["Back to Main Menu", "start"]
      ]
    },
    "technical-database": {
      context: "TECHNICAL / DATABASE",
      message: "Suggested question: Where should durable workflow state live, and what should be safe to reconstruct? Evaluation focus: ownership, transaction boundaries, indexing, migrations, and recovery after failure.",
      choices: [
        ["Next Technical Area", "technical"],
        ["Review Systems Stack", "stack-systems"],
        ["Back to Main Menu", "start"]
      ]
    },
    "technical-system-design": {
      context: "TECHNICAL / SYSTEM DESIGN",
      message: "Suggested question: A media request can take minutes. Walk through a design that keeps the API responsive while still exposing progress and failure state. Evaluation focus: queues, workers, state machines, backpressure, and status visibility.",
      choices: [
        ["Next Technical Area", "technical"],
        ["Review FrameFlux", "frameflux"],
        ["Back to Main Menu", "start"]
      ]
    },
    "technical-git": {
      context: "TECHNICAL / GIT",
      message: "Suggested question: How do you keep a multi-part feature safe while it is being implemented? Evaluation focus: small commits, focused branches, reviewable changes, verification, and clear history.",
      choices: [
        ["Next Technical Area", "technical"],
        ["Open GitHub", "link-github"],
        ["Back to Main Menu", "start"]
      ]
    },
    behavioral: {
      context: "BEHAVIORAL",
      message: "Select the behavioral area you'd like to evaluate:",
      choices: [
        ["Ownership", "behavioral-ownership"],
        ["Problem Solving", "behavioral-problem-solving"],
        ["Communication", "behavioral-communication"],
        ["Reliability", "behavioral-reliability"]
      ]
    },
    "behavioral-ownership": {
      context: "BEHAVIORAL / OWNERSHIP",
      message: "Suggested question: Tell me about a system where you had to own the problem beyond the first implementation. Follow-up focus: trade-offs, verification, maintenance, and what changed after feedback.",
      choices: [
        ["Next Behavioral Area", "behavioral"],
        ["Review Engineering Approach", "method"],
        ["Back to Main Menu", "start"]
      ]
    },
    "behavioral-problem-solving": {
      context: "BEHAVIORAL / PROBLEM SOLVING",
      message: "Suggested question: Describe a difficult failure mode you found and how you narrowed it down. Follow-up focus: evidence, hypotheses, debugging discipline, and the final system change.",
      choices: [
        ["Next Behavioral Area", "behavioral"],
        ["Review Projects", "projects"],
        ["Back to Main Menu", "start"]
      ]
    },
    "behavioral-communication": {
      context: "BEHAVIORAL / COMMUNICATION",
      message: "Suggested question: Explain a technical decision to a teammate who does not own the same part of the system. Follow-up focus: clarity, constraints, alternatives, and shared understanding.",
      choices: [
        ["Next Behavioral Area", "behavioral"],
        ["Review Engineering Approach", "method"],
        ["Back to Main Menu", "start"]
      ]
    },
    "behavioral-reliability": {
      context: "BEHAVIORAL / RELIABILITY",
      message: "Suggested question: What do you do when a system is technically working but difficult to trust? Follow-up focus: tests, observability, failure boundaries, documentation, and repeatable verification.",
      choices: [
        ["Next Behavioral Area", "behavioral"],
        ["Review Systems Thinking", "goto-systems"],
        ["Back to Main Menu", "start"]
      ]
    },
    contact: {
      context: "CONTACT",
      message: "For a direct conversation, use the contact section or connect through the public profiles linked there.",
      choices: [
        ["Open Contact", "goto-contact"],
        ["Open LinkedIn", "link-linkedin"],
        ["Open GitHub", "link-github"],
        ["Back to Candidate Review", "review-candidate"]
      ]
    },
    end: {
      context: "END",
      message: "Interview flow complete. This guide is deterministic: every response and next step comes from predefined interview paths.",
      choices: [
        ["Restart Interview", "start"],
        ["Open Contact", "goto-contact"],
        ["Close Guide", "close"]
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
    const step = guideState.path.length;
    if (guideProgress) guideProgress.textContent = "STEP " + Math.min(step, 9);
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
        window.setTimeout(tick, 6);
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
      button.setAttribute("aria-label", "Select " + label);

      const labelEl = document.createElement("span");
      labelEl.className = "guide-action-copy";
      labelEl.textContent = label;

      const iconEl = document.createElement("span");
      iconEl.className = "guide-action-icon";
      iconEl.textContent = "↗";
      iconEl.setAttribute("aria-hidden", "true");

      button.append(labelEl, iconEl);
      button.addEventListener("click", async () => {
        if (guideState.typing) return;
        button.classList.add("is-selected");
        $$(".guide-action", guideActions).forEach((item) => { item.disabled = true; });
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
      renderChoices(interviewFlow[guideState.currentNode]?.choices || []);
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
      "goto-work": "Opening the selected work casebook.",
      "goto-frameflux": "Opening FrameFlux in the work casebook.",
      "goto-telemetry": "Opening Telemetry in the work casebook.",
      "goto-systems": "Opening the systems-thinking section.",
      "goto-contact": "Opening the direct contact section."
    };

    await appendMessage(responses[action] || "Opening the selected section.", "bot", true);

    if (action === "goto-frameflux") activateProject("frameflux", true);
    else if (action === "goto-telemetry") activateProject("telemetry", true);
    else scrollToSection(action.replace("goto-", ""));
  };

  const handleExternalLink = (label, action) => {
    const href = externalLinks[action];
    if (!href) return;

    const userMessage = document.createElement("p");
    userMessage.className = "guide-message guide-message-user";
    userMessage.textContent = label;
    guideThread?.appendChild(userMessage);
    guideState.history.push({ role: "user", content: label });
    guideState.path.push(action);
    updateGuideProgress();

    window.open(href, "_blank", "noopener,noreferrer");
    void appendMessage("Opening the selected public link.", "bot", true);
    renderChoices(interviewFlow[guideState.currentNode]?.choices || []);
  };

  const showNode = async (id, userLabel) => {
    const node = interviewFlow[id];
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
      handleExternalLink(label, action);
      return;
    }

    if (action.startsWith("goto-")) {
      await handleRoute(label, action);
      renderChoices(interviewFlow[guideState.currentNode]?.choices || []);
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
    setGuideContext("INTERVIEW");
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