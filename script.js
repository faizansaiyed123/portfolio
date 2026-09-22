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

  /* ---------- Portfolio guide ---------- */
  const guidePanel = $("#guide-panel");
  const guideLauncher = $("#guide-launcher");
  const guideTopButton = $("#guide-top-button");
  const guideClose = $("#guide-close");
  const guideThread = $("#guide-thread");
  const guideActions = $("#guide-actions");
  const guideRestart = $("#guide-restart");
  const guideInput = $("#guide-input");
  const guideForm = $("#guide-form");
  const guideTour = $("#guide-tour");
  const guideChallenge = $("#guide-challenge");
  const guideContext = $("#guide-context");
  const guideProgress = $("#guide-progress");
  const guideDock = $("#guide-dock");
  const guideModes = $$(".guide-mode");

  const guideState = {
    mode: "recruiter",
    history: [],
    path: new Set(),
    typing: false,
    challengeIndex: 0,
    tourRunning: false
  };

  try {
    guideState.mode = sessionStorage.getItem("portfolio-guide-mode") || "recruiter";
  } catch {}
  if (!["recruiter", "engineer", "explorer"].includes(guideState.mode)) guideState.mode = "recruiter";

  const modeProfiles = {
    recruiter: {
      label: "RECRUITER",
      placeholder: "Ask what was built, what stands out, or how to contact...",
      intro: "Recruiter lens active. I’ll keep the signal concise: what was built, why it matters, and where the source evidence lives.",
      choices: [
        ["Show the strongest project signal", "projects"],
        ["What is the engineering focus?", "method"],
        ["What is the stack?", "stack"],
        ["Contact Faizan", "contact"]
      ]
    },
    engineer: {
      label: "ENGINEER",
      placeholder: "Ask about architecture, state, queues, security, realtime...",
      intro: "Engineer lens active. I’ll go deeper into state boundaries, queues, persistence, realtime flow, validation, security, and verification.",
      choices: [
        ["Deep dive FrameFlux", "frameflux"],
        ["Deep dive Telemetry", "telemetry"],
        ["Run an engineering challenge", "__challenge__"],
        ["Show the engineering method", "method"]
      ]
    },
    explorer: {
      label: "EXPLORER",
      placeholder: "Ask anything about the portfolio...",
      intro: "Explorer lens active. Follow whatever catches your attention. I can jump between projects, ideas, tools, contact, a guided tour, and a systems challenge.",
      choices: [
        ["Show me the two systems", "projects"],
        ["Take the guided tour", "__tour__"],
        ["Run an engineering challenge", "__challenge__"],
        ["Open the stack", "stack"],
        ["Contact Faizan", "contact"]
      ]
    }
  };

  const guideTree = {
    start: {
      message: modeProfiles[guideState.mode].intro,
      choices: modeProfiles[guideState.mode].choices
    },
    projects: {
      message: "There are two selected systems. FrameFlux models durable asynchronous media work; Telemetry models live observability state and authenticated streaming. They expose different state problems with the same backend-first mindset.",
      choices: [
        ["Inspect FrameFlux", "frameflux"],
        ["Inspect Telemetry", "telemetry"],
        ["Open the casebook", "goto-work"],
        ["Back to start", "start"]
      ]
    },
    frameflux: {
      message: "FrameFlux is a FastAPI media-processing backend using PostgreSQL, Redis/ARQ, and FFmpeg. The core design move is keeping expensive media work out of the request path while making upload and processing state explicit.",
      choices: [
        ["Open the FrameFlux case study", "goto-frameflux"],
        ["Show Telemetry", "telemetry"],
        ["Test me on FrameFlux", "__challenge__"],
        ["Back to start", "start"]
      ]
    },
    telemetry: {
      message: "Telemetry uses FastAPI, PostgreSQL, and authenticated WebSockets around a central telemetry model. Synthetic signals feed anomaly detection, alert lifecycle, persistence, simulation, and a live React dashboard; the backend remains the authority.",
      choices: [
        ["Open the Telemetry case study", "goto-telemetry"],
        ["Show FrameFlux", "frameflux"],
        ["Test me on system design", "__challenge__"],
        ["Back to start", "start"]
      ]
    },
    method: {
      message: "The repeated engineering moves are simple: separate expensive work, keep authority on the backend, validate before spending compute, and verify behavior from the outside in.",
      choices: [
        ["Open Systems thinking", "goto-systems"],
        ["See the selected projects", "projects"],
        ["See the stack", "stack"],
        ["Back to start", "start"]
      ]
    },
    stack: {
      message: "The center of gravity is Python/FastAPI and PostgreSQL, with SQLAlchemy, Alembic, WebSockets, Redis/ARQ, FFmpeg, React, Next.js, TypeScript, Vite, Docker, Pytest, Playwright, and GitHub Actions appearing directly in the selected systems.",
      choices: [
        ["Open the Stack section", "goto-stack"],
        ["Show the projects", "projects"],
        ["Back to start", "start"]
      ]
    },
    contact: {
      message: "The direct channel is email. The portfolio opens your mail client instead of pretending there is a third-party contact backend behind it.",
      choices: [
        ["Open Contact", "goto-contact"],
        ["Open GitHub", "github"],
        ["Back to start", "start"]
      ]
    }
  };

  const challengeSet = [
    {
      question: "A large upload drops at 72%. What should survive the failed request?",
      choices: [
        ["The upload state + received chunks", "durable"],
        ["Only browser memory", "wrong"],
        ["Nothing; start over", "wrong"]
      ],
      answers: {
        durable: "Correct. A resumable workflow needs explicit upload state so a dropped request does not erase already accepted work.",
        wrong: "That turns a resumable workflow into a restart workflow. FrameFlux is designed around explicit upload state."
      }
    },
    {
      question: "The dashboard shows an alert as resolved, but the server still says active. Which side owns the truth?",
      choices: [
        ["The backend lifecycle", "backend"],
        ["Whichever screen the user trusts", "wrong"],
        ["The browser’s local state", "wrong"]
      ],
      answers: {
        backend: "Exactly. Telemetry keeps alert lifecycle and authorization authoritative on the backend; the browser renders that state.",
        wrong: "The interface can display state, but it should not become the authority for security or lifecycle transitions."
      }
    },
    {
      question: "A file has an allowed extension but its binary content is suspicious. Where should processing stop?",
      choices: [
        ["At validation before processing", "validate"],
        ["After FFmpeg starts", "wrong"],
        ["After the job is recorded complete", "wrong"]
      ],
      answers: {
        validate: "Correct. FrameFlux validates extension, MIME/category, size, and binary signature before expensive processing.",
        wrong: "That waits too long. Validation is useful because it keeps bad input away from expensive work."
      }
    }
  ];

  const setGuideContext = (value) => {
    if (guideContext) guideContext.textContent = value;
  };

  const updateGuideProgress = () => {
    const count = Math.min(3, guideState.path.size);
    if (guideProgress) guideProgress.textContent = "PATH " + count + " / 3";
  };

  const saveGuideMode = () => {
    try { sessionStorage.setItem("portfolio-guide-mode", guideState.mode); } catch {}
  };

  const updateGuideModeUI = () => {
    guideModes.forEach((button) => {
      const active = button.dataset.guideMode === guideState.mode;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-selected", String(active));
    });
    guideDock?.setAttribute("data-mode", guideState.mode);
    guideInput?.setAttribute("placeholder", modeProfiles[guideState.mode].placeholder);
  };

  const appendMessage = (message, role, type = false) => {
    const element = document.createElement("p");
    element.className = "guide-message guide-message-" + role;
    guideThread?.appendChild(element);

    if (!type || prefersReducedMotion.matches) {
      element.textContent = message;
      if (guideThread) guideThread.scrollTop = guideThread.scrollHeight;
      return Promise.resolve();
    }

    guideState.typing = true;
    const cursor = document.createElement("span");
    cursor.className = "cursor";
    element.appendChild(cursor);

    return new Promise((resolve) => {
      let index = 0;
      const tick = () => {
        if (index >= message.length) {
          cursor.remove();
          guideState.typing = false;
          if (guideThread) guideThread.scrollTop = guideThread.scrollHeight;
          resolve();
          return;
        }
        element.insertBefore(document.createTextNode(message[index]), cursor);
        index += 1;
        if (guideThread) guideThread.scrollTop = guideThread.scrollHeight;
        window.setTimeout(tick, 8);
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
      const labelEl = document.createElement("span");
      labelEl.textContent = label;
      const iconEl = document.createElement("span");
      iconEl.textContent = "↗";
      iconEl.setAttribute("aria-hidden", "true");
      button.append(labelEl, iconEl);
      button.addEventListener("click", () => void handleChoice(label, action));
      guideActions.appendChild(button);
    });
  };

  const showNode = async (id, userLabel) => {
    const node = guideTree[id];
    if (!node) return;

    if (userLabel) {
      await appendMessage(userLabel, "user");
      guideState.history.push({ role: "user", text: userLabel });
    }

    guideState.path.add(id);
    updateGuideProgress();

    const message = id === "start" ? modeProfiles[guideState.mode].intro : node.message;
    const choices = id === "start" ? modeProfiles[guideState.mode].choices : node.choices;

    await appendMessage(message, "bot", true);
    guideState.history.push({ role: "bot", text: message });
    renderChoices(choices);
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
    guideDock?.classList.remove("is-attention");
    updateGuideModeUI();
    updateGuideProgress();

    if (!guideState.history.length) {
      void showNode("start");
    } else {
      renderChoices(modeProfiles[guideState.mode].choices);
    }

    window.setTimeout(() => $("#guide-input")?.focus(), 80);
  };

  const closeGuide = () => {
    guidePanel && (guidePanel.hidden = true);
    guideLauncher?.setAttribute("aria-expanded", "false");
    guideTopButton?.setAttribute("aria-expanded", "false");
  };

  const handleRoute = async (label, action) => {
    await appendMessage(label, "user");
    guideState.history.push({ role: "user", text: label });
    guideState.path.add(action.replace("goto-", ""));
    updateGuideProgress();

    const responses = {
      "goto-work": "Opening the selected work casebook.",
      "goto-frameflux": "Opening FrameFlux. Watch the state boundaries.",
      "goto-telemetry": "Opening Telemetry. Watch who owns the live state.",
      "goto-systems": "Opening the systems-thinking layer.",
      "goto-stack": "Opening the stack evidence.",
      "goto-contact": "Opening the direct contact channel."
    };

    await appendMessage(responses[action] || "Opening that section.", "bot", true);

    if (action === "goto-frameflux") activateProject("frameflux", true);
    else if (action === "goto-telemetry") activateProject("telemetry", true);
    else if (action === "goto-work") scrollToSection("work");
    else scrollToSection(action.replace("goto-", ""));
  };

  const runChallenge = async () => {
    if (guideState.typing || guideState.tourRunning) return;
    guideState.challengeIndex = 0;
    await appendMessage("ENGINEERING CHALLENGE MODE — answer first, then I’ll explain the design decision.", "bot", true);
    await renderChallenge();
  };

  const renderChallenge = async () => {
    const item = challengeSet[guideState.challengeIndex];
    if (!item) return;

    await appendMessage(
      "CHALLENGE " + (guideState.challengeIndex + 1) + " / " + challengeSet.length,
      "bot"
    );
    await appendMessage(item.question, "bot", true);
    renderChoices(item.choices.map(([label, key]) => [label, "challenge:" + key]));
  };

  const answerChallenge = async (action) => {
    if (guideState.typing) return;

    if (action === "challenge:next") {
      await renderChallenge();
      return;
    }

    const item = challengeSet[guideState.challengeIndex];
    if (!item) return;

    const key = action.split(":")[1] || "wrong";
    const label = item.choices.find(([, id]) => id === key)?.[0] || "Selected answer";

    await appendMessage(label, "user");
    await appendMessage(item.answers[key] || item.answers.wrong, "bot", true);

    guideState.challengeIndex += 1;

    if (challengeSet[guideState.challengeIndex]) {
      renderChoices([
        ["Next challenge", "challenge:next"],
        ["Return to guide", "start"]
      ]);
    } else {
      await appendMessage(
        "Challenge complete. The common thread is explicit state, backend authority, and validation before expensive work.",
        "bot",
        true
      );
      renderChoices(modeProfiles[guideState.mode].choices);
    }
  };

  const runTour = async () => {
    if (guideState.typing || guideState.tourRunning) return;
    guideState.tourRunning = true;
    guideDock?.classList.add("guide-tour-running");

    await appendMessage("GUIDED TOUR STARTED — I’ll take you through evidence → systems → stack → contact.", "bot", true);

    const steps = [
      ["work", "Evidence first: FrameFlux shows async media workflows; Telemetry shows realtime observability and backend-owned state."],
      ["systems", "Then the design logic: boundaries, authority, validation, and verification are the repeated moves."],
      ["stack", "The stack ties back to those projects instead of floating as a generic skills list."],
      ["contact", "Finally, the site closes on a direct human channel and source links."]
    ];

    for (const [id, message] of steps) {
      scrollToSection(id);
      await new Promise((resolve) => window.setTimeout(resolve, prefersReducedMotion.matches ? 120 : 1050));
      await appendMessage(message, "bot", true);
    }

    guideState.tourRunning = false;
    guideDock?.classList.remove("guide-tour-running");
    renderChoices(modeProfiles[guideState.mode].choices);
  };

  const normalize = (value) => value.trim().toLowerCase();

  const resolveIntent = (query) => {
    if (/tour|walk me|show me around|take me around/.test(query)) return "__tour__";
    if (/challenge|quiz|test me|question me/.test(query)) return "__challenge__";
    if (/frameflux|media|upload|ffmpeg|arq|background job|resumable/.test(query)) return "frameflux";
    if (/telemetry|websocket|alert|anomaly|observability|realtime|real-time|simulation/.test(query)) return "telemetry";
    if (/stack|technology|technologies|tools|typescript|python|fastapi|postgres|redis/.test(query)) return "stack";
    if (/method|approach|engineering|design|architecture|how.*build/.test(query)) return "method";
    if (/contact|email|hire|reach|linkedin|github|connect/.test(query)) return "contact";
    if (/project|projects|work|built|portfolio/.test(query)) return "projects";
    if (/who are you|who is faizan|about faizan/.test(query)) return "start";
    if (/resume|cv/.test(query)) return "contact";
    return null;
  };

  const handleChoice = async (label, action) => {
    if (guideState.typing || guideState.tourRunning) return;

    if (action === "__tour__") return runTour();
    if (action === "__challenge__") return runChallenge();
    if (action.startsWith("challenge:")) return answerChallenge(action);
    if (action.startsWith("goto-")) return handleRoute(label, action);

    await showNode(action, label);
  };

  guideModes.forEach((button) => {
    button.addEventListener("click", async () => {
      if (guideState.typing) return;
      const mode = button.dataset.guideMode || "explorer";
      if (!modeProfiles[mode]) return;

      guideState.mode = mode;
      saveGuideMode();
      updateGuideModeUI();

      guideState.history.length = 0;
      guideState.path.clear();
      guideState.challengeIndex = 0;
      guideThread?.replaceChildren();
      renderChoices([]);
      updateGuideProgress();

      await showNode("start");
    });
  });

  guideForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (guideState.typing || guideState.tourRunning) return;

    const value = guideInput?.value || "";
    const query = normalize(value);
    if (!query) return;

    if (guideInput) guideInput.value = "";

    const intent = resolveIntent(query);
    if (intent === "__tour__") {
      await appendMessage(value, "user");
      return runTour();
    }
    if (intent === "__challenge__") {
      await appendMessage(value, "user");
      return runChallenge();
    }
    if (!intent) {
      await appendMessage(value, "user");
      await appendMessage(
        "I can navigate this portfolio when the question touches projects, FrameFlux, Telemetry, engineering approach, stack, contact, a guided tour, or an engineering challenge.",
        "bot",
        true
      );
      renderChoices(modeProfiles[guideState.mode].choices);
      return;
    }

    await showNode(intent, value);
  });

  guideLauncher?.addEventListener("click", () => {
    if (guidePanel?.hidden) openGuide();
    else closeGuide();
  });
  guideTopButton?.addEventListener("click", openGuide);
  $("#hero-guide")?.addEventListener("click", openGuide);
  $("#hero-guide-card")?.addEventListener("click", openGuide);
  $("#mobile-guide")?.addEventListener("click", () => { closeMenu(); openGuide(); });
  $("#footer-guide")?.addEventListener("click", openGuide);
  guideClose?.addEventListener("click", closeGuide);

  guideRestart?.addEventListener("click", () => {
    guideState.history.length = 0;
    guideState.path.clear();
    guideState.challengeIndex = 0;
    guideState.tourRunning = false;
    guideDock?.classList.remove("guide-tour-running");
    guideThread?.replaceChildren();
    renderChoices([]);
    updateGuideProgress();
    void showNode("start");
  });

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