(() => {
  "use strict";

  const root = document.documentElement;
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const $ = (sel, scope = document) => scope.querySelector(sel);
  const $$ = (sel, scope = document) => [...scope.querySelectorAll(sel)];

  // Theme
  const getTheme = () => {
    try { return localStorage.getItem("portfolio-theme") || "dark"; }
    catch { return "dark"; }
  };
  const applyTheme = (theme) => {
    root.dataset.theme = theme;
    const dark = theme === "dark";
    $(".theme-label")?.replaceChildren(document.createTextNode(dark ? "Dark" : "Light"));
    $(".theme-button")?.setAttribute("aria-label", dark ? "Switch to light theme" : "Switch to dark theme");
    $(".theme-button")?.setAttribute("aria-pressed", String(dark));
    $("meta[name='theme-color']")?.setAttribute("content", dark ? "#080b0d" : "#efeee8");
  };
  applyTheme(getTheme());
  $(".theme-button")?.addEventListener("click", () => {
    const next = root.dataset.theme === "dark" ? "light" : "dark";
    applyTheme(next);
    try { localStorage.setItem("portfolio-theme", next); } catch {}
  });

  // Mobile navigation
  const menu = $("#mobile-nav");
  const menuButton = $("#menu-button");
  const closeMenu = () => {
    menu?.classList.remove("is-open");
    menuButton?.setAttribute("aria-expanded", "false");
  };
  menuButton?.addEventListener("click", () => {
    const open = menu?.classList.toggle("is-open") ?? false;
    menuButton?.setAttribute("aria-expanded", String(open));
  });
  $$("#mobile-nav a").forEach((link) => link.addEventListener("click", closeMenu));

  // Progress
  const progress = $(".reading-progress span");
  const updateProgress = () => {
    const total = document.documentElement.scrollHeight - window.innerHeight;
    progress && (progress.style.width = total > 0 ? Math.min(100, window.scrollY / total * 100) + "%" : "0%");
  };
  window.addEventListener("scroll", updateProgress, { passive: true });
  updateProgress();

  // Pointer atmosphere + subtle depth on the portrait frame
  const orb = $(".pointer-orb");
  const stage = $("#stage-frame");
  if (window.matchMedia("(pointer:fine)").matches) {
    window.addEventListener("pointermove", (event) => {
      if (orb) {
        orb.style.left = event.clientX + "px";
        orb.style.top = event.clientY + "px";
      }
      if (stage && !prefersReducedMotion.matches) {
        const rect = stage.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width - .5;
        const y = (event.clientY - rect.top) / rect.height - .5;
        if (x > -0.65 && x < 0.65 && y > -0.65 && y < 0.65) {
          stage.style.transform = "perspective(950px) rotateX(" + (-y * 4) + "deg) rotateY(" + (x * 5) + "deg) translateZ(0)";
          $$(".stage-chip", stage).forEach((chip, index) => {
            chip.style.transform = "translate(" + (x * (index + 1) * 8) + "px," + (y * (index + 1) * 6) + "px)";
          });
        }
      }
    }, { passive: true });
    stage?.addEventListener("pointerleave", () => {
      stage.style.transform = "";
      $$(".stage-chip", stage).forEach((chip) => chip.style.transform = "");
    });
  }

  // Profile image fallback
  const portrait = $("#profile-image");
  portrait?.addEventListener("error", () => {
    const fallback = portrait.dataset.fallback;
    if (!fallback || portrait.dataset.failed === "1") return;
    portrait.dataset.failed = "1";
    portrait.src = fallback;
    portrait.alt = "Faizan Saiyed — local profile fallback";
  }, { once: true });

  // Project switcher
  const tabs = $$(".project-tab");
  const panels = $$(".project-panel");
  const activateProject = (name, move = false) => {
    tabs.forEach((tab) => {
      const active = tab.dataset.projectTab === name;
      tab.classList.toggle("is-active", active);
      tab.setAttribute("aria-selected", String(active));
    });
    panels.forEach((panel) => panel.classList.toggle("is-active", panel.dataset.projectPanel === name));
    if (move) $("#work")?.scrollIntoView({ behavior: prefersReducedMotion.matches ? "auto" : "smooth", block: "start" });
  };
  tabs.forEach((tab) => tab.addEventListener("click", () => activateProject(tab.dataset.projectTab)));

  // Expand implementation notes
  $$(".expand-button").forEach((button) => {
    button.addEventListener("click", () => {
      const target = $("#" + (button.getAttribute("aria-controls") || ""));
      if (!target) return;
      const open = target.hidden;
      target.hidden = !open;
      button.setAttribute("aria-expanded", String(open));
      if (open && !prefersReducedMotion.matches && target.animate) {
        target.animate(
          [{ opacity: 0, transform: "translateY(-8px)" }, { opacity: 1, transform: "translateY(0)" }],
          { duration: 220, easing: "cubic-bezier(.22,.61,.36,1)" }
        );
      }
    });
  });

  // Portfolio Guide — deterministic, local, source-grounded.
  const guidePanel = $("#guide-panel");
  const guideLauncher = $("#guide-launcher");
  const guideClose = $("#guide-close");
  const guideThread = $("#guide-thread");
  const guideActions = $("#guide-actions");
  const guideRestart = $("#guide-restart");
  const guideInput = $("#guide-input");
  const guideForm = $("#guide-form");
  const guideTour = $("#guide-tour");
  const guideChallenge = $("#guide-challenge");
  const guideContextEl = $("#guide-context");
  const guideProgressEl = $("#guide-progress");
  const guideDock = $("#guide-dock");
  const guideModes = $(".guide-mode");
  let activeGuideMode = "recruiter";
  const guidePath = new Set();

  try {
    activeGuideMode = sessionStorage.getItem("portfolio-guide-mode") || "recruiter";
  } catch {}

  const modeProfiles = {
    recruiter: {
      label: "RECRUITER",
      placeholder: "Ask what stands out, what was built, or how to contact...",
      message: "Recruiter lens: I’ll keep the signal concise — what was built, why it matters, and where the source evidence lives.",
      choices: [
        ["Show the strongest project signal", "projects"],
        ["What is the engineering focus?", "method"],
        ["What is the stack?", "stack"],
        ["Contact Faizan", "contact"]
      ]
    },
    engineer: {
      label: "ENGINEER",
      placeholder: "Ask about architecture, state, jobs, security, or realtime...",
      message: "Engineer lens: I’ll go deeper into boundaries, state, queues, persistence, realtime flow, validation, and verification.",
      choices: [
        ["Deep dive FrameFlux", "frameflux"],
        ["Deep dive Telemetry", "telemetry"],
        ["Test me with a system challenge", "__challenge__"],
        ["Show the engineering method", "method"]
      ]
    },
    explorer: {
      label: "EXPLORER",
      placeholder: "Ask anything about the portfolio...",
      message: "Explorer lens: follow whatever catches your attention. I can jump between projects, ideas, tools, and contact without leaving the page.",
      choices: [
        ["Show me the two systems", "projects"],
        ["Take the guided tour", "__tour__"],
        ["Ask an engineering challenge", "__challenge__"],
        ["Open the stack", "stack"],
        ["Contact Faizan", "contact"]
      ]
    }
  };

  const updateGuideProgress = () => {
    if (guideProgressEl) guideProgressEl.textContent = "PATH " + Math.min(3, guidePath.size) + " / 3";
  };
  const setGuideContext = (label) => {
    if (guideContextEl) guideContextEl.textContent = label;
  };
  const saveGuideMode = () => {
    try { sessionStorage.setItem("portfolio-guide-mode", activeGuideMode); } catch {}
  };
  const applyGuideMode = async (mode, announce = true) => {
    if (!modeProfiles[mode]) return;
    activeGuideMode = mode;
    guideModes.forEach((button) => {
      const active = button.dataset.guideMode === mode;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-selected", String(active));
    });
    guideDock?.setAttribute("data-mode", mode);
    guideInput?.setAttribute("placeholder", modeProfiles[mode].placeholder);
    saveGuideMode();
    guidePath.clear();
    if (guideThread) guideThread.replaceChildren();
    renderGuideChoices([]);
    updateGuideProgress();
    if (announce && guidePanel && !guidePanel.hidden) {
      await appendGuideMessage(modeProfiles[mode].message, "bot", true);
      renderGuideChoices(modeProfiles[mode].choices);
    }
  };
  guideModes.forEach((button) => {
    button.addEventListener("click", () => void applyGuideMode(button.dataset.guideMode || "explorer"));
  });

  const challengeSet = [
    {
      question: "A large upload drops at 72%. What should survive the failed request?",
      choices: [
        ["The upload state + received chunks", "durable"],
        ["Only the browser memory", "wrong"],
        ["Nothing; start over", "wrong"]
      ],
      answers: {
        durable: "Exactly. FrameFlux treats resumable upload state explicitly, so a dropped request does not have to erase the work already accepted.",
        wrong: "That would turn a resumable workflow into a restart workflow. The system is designed around explicit upload state."
      }
    },
    {
      question: "The dashboard says an alert is resolved, but the server still says active. Which side owns the truth?",
      choices: [
        ["The backend lifecycle", "backend"],
        ["Whichever screen the user trusts", "wrong"],
        ["The browser’s local state", "wrong"]
      ],
      answers: {
        backend: "The backend. Telemetry keeps alert lifecycle and authorization authoritative on the server; the UI renders that state.",
        wrong: "The interface can display state, but it should not become the authority for security or lifecycle transitions."
      }
    },
    {
      question: "A media file has an allowed extension but its binary content is suspicious. Where should the expensive processing path stop?",
      choices: [
        ["At validation before processing", "validate"],
        ["After FFmpeg starts", "wrong"],
        ["After the database records a completed job", "wrong"]
      ],
      answers: {
        validate: "Correct. FrameFlux validates extension, MIME/category, size and binary signature before expensive processing.",
        wrong: "That waits too long. Validation is useful precisely because it prevents bad input from reaching expensive work."
      }
    }
  ];
  let challengeIndex = 0;

  const renderChallengeQuestion = async () => {
    const item = challengeSet[challengeIndex];
    if (!item) return;
    await appendGuideMessage("CHALLENGE " + (challengeIndex + 1) + " / " + challengeSet.length, "bot");
    await appendGuideMessage(item.question, "bot", true);
    renderGuideChoices(item.choices.map(([label, id]) => [label, "challenge:" + id]));
  };
  const runChallenge = async () => {
    if (guideTyping) return;
    challengeIndex = 0;
    await appendGuideMessage("System challenge mode. Pick an answer, then I’ll explain the design decision behind it.", "bot", true);
    await renderChallengeQuestion();
  };
  const answerChallenge = async (choiceId) => {
    if (guideTyping) return;
    if (choiceId === "challenge:next") {
      challengeIndex += 1;
      return renderChallengeQuestion();
    }
    const item = challengeSet[challengeIndex];
    if (!item) return;
    const key = choiceId.split(":")[1] || "wrong";
    const label = item.choices.find(([, id]) => id === key)?.[0] || "Selected answer";
    await appendGuideMessage(label, "user");
    await appendGuideMessage(item.answers[key] || item.answers.wrong, "bot", true);
    challengeIndex += 1;
    if (challengeSet[challengeIndex]) {
      renderGuideChoices([["Next challenge", "challenge:next"], ["Return to guide", "start"]]);
    } else {
      await appendGuideMessage("That’s the end of the challenge set. Now you’ve seen the design rules in action: explicit state, backend authority, and validation before expensive work.", "bot", true);
      renderGuideChoices(modeProfiles[activeGuideMode].choices);
    }
  };

  const runGuideTour = async () => {
    if (guideTyping) return;
    guideDock?.classList.add("guide-tour-running");
    await appendGuideMessage("Guided tour started. I’ll move through the portfolio from work → systems → stack → contact.", "bot", true);
    const steps = [
      ["work", "The work section is the evidence layer: FrameFlux for async media processing and Telemetry for realtime observability."],
      ["systems", "This is the recurring engineering logic behind both projects: boundaries, authority, validation, and verification."],
      ["stack", "The stack is tied back to those systems instead of presented as an isolated logo wall."],
      ["contact", "At the endpoint, the site gives visitors a direct email and source links."]
    ];
    for (const [id, message] of steps) {
      scrollTo(id);
      await new Promise((resolve) => window.setTimeout(resolve, prefersReducedMotion.matches ? 120 : 1100));
      await appendGuideMessage(message, "bot", true);
    }
    guideDock?.classList.remove("guide-tour-running");
    renderGuideChoices(modeProfiles[activeGuideMode].choices);
  };

  const normalizeQuery = (value) => value.trim().toLowerCase();
  const resolveFreeformIntent = (query) => {
    if (/tour|walk me|show me around/.test(query)) return "__tour__";
    if (/challenge|quiz|test me|question me/.test(query)) return "__challenge__";
    if (/frameflux|media|upload|ffmpeg|arq|background job|resumable/.test(query)) return "frameflux";
    if (/telemetry|websocket|alert|anomaly|observability|realtime|real-time/.test(query)) return "telemetry";
    if (/stack|technology|technologies|tools|typescript|python|fastapi|postgres/.test(query)) return "stack";
    if (/method|approach|engineering|design|architecture|how.*build/.test(query)) return "method";
    if (/contact|email|hire|reach|linkedin|github|connect/.test(query)) return "contact";
    if (/project|projects|work|built|portfolio/.test(query)) return "projects";
    if (/who are you|who is faizan|about faizan/.test(query)) return "start";
    if (/resume|cv/.test(query)) return "contact";
    return null;
  };


  const guideTree = {
    start: {
      message: "Hi. I'm the local guide for this portfolio. No external AI service is running behind me — I use the project's actual content to help you explore it.",
      choices: [
        ["Show me the two systems", "projects"],
        ["Why is FrameFlux interesting?", "frameflux"],
        ["How does Telemetry work?", "telemetry"],
        ["How does Faizan approach engineering?", "method"],
        ["What is the stack?", "stack"],
        ["I want to contact Faizan", "contact"]
      ]
    },
    projects: {
      message: "The selected work is deliberately split into two kinds of state: FrameFlux handles durable asynchronous media jobs; Telemetry handles live observability state and authenticated streams.",
      choices: [
        ["Open FrameFlux", "frameflux"],
        ["Open Telemetry", "telemetry"],
        ["Open both in the casebook", "goto-work"],
        ["Back to start", "start"]
      ]
    },
    frameflux: {
      message: "FrameFlux is a FastAPI media-processing backend using PostgreSQL, Redis/ARQ and FFmpeg. The key idea is to keep heavy processing out of the request path and model uploads and transformations as explicit lifecycles.",
      choices: [
        ["Inspect the FrameFlux case study", "goto-frameflux"],
        ["Show Telemetry", "telemetry"],
        ["Back to start", "start"]
      ]
    },
    telemetry: {
      message: "Telemetry uses FastAPI, PostgreSQL and authenticated WebSockets around a central telemetry model. Synthetic signals feed anomaly detection, alert lifecycle, persistence and a live React dashboard; the backend remains authoritative.",
      choices: [
        ["Inspect the Telemetry case study", "goto-telemetry"],
        ["Show FrameFlux", "frameflux"],
        ["Back to start", "start"]
      ]
    },
    method: {
      message: "The recurring engineering moves are: separate expensive work, keep system authority on the backend, validate before spending compute, and verify behavior from the outside in.",
      choices: [
        ["Open Systems thinking", "goto-systems"],
        ["See the selected projects", "projects"],
        ["See the stack", "stack"],
        ["Back to start", "start"]
      ]
    },
    stack: {
      message: "The center of gravity is Python/FastAPI and PostgreSQL, with SQLAlchemy, Alembic, WebSockets, Redis/ARQ, FFmpeg, React, Next.js, TypeScript, Vite, Docker, Pytest and Playwright appearing directly in the selected systems.",
      choices: [
        ["Open the Stack section", "goto-stack"],
        ["Show the projects", "projects"],
        ["Back to start", "start"]
      ]
    },
    contact: {
      message: "The direct channel is email. The site opens your mail client instead of pretending to run a third-party contact backend.",
      choices: [
        ["Open Contact", "goto-contact"],
        ["Open GitHub", "github"],
        ["Back to start", "start"]
      ]
    }
  };

  const guideHistory = [];
  let guideTyping = false;

  const appendGuideMessage = (message, role, type = false) => {
    const el = document.createElement("p");
    el.className = "guide-message guide-message-" + role;
    guideThread?.appendChild(el);
    if (!type || prefersReducedMotion.matches) {
      el.textContent = message;
      if (guideThread) guideThread.scrollTop = guideThread.scrollHeight;
      return Promise.resolve();
    }

    guideTyping = true;
    const cursor = document.createElement("span");
    cursor.className = "cursor";
    el.appendChild(cursor);
    let i = 0;

    return new Promise((resolve) => {
      const tick = () => {
        if (i >= message.length) {
          cursor.remove();
          guideTyping = false;
          if (guideThread) guideThread.scrollTop = guideThread.scrollHeight;
          resolve();
          return;
        }
        el.insertBefore(document.createTextNode(message[i]), cursor);
        i += 1;
        if (guideThread) guideThread.scrollTop = guideThread.scrollHeight;
        window.setTimeout(tick, 9);
      };
      tick();
    });
  };

  const renderGuideChoices = (choices = []) => {
    if (!guideActions) return;
    guideActions.replaceChildren();
    choices.forEach(([label, id]) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "guide-action";
      const left = document.createElement("span");
      left.textContent = label;
      const right = document.createElement("span");
      right.textContent = "↗";
      right.setAttribute("aria-hidden", "true");
      button.append(left, right);
      button.addEventListener("click", () => selectGuideChoice(label, id));
      guideActions.appendChild(button);
    });
  };

  const showGuideNode = async (id, userLabel) => {
    const node = guideTree[id];
    if (!node) return;
    if (userLabel) {
      await appendGuideMessage(userLabel, "user");
      guideHistory.push({ role: "user", text: userLabel });
    }
    guidePath.add(id);
    updateGuideProgress();
    let message = node.message;
    let choices = node.choices;
    if (id === "start") {
      message = modeProfiles[activeGuideMode].message;
      choices = modeProfiles[activeGuideMode].choices;
    }
    await appendGuideMessage(message, "bot", true);
    guideHistory.push({ role: "bot", text: message });
    renderGuideChoices(choices);
  };

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({
      behavior: prefersReducedMotion.matches ? "auto" : "smooth",
      block: "start"
    });
  };

  const selectGuideChoice = async (label, id) => {
    if (guideTyping) return;
    if (id === "__tour__") return runGuideTour();
    if (id === "__challenge__") return runChallenge();
    if (id === "challenge:next") {
      challengeIndex += 0;
      renderChallenge();
      return;
    }
    if (id.startsWith("challenge:")) return answerChallenge(id);

    const routes = {
      "goto-work": () => { activateProject("frameflux"); scrollTo("work"); },
      "goto-frameflux": () => { activateProject("frameflux"); scrollTo("work"); },
      "goto-telemetry": () => { activateProject("telemetry"); scrollTo("work"); },
      "goto-systems": () => scrollTo("systems"),
      "goto-stack": () => scrollTo("stack"),
      "goto-contact": () => scrollTo("contact"),
      github: () => window.open("https://github.com/faizansaiyed123", "_blank", "noopener,noreferrer")
    };

    if (routes[id]) {
      await appendGuideMessage(label, "user");
      guideHistory.push({ role: "user", text: label });
      const target = id.replace("goto-", "");
      guidePath.add(target);
      updateGuideProgress();
      await appendGuideMessage(id === "github" ? "Opening GitHub." : "Opening " + target + ".", "bot", true);
      routes[id]();
      return;
    }

    await showGuideNode(id, label);
  };

  const contextNames = { top: "HOME", work: "WORK", systems: "SYSTEMS", stack: "STACK", contact: "CONTACT" };
  if ("IntersectionObserver" in window) {
    const contextObserver = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (visible?.target?.id) setGuideContext(contextNames[visible.target.id] || "HOME");
    }, { rootMargin: "-35% 0px -55% 0px", threshold: [0.05, 0.2, 0.5] });
    Object.keys(contextNames).forEach((id) => {
      const section = document.getElementById(id);
      if (section) contextObserver.observe(section);
    });
  }
  updateGuideProgress();

  const openGuide = () => {
    if (!guidePanel || !guideLauncher) return;
    guidePanel.hidden = false;
    guideLauncher.setAttribute("aria-expanded", "true");
    updateGuideProgress();
    $(".guide-top-button")?.setAttribute("aria-expanded", "true");
    if (!guideHistory.length) void showGuideNode("start");
    window.setTimeout(() => $("#guide-actions .guide-action")?.focus(), 80);
  };
  const closeGuide = () => {
    guidePanel && (guidePanel.hidden = true);
    guideLauncher?.setAttribute("aria-expanded", "false");
    $(".guide-top-button")?.setAttribute("aria-expanded", "false");
  };
  const toggleGuide = () => guidePanel?.hidden ? openGuide() : closeGuide();

  guideLauncher?.addEventListener("click", toggleGuide);
  $("#guide-top-button")?.addEventListener("click", openGuide);
  $("#hero-guide")?.addEventListener("click", openGuide);
  $("#hero-guide-card")?.addEventListener("click", openGuide);
  $("#mobile-guide")?.addEventListener("click", () => { closeMenu(); openGuide(); });
  guideClose?.addEventListener("click", closeGuide);
  guideForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (guideTyping) return;
    const value = guideInput?.value || "";
    const query = normalizeQuery(value);
    if (!query) return;
    guideInput.value = "";
    const intent = resolveFreeformIntent(query);
    if (!intent) {
      await appendGuideMessage(value, "user");
      await appendGuideMessage("I can route that question when it touches the portfolio: projects, FrameFlux, Telemetry, engineering approach, stack, contact, a guided tour, or an engineering challenge.", "bot", true);
      renderGuideChoices(modeProfiles[activeGuideMode].choices);
      return;
    }
    if (intent === "__tour__") {
      await appendGuideMessage(value, "user");
      return runGuideTour();
    }
    if (intent === "__challenge__") {
      await appendGuideMessage(value, "user");
      return runChallenge();
    }
    await showGuideNode(intent, value);
  });

  guideTour?.addEventListener("click", runGuideTour);
  guideChallenge?.addEventListener("click", runChallenge);

  guideRestart?.addEventListener("click", () => {
    guideHistory.length = 0;
    guidePath.clear();
    challengeIndex = 0;
    guideThread?.replaceChildren();
    renderGuideChoices([]);
    updateGuideProgress();
    void showGuideNode("start");
  });

  // Keep the chat anchored inside its own window.
  guideThread?.addEventListener("wheel", (event) => event.stopPropagation(), { passive: true });

  // Command palette. "/" reveals navigation and the guide can be opened with one keystroke.
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
  const renderCommands = (query = "") => {
    if (!commandResults) return;
    const q = query.trim().toLowerCase();
    const list = commands.filter(([title, type]) => !q || (title + " " + type).toLowerCase().includes(q));
    commandResults.replaceChildren();
    list.forEach(([title, type, target]) => {
      const item = document.createElement("button");
      item.type = "button";
      item.className = "command-result";
      const b = document.createElement("b"); b.textContent = title;
      const s = document.createElement("span"); s.textContent = type;
      item.append(b, s);
      item.addEventListener("click", () => {
        closeCommand();
        if (target === "__guide__") return openGuide();
        if (target === "frameflux" || target === "telemetry") activateProject(target);
        scrollTo(target === "frameflux" || target === "telemetry" ? "work" : target);
      });
      commandResults.appendChild(item);
    });
  };
  const openCommand = () => {
    if (!commandBar) return;
    commandBar.hidden = false;
    renderCommands();
    commandInput.value = "";
    window.setTimeout(() => commandInput.focus(), 30);
  };
  const closeCommand = () => { if (commandBar) commandBar.hidden = true; };
  $("#command-close")?.addEventListener("click", closeCommand);
  commandInput?.addEventListener("input", () => renderCommands(commandInput.value));

  document.addEventListener("keydown", (event) => {
    const target = event.target;
    const typing = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement || target?.isContentEditable;
    if (event.key === "/" && !typing && !guidePanel?.hidden) return;
    if (event.key === "/" && !typing) {
      event.preventDefault();
      openCommand();
      return;
    }
    if (event.key === "Escape") {
      closeCommand();
      closeGuide();
      closeMenu();
    }
  });

  // Close command palette when its backdrop is clicked.
  commandBar?.addEventListener("click", (event) => {
    if (event.target === commandBar) closeCommand();
  });

  $("#year") && ($("#year").textContent = String(new Date().getFullYear()));
  window.setTimeout(() => {
    if (!guideHistory.length && guideDock) guideDock.classList.add("is-attention");
  }, 4200);
  guideLauncher?.addEventListener("click", () => guideDock?.classList.remove("is-attention"), { once: true });
})();