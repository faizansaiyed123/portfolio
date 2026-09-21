(() => {
  "use strict";

  const root = document.documentElement;
  const menuToggle = document.querySelector(".menu-toggle");
  const mobileNav = document.querySelector("#mobile-nav");
  const themeToggle = document.querySelector(".theme-toggle");
  const themeLabel = document.querySelector(".theme-label");
  const profileImage = document.querySelector("#profile-image");
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  const getStoredTheme = () => {
    try {
      return localStorage.getItem("portfolio-theme") || "system";
    } catch {
      return "system";
    }
  };

  const setStoredTheme = (theme) => {
    try {
      localStorage.setItem("portfolio-theme", theme);
    } catch {
      /* The site remains fully usable without persistence. */
    }
  };

  const isDark = () => {
    if (root.dataset.theme === "dark") return true;
    if (root.dataset.theme === "light") return false;
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  };

  const applyTheme = (theme) => {
    root.dataset.theme = theme;
    const label = theme === "system" ? (isDark() ? "Auto / dark" : "Auto / light") : theme === "dark" ? "Dark" : "Light";
    themeLabel && (themeLabel.textContent = label);
    themeToggle?.setAttribute("aria-pressed", String(isDark()));
    themeToggle?.setAttribute("aria-label", isDark() ? "Switch to light theme" : "Switch to dark theme");
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    metaTheme?.setAttribute("content", isDark() ? "#0e1012" : "#f0eee8");
  };

  applyTheme(getStoredTheme());

  themeToggle?.addEventListener("click", () => {
    const next = isDark() ? "light" : "dark";
    applyTheme(next);
    setStoredTheme(next);
  });

  const colorSchemeQuery = window.matchMedia("(prefers-color-scheme: dark)");
  colorSchemeQuery.addEventListener?.("change", () => {
    if (getStoredTheme() === "system") applyTheme("system");
  });

  const closeMobileNav = () => {
    mobileNav?.classList.remove("is-open");
    menuToggle?.classList.remove("is-open");
    menuToggle?.setAttribute("aria-expanded", "false");
  };

  menuToggle?.addEventListener("click", () => {
    const open = mobileNav?.classList.toggle("is-open") ?? false;
    menuToggle.classList.toggle("is-open", open);
    menuToggle.setAttribute("aria-expanded", String(open));
  });

  mobileNav?.querySelectorAll("a").forEach((link) => link.addEventListener("click", closeMobileNav));

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeMobileNav();
      const guidePanel = document.querySelector("#guide-panel");
      if (guidePanel && !guidePanel.hidden) closeGuide();
    }
  });

  document.addEventListener("click", (event) => {
    if (!mobileNav?.classList.contains("is-open")) return;
    const target = event.target;
    if (target instanceof Node && !mobileNav.contains(target) && !menuToggle?.contains(target)) closeMobileNav();
  });

  const sections = [...document.querySelectorAll("main section[id]")];
  const links = [...document.querySelectorAll("[data-nav]")];

  const setActiveNav = (id) => {
    links.forEach((link) => link.classList.toggle("is-active", link.dataset.nav === id));
  };

  if ("IntersectionObserver" in window) {
    const sectionObserver = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (visible?.target?.id) setActiveNav(visible.target.id);
    }, { rootMargin: "-25% 0px -60% 0px", threshold: [0.05, 0.2, 0.5] });
    sections.forEach((section) => sectionObserver.observe(section));

    if (!prefersReducedMotion.matches) {
      const revealObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0.08, rootMargin: "0px 0px -40px 0px" });
      document.querySelectorAll(".reveal").forEach((item) => revealObserver.observe(item));
    } else {
      document.querySelectorAll(".reveal").forEach((item) => item.classList.add("is-visible"));
    }
  } else {
    document.querySelectorAll(".reveal").forEach((item) => item.classList.add("is-visible"));
  }

  const updateScrollMeter = () => {
    const total = document.documentElement.scrollHeight - window.innerHeight;
    const progress = total > 0 ? Math.min(window.scrollY / total, 1) : 0;
    const meter = document.querySelector(".scroll-meter span");
    if (meter) meter.style.width = `${progress * 100}%`;
  };

  let scrollTick = false;
  window.addEventListener("scroll", () => {
    if (scrollTick) return;
    scrollTick = true;
    requestAnimationFrame(() => {
      updateScrollMeter();
      scrollTick = false;
    });
  }, { passive: true });

  profileImage?.addEventListener("error", () => {
    const fallback = profileImage.dataset.fallback;
    if (!fallback || profileImage.dataset.failed === "true") return;
    profileImage.dataset.failed = "true";
    profileImage.src = fallback;
    profileImage.alt = "Faizan Saiyed — local fallback profile mark";
  }, { once: true });

  document.querySelectorAll(".inspect-trigger").forEach((button) => {
    button.addEventListener("click", () => {
      const panel = document.getElementById(button.getAttribute("aria-controls") || "");
      if (!panel) return;
      const willOpen = panel.hidden;
      panel.hidden = !willOpen;
      button.setAttribute("aria-expanded", String(willOpen));
      if (willOpen && !prefersReducedMotion.matches) {
        panel.animate(
          [{ opacity: 0, transform: "translateY(-6px)" }, { opacity: 1, transform: "translateY(0)" }],
          { duration: 230, easing: "cubic-bezier(.22,.61,.36,1)" }
        );
      }
    });
  });

  const guideLauncher = document.querySelector("#guide-launcher");
  const guidePanel = document.querySelector("#guide-panel");
  const guideClose = document.querySelector("#guide-close");
  const guideThread = document.querySelector("#guide-thread");
  const guideActions = document.querySelector("#guide-actions");
  const guideRestart = document.querySelector("#guide-restart");

  const guideState = { history: [], typing: false };

  const guideTree = {
    start: {
      message: "Hi. I built this page around the work rather than around a list of claims. Where should we go?",
      choices: [
        ["Show me the strongest project", "projects"],
        ["How do you approach engineering?", "method"],
        ["What is the stack, really?", "stack"],
        ["I want to get in touch", "contact"]
      ]
    },
    projects: {
      message: "There are two systems worth inspecting closely. One is about asynchronous media work; the other is realtime observability.",
      choices: [
        ["Inspect FrameFlux", "frameflux"],
        ["Inspect Telemetry", "telemetry"],
        ["Why these two?", "why-projects"],
        ["Back to the start", "start"]
      ]
    },
    frameflux: {
      message: "FrameFlux keeps long-running media work behind a job boundary: FastAPI for orchestration, PostgreSQL for durable metadata, Redis/ARQ for background work and progress, and FFmpeg in the worker path.",
      choices: [
        ["Open FrameFlux case study", "goto-frameflux"],
        ["Back to projects", "projects"],
        ["Start again", "start"]
      ]
    },
    telemetry: {
      message: "Telemetry treats the backend as the source of truth. Synthetic signals flow through a central manager, anomaly detection and bounded persistence, then reach authenticated WebSockets and a browser dashboard.",
      choices: [
        ["Open Telemetry case study", "goto-telemetry"],
        ["Back to projects", "projects"],
        ["Start again", "start"]
      ]
    },
    "why-projects": {
      message: "Together they expose two different kinds of state: durable job state in media processing and live system state in observability. Both make backend boundaries visible.",
      choices: [
        ["Read the project details", "projects"],
        ["See the engineering method", "method"],
        ["Start again", "start"]
      ]
    },
    method: {
      message: "The recurring ideas are simple: isolate expensive work, keep authority on the backend, validate before spending, and test behavior from the outside in.",
      choices: [
        ["Jump to Method", "goto-method"],
        ["See the stack", "stack"],
        ["Back to the start", "start"]
      ]
    },
    stack: {
      message: "The center of gravity is Python/FastAPI and PostgreSQL. Around that: SQLAlchemy, Alembic, WebSockets, Redis/ARQ, FFmpeg, React, Next.js, TypeScript, Vite, Docker, Pytest and Playwright.",
      choices: [
        ["Open the stack section", "goto-stack"],
        ["Show the projects", "projects"],
        ["Start again", "start"]
      ]
    },
    contact: {
      message: "Email is the direct channel here. It opens your mail client, so the site stays independent from third-party form services.",
      choices: [
        ["Open contact", "goto-contact"],
        ["Show the projects", "projects"],
        ["Back to the start", "start"]
      ]
    }
  };

  const appendMessage = (text, role, typed = false) => {
    const message = document.createElement("p");
    message.className = `guide-message guide-message-${role}`;
    guideThread?.appendChild(message);

    if (!typed || prefersReducedMotion.matches) {
      message.textContent = text;
      guideThread && (guideThread.scrollTop = guideThread.scrollHeight);
      return Promise.resolve();
    }

    guideState.typing = true;
    const cursor = document.createElement("span");
    cursor.className = "cursor";
    message.appendChild(cursor);
    let index = 0;

    return new Promise((resolve) => {
      const tick = () => {
        if (index >= text.length) {
          cursor.remove();
          guideState.typing = false;
          guideThread && (guideThread.scrollTop = guideThread.scrollHeight);
          resolve();
          return;
        }
        message.insertBefore(document.createTextNode(text[index]), cursor);
        index += 1;
        guideThread && (guideThread.scrollTop = guideThread.scrollHeight);
        window.setTimeout(tick, 11);
      };
      tick();
    });
  };

  const renderChoices = (choices) => {
    if (!guideActions) return;
    guideActions.replaceChildren();
    choices.forEach(([label, id]) => {
      const button = document.createElement("button");
      button.className = "guide-action";
      button.type = "button";
      button.innerHTML = `<span>${label}</span><span aria-hidden="true">↗</span>`;
      button.addEventListener("click", () => selectGuideChoice(label, id));
      guideActions.appendChild(button);
    });
  };

  const showGuideNode = async (id, userLabel = null) => {
    const node = guideTree[id];
    if (!node || !guideThread) return;

    if (userLabel) {
      guideState.history.push({ role: "user", label: userLabel });
      await appendMessage(userLabel, "user");
    }

    guideState.history.push({ role: "bot", label: node.message });
    await appendMessage(node.message, "bot", true);
    renderChoices(node.choices);
  };

  const scrollToId = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: prefersReducedMotion.matches ? "auto" : "smooth", block: "start" });
  };

  const selectGuideChoice = async (label, id) => {
    if (guideState.typing) return;

    if (id === "goto-frameflux" || id === "goto-telemetry" || id === "goto-method" || id === "goto-stack" || id === "goto-contact") {
      const target = id.replace("goto-", "");
      const node = guideTree[target === "frameflux" ? "frameflux" : target === "telemetry" ? "telemetry" : target];
      await appendMessage(label, "user");
      await appendMessage(node?.message || "Opening that section.", "bot", true);
      scrollToId(target === "frameflux" ? "frameflux" : target === "telemetry" ? "telemetry" : target);
      renderChoices(node?.choices || [["Back to start", "start"]]);
      return;
    }

    await showGuideNode(id, label);
  };

  const openGuide = () => {
    if (!guidePanel || !guideLauncher) return;
    guidePanel.hidden = false;
    guideLauncher.setAttribute("aria-expanded", "true");
    if (!guideState.history.length) void showGuideNode("start");
    window.setTimeout(() => document.querySelector("#guide-actions .guide-action")?.focus(), 60);
  };

  const closeGuide = () => {
    if (!guidePanel || !guideLauncher) return;
    guidePanel.hidden = true;
    guideLauncher.setAttribute("aria-expanded", "false");
  };

  const restartGuide = () => {
    guideState.history.length = 0;
    if (guideThread) guideThread.replaceChildren();
    renderChoices([]);
    void showGuideNode("start");
  };

  guideLauncher?.addEventListener("click", () => guidePanel?.hidden ? openGuide() : closeGuide());
  guideClose?.addEventListener("click", closeGuide);
  guideRestart?.addEventListener("click", restartGuide);

  const year = document.querySelector("#year");
  if (year) year.textContent = String(new Date().getFullYear());

  updateScrollMeter();
})();
