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

  /* ---------- Portfolio guide / live GitHub intelligence ---------- */
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
  const guideEvidence = $("#guide-evidence");

  const configuredChatApiUrl =
    document.querySelector('meta[name="chat-api-url"]')?.getAttribute("content")?.trim() || "";
  const CHAT_API_URL =
    configuredChatApiUrl ||
    "https://faizan-portfolio-chat.vercel.app/api/chat";

  const guideState = {
    mode: "recruiter",
    history: [],
    path: new Set(),
    typing: false,
    challengeIndex: 0,
    tourRunning: false,
    livePending: false,
    liveController: null
  };

  try {
    guideState.mode = sessionStorage.getItem("portfolio-guide-mode") || "recruiter";
  } catch {}
  if (!["recruiter", "engineer", "explorer"].includes(guideState.mode)) guideState.mode = "recruiter";

  const modeProfiles = {
    recruiter: {
      label: "RECRUITER",
      placeholder: "Ask what was built, what stands out, or how to contact...",
      intro: "Recruiter lens active. I’ll keep the signal concise, with live GitHub evidence behind project answers.",
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
      intro: "Engineer lens active. I’ll use the current repositories to explain architecture, state, persistence, realtime flow, security, and verification.",
      choices: [
        ["Deep dive FrameFlux", "frameflux"],
        ["Deep dive Telemetry", "telemetry"],
        ["Run an engineering challenge", "__challenge__"],
        ["Show the engineering method", "method"]
      ]
    },
    explorer: {
      label: "EXPLORER",
      placeholder: "Ask anything about the portfolio or GitHub projects...",
      intro: "Explorer lens active. Ask naturally about projects, repositories, architecture, technologies, activity, or contact.",
      choices: [
        ["Show the public repositories", "projects"],
        ["Take the guided tour", "__tour__"],
        ["Run an engineering challenge", "__challenge__"],
        ["Open the stack", "stack"],
        ["Contact Faizan", "contact"]
      ]
    }
  };

  const liveGuideQueries = {
    projects:
      "What public GitHub repositories has Faizan built? Summarize the current public repository set and identify which repositories are highlighted by the portfolio.",
    frameflux:
      "Explain FrameFlux from its current public GitHub repositories. Cover what it does, why it was built, how it works, main features, architecture, technologies, important files, APIs or external services, and how the parts work together. Use only verifiable repository evidence.",
    telemetry:
      "Explain Telemetry from its current public GitHub repositories. Cover what it does, why it was built, how it works, main features, architecture, technologies, important files, APIs or external services, and how the parts work together. Use only verifiable repository evidence.",
    stack:
      "What technologies and frameworks are verifiably used across Faizan's current public repositories? Explain the evidence rather than relying on a hardcoded resume list."
  };

  const guideTree = {
    start: {
      message: modeProfiles[guideState.mode].intro,
      choices: modeProfiles[guideState.mode].choices
    },
    method: {
      message: "The repeated engineering moves are to separate expensive work, keep authority on the backend, validate before spending compute, and verify behavior from the outside in.",
      choices: [
        ["Show the current projects", "projects"],
        ["Ask the live GitHub stack", "stack"],
        ["Back to start", "start"]
      ]
    },
    contact: {
      message: "The direct channel is email. The portfolio opens your mail client instead of using a third-party contact form.",
      choices: [
        ["Open Contact", "goto-contact"],
        ["Open GitHub", "github"],
        ["Back to start", "start"]
      ]
    },
    github: {
      message: "Faizan's public GitHub profile is available directly. Repository discovery in this assistant is live, so new public repositories can appear without updating this page.",
      choices: [
        ["Show public repositories", "projects"],
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
        wrong: "That turns a resumable workflow into a restart workflow. The design is based on explicit upload state."
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
        backend: "Exactly. The backend should remain authoritative for alert lifecycle and authorization; the browser renders that state.",
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
        validate: "Correct. Validation is useful because it keeps suspicious input away from expensive processing.",
        wrong: "That waits too long. Validation belongs before expensive work starts."
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

    if (role === "bot") {
      guideDock?.classList.add("is-thinking");
      if (!type || prefersReducedMotion.matches) {
        window.setTimeout(() => guideDock?.classList.remove("is-thinking"), 140);
      }
    }

    if (!type || prefersReducedMotion.matches) {
      element.textContent = message;
      if (guideThread) guideThread.scrollTop = guideThread.scrollHeight;
      return Promise.resolve(element);
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
          guideDock?.classList.remove("is-thinking");
          if (guideThread) guideThread.scrollTop = guideThread.scrollHeight;
          resolve(element);
          return;
        }
        element.insertBefore(document.createTextNode(message[index]), cursor);
        index += 1;
        if (guideThread) guideThread.scrollTop = guideThread.scrollHeight;
        window.setTimeout(tick, 5);
      };
      tick();
    });
  };

  const clearGuideEvidence = () => {
    guideEvidence?.replaceChildren();
  };

  const safeHttpsUrl = (value) => {
    try {
      const url = new URL(value);
      return url.protocol === "https:" ? url.href : null;
    } catch {
      return null;
    }
  };

  const renderRepositoryCards = (repositories = []) => {
    if (!guideEvidence || !repositories.length) return;

    const wrap = document.createElement("div");
    wrap.className = "guide-repository-list";

    repositories.forEach((repo) => {
      const card = document.createElement("article");
      card.className = "guide-repository-card";

      const head = document.createElement("div");
      head.className = "guide-repository-head";

      const title = document.createElement("a");
      title.className = "guide-repository-title";
      title.textContent = repo.name || repo.fullName;
      title.href = repo.url || "#";
      title.target = "_blank";
      title.rel = "noopener noreferrer";

      const mark = document.createElement("span");
      mark.textContent = repo.archived ? "ARCHIVED" : "PUBLIC";
      mark.className = repo.archived ? "is-muted" : "";

      head.append(title, mark);
      card.appendChild(head);

      const description = document.createElement("p");
      description.textContent = repo.description || "No GitHub description is currently available.";
      card.appendChild(description);

      const meta = document.createElement("div");
      meta.className = "guide-repository-meta";

      const metaItems = [
        ["LANG", repo.language || "—"],
        ["★", String(repo.stars ?? 0)],
        ["FORKS", String(repo.forks ?? 0)],
        ["OPEN", String(repo.openIssues ?? 0)]
      ];

      metaItems.forEach(([label, value]) => {
        const item = document.createElement("span");
        const labelEl = document.createElement("b");
        labelEl.textContent = label;
        const valueEl = document.createElement("em");
        valueEl.textContent = value;
        item.append(labelEl, valueEl);
        meta.appendChild(item);
      });

      card.appendChild(meta);

      if (repo.homepage) {
        const demo = document.createElement("a");
        demo.className = "guide-repository-demo";
        demo.textContent = "Live / demo ↗";
        demo.href = safeHttpsUrl(repo.homepage) || "#";
        demo.target = "_blank";
        demo.rel = "noopener noreferrer";
        if (demo.href !== "#") card.appendChild(demo);
      }

      wrap.appendChild(card);
    });

    guideEvidence.appendChild(wrap);
  };

  const renderSourceCards = (sources = []) => {
    if (!guideEvidence || !sources.length) return;

    const filtered = sources
      .filter((source) => source && source.url)
      .filter((source, index, list) =>
        list.findIndex((item) => item.url === source.url) === index
      )
      .slice(0, 12);

    if (!filtered.length) return;

    const heading = document.createElement("div");
    heading.className = "guide-evidence-heading";
    heading.textContent = "SOURCE EVIDENCE";
    guideEvidence.appendChild(heading);

    const list = document.createElement("div");
    list.className = "guide-source-list";

    filtered.forEach((source) => {
      const link = document.createElement("a");
      link.className = "guide-source-link";
      link.href = safeHttpsUrl(source.url) || "#";
      link.target = "_blank";
      link.rel = "noopener noreferrer";

      const title = document.createElement("b");
      title.textContent = source.path || source.title || source.repository;

      const repo = document.createElement("span");
      repo.textContent = source.repository;

      link.append(title, repo);
      list.appendChild(link);
    });

    guideEvidence.appendChild(list);
  };

  const renderLiveResult = (payload) => {
    clearGuideEvidence();

    const repositories = Array.isArray(payload?.repositories)
      ? payload.repositories
      : [];

    if (repositories.length) {
      renderRepositoryCards(repositories);
    }

    if (Array.isArray(payload?.sources) && payload.sources.length) {
      renderSourceCards(payload.sources);
    }
  };

  const askLiveQuestion = async (
    question,
    userLabel = question,
    options = {}
  ) => {
    if (
      guideState.typing ||
      guideState.livePending ||
      !question ||
      (guideState.tourRunning && !options.allowDuringTour)
    ) return;

    const appendUser = options.appendUser !== false;
    const renderChoicesAfter = options.renderChoicesAfter !== false;

    if (appendUser && userLabel) {
      await appendMessage(userLabel, "user");
      guideState.history.push({ role: "user", content: userLabel });
    }

    guideState.livePending = true;
    guideState.path.add("github");
    updateGuideProgress();
    guideDock?.setAttribute("data-live-state", "loading");
    guideInput && (guideInput.disabled = true);
    guideActions?.replaceChildren();

    clearGuideEvidence();

    const loading = document.createElement("p");
    loading.className = "guide-message guide-message-bot guide-message-live-loading";
    loading.textContent = "LIVE / READING GITHUB EVIDENCE…";
    guideThread?.appendChild(loading);
    if (guideThread) guideThread.scrollTop = guideThread.scrollHeight;

    const controller = new AbortController();
    guideState.liveController = controller;

    try {
      const response = await fetch(CHAT_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: question,
          history: guideState.history.slice(-8)
        }),
        signal: controller.signal
      });

      const payload = await response.json().catch(() => null);
      loading.remove();

      if (!response.ok || !payload?.ok) {
        if (payload?.code === "RATE_LIMITED" || response.status === 429) {
          const retry = Number(payload?.retryAfterSeconds || 30);
          await appendMessage(
            "The public assistant is rate-limited right now. Please try again in about " +
              Math.max(1, Math.ceil(retry / 60)) +
              " minute(s).",
            "bot",
            true
          );
        } else {
          await appendMessage(
            "Live GitHub intelligence is temporarily unavailable. I won't guess about repository details.",
            "bot",
            true
          );
        }

        if (renderChoicesAfter) renderChoices(modeProfiles[guideState.mode].choices);
        return;
      }

      if (payload.status === "ambiguous") {
        await appendMessage(
          payload.message ||
            "I found several public repositories that could match that request. Choose one.",
          "bot",
          true
        );
        renderLiveResult(payload);
        if (renderChoicesAfter) renderChoices(modeProfiles[guideState.mode].choices);
        guideState.history.push({
          role: "bot",
          content: payload.message || "Several public repositories matched."
        });
        return;
      }

      if (payload.status === "inaccessible") {
        const message =
          payload.message ||
          "That repository could not be verified as an accessible public repository, so I won't invent details.";
        await appendMessage(message, "bot", true);
        renderLiveResult(payload);
        if (renderChoicesAfter) renderChoices(modeProfiles[guideState.mode].choices);
        guideState.history.push({ role: "bot", content: message });
        return;
      }

      const answer =
        payload.answer ||
        payload.message ||
        "I found the current GitHub evidence, but there is not enough verified information to answer that confidently.";

      await appendMessage(answer, "bot", true);
      renderLiveResult(payload);

      guideState.history.push({ role: "bot", content: answer });

      if (renderChoicesAfter) {
        renderChoices([
          ...modeProfiles[guideState.mode].choices.slice(0, 3),
          ["Back to start", "start"]
        ]);
      }
    } catch (error) {
      loading.remove();

      if (error?.name === "AbortError") {
        if (renderChoicesAfter) renderChoices(modeProfiles[guideState.mode].choices);
        return;
      }

      await appendMessage(
        "I couldn't reach the live project service. No repository details were fabricated.",
        "bot",
        true
      );

      if (renderChoicesAfter) renderChoices(modeProfiles[guideState.mode].choices);
    } finally {
      guideState.livePending = false;
      guideState.liveController = null;
      guideDock?.setAttribute("data-live-state", "ready");
      if (guideInput) guideInput.disabled = false;
    }
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
    if (liveGuideQueries[id]) {
      return askLiveQuestion(liveGuideQueries[id], userLabel || liveGuideQueries[id]);
    }

    const node = guideTree[id];
    if (!node) return;

    if (userLabel) {
      await appendMessage(userLabel, "user");
      guideState.history.push({ role: "user", content: userLabel });
    }

    guideState.path.add(id);
    updateGuideProgress();

    const message = id === "start" ? modeProfiles[guideState.mode].intro : node.message;
    const choices = id === "start" ? modeProfiles[guideState.mode].choices : node.choices;

    await appendMessage(message, "bot", true);
    guideState.history.push({ role: "bot", content: message });
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
    guideDock?.classList.add("is-open");
    guideDock?.classList.remove("is-attention");
    updateGuideModeUI();
    updateGuideProgress();

    if (!guideState.history.length) {
      void showNode("start");
    } else {
      renderChoices(modeProfiles[guideState.mode].choices);
    }

    window.setTimeout(() => guideInput?.focus(), 80);
  };

  const closeGuide = () => {
    guideState.liveController?.abort();
    guidePanel && (guidePanel.hidden = true);
    guideLauncher?.setAttribute("aria-expanded", "false");
    guideTopButton?.setAttribute("aria-expanded", "false");
    guideDock?.classList.remove("is-open", "is-thinking", "is-tour");
  };

  const handleRoute = async (label, action) => {
    await appendMessage(label, "user");
    guideState.history.push({ role: "user", content: label });
    guideState.path.add(action.replace("goto-", ""));
    updateGuideProgress();

    const responses = {
      "goto-work": "Opening the selected work casebook.",
      "goto-frameflux": "Opening FrameFlux. The repository answer above is live.",
      "goto-telemetry": "Opening Telemetry. The repository answer above is live.",
      "goto-systems": "Opening the systems-thinking layer.",
      "goto-stack": "Opening the live stack evidence.",
      "goto-contact": "Opening the direct contact channel."
    };

    await appendMessage(responses[action] || "Opening that section.", "bot", true);

    if (action === "goto-frameflux") activateProject("frameflux", true);
    else if (action === "goto-telemetry") activateProject("telemetry", true);
    else if (action === "goto-work") scrollToSection("work");
    else scrollToSection(action.replace("goto-", ""));
  };

  const runChallenge = async () => {
    if (guideState.typing || guideState.tourRunning || guideState.livePending) return;

    guideState.challengeIndex = 0;
    await appendMessage(
      "ENGINEERING CHALLENGE MODE — answer first, then I’ll explain the design decision.",
      "bot",
      true
    );
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
    if (guideState.typing || guideState.livePending) return;

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
    if (guideState.typing || guideState.tourRunning || guideState.livePending) return;

    guideState.tourRunning = true;
    guideDock?.classList.add("guide-tour-running", "is-tour");

    await appendMessage(
      "GUIDED TOUR STARTED — I’ll take you through live project evidence → systems → stack → contact.",
      "bot",
      true
    );

    scrollToSection("work");
    await new Promise((resolve) =>
      window.setTimeout(resolve, prefersReducedMotion.matches ? 120 : 700)
    );
    await askLiveQuestion(
      liveGuideQueries.projects,
      null,
      { appendUser: false, renderChoicesAfter: false, allowDuringTour: true }
    );

    scrollToSection("systems");
    await new Promise((resolve) =>
      window.setTimeout(resolve, prefersReducedMotion.matches ? 120 : 800)
    );
    await appendMessage(
      "Then the design logic: boundaries, backend authority, validation before expensive work, and verification are the repeated engineering moves.",
      "bot",
      true
    );

    scrollToSection("stack");
    await new Promise((resolve) =>
      window.setTimeout(resolve, prefersReducedMotion.matches ? 120 : 800)
    );
    await askLiveQuestion(
      liveGuideQueries.stack,
      null,
      { appendUser: false, renderChoicesAfter: false }
    );

    scrollToSection("contact");
    await new Promise((resolve) =>
      window.setTimeout(resolve, prefersReducedMotion.matches ? 120 : 700)
    );
    await appendMessage(
      "Finally, the site closes on a direct human channel and verified source links.",
      "bot",
      true
    );

    guideState.tourRunning = false;
    guideDock?.classList.remove("guide-tour-running", "is-tour");
    renderChoices(modeProfiles[guideState.mode].choices);
  };

  const normalize = (value) => value.trim().toLowerCase();

  const resolveIntent = (query) => {
    if (/tour|walk me|show me around|take me around/.test(query)) return "__tour__";
    if (/challenge|quiz|test me|question me/.test(query)) return "__challenge__";
    if (/contact|email|hire|reach|linkedin|connect/.test(query)) return "contact";
    if (/systems thinking|engineering focus|engineering method|engineering approach/.test(query)) return "method";
    if (/^github$|open github|github profile/.test(query)) return "github";
    return "__ai__";
  };

  const handleChoice = async (label, action) => {
    if (guideState.typing || guideState.tourRunning || guideState.livePending) return;

    if (action === "__tour__") return runTour();
    if (action === "__challenge__") return runChallenge();
    if (action.startsWith("challenge:")) return answerChallenge(action);
    if (action.startsWith("goto-")) return handleRoute(label, action);

    if (liveGuideQueries[action]) {
      return showNode(action, label);
    }

    await showNode(action, label);
  };

  guideModes.forEach((button) => {
    button.addEventListener("click", async () => {
      if (guideState.typing || guideState.livePending) return;

      const mode = button.dataset.guideMode || "explorer";
      if (!modeProfiles[mode]) return;

      guideState.mode = mode;
      saveGuideMode();
      updateGuideModeUI();

      guideState.history.length = 0;
      guideState.path.clear();
      guideState.challengeIndex = 0;
      guideState.liveController?.abort();
      guideThread?.replaceChildren();
      renderChoices([]);
      clearGuideEvidence();
      updateGuideProgress();

      await showNode("start");
    });
  });

  guideForm?.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (guideState.typing || guideState.tourRunning || guideState.livePending) return;

    const value = guideInput?.value || "";
    const query = normalize(value);
    if (!query) return;

    if (guideInput) guideInput.value = "";

    const intent = resolveIntent(query);

    if (intent === "__tour__") {
      await appendMessage(value, "user");
      guideState.history.push({ role: "user", content: value });
      return runTour();
    }

    if (intent === "__challenge__") {
      await appendMessage(value, "user");
      guideState.history.push({ role: "user", content: value });
      return runChallenge();
    }

    if (intent === "contact" || intent === "method" || intent === "github") {
      return showNode(intent, value);
    }

    return askLiveQuestion(value, value);
  });

  guideLauncher?.addEventListener("click", () => {
    if (guidePanel?.hidden) openGuide();
    else closeGuide();
  });
  guideTopButton?.addEventListener("click", openGuide);
  $("#hero-guide")?.addEventListener("click", openGuide);
  $("#mobile-guide")?.addEventListener("click", () => { closeMenu(); openGuide(); });
  $("#footer-guide")?.addEventListener("click", openGuide);
  guideClose?.addEventListener("click", closeGuide);
  guideTour?.addEventListener("click", runTour);
  guideChallenge?.addEventListener("click", runChallenge);

  guideRestart?.addEventListener("click", () => {
    guideState.liveController?.abort();
    guideState.history.length = 0;
    guideState.path.clear();
    guideState.challengeIndex = 0;
    guideState.tourRunning = false;
    guideState.livePending = false;
    guideDock?.classList.remove("guide-tour-running");
    guideThread?.replaceChildren();
    guideActions?.replaceChildren();
    clearGuideEvidence();
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