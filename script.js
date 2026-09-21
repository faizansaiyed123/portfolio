(() => {
  "use strict";

  const root = document.documentElement;
  const menuToggle = document.querySelector(".menu-toggle");
  const siteNav = document.querySelector("#site-nav");
  const themeToggle = document.querySelector(".theme-toggle");
  const themeLabel = document.querySelector(".theme-label");
  const profileImage = document.querySelector("#profile-image");
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  const readTheme = () => {
    try {
      return localStorage.getItem("portfolio-theme");
    } catch {
      return null;
    }
  };

  const saveTheme = (value) => {
    try {
      localStorage.setItem("portfolio-theme", value);
    } catch {
      // Private browsing or storage-disabled environments can still use the site.
    }
  };

  const applyTheme = (theme) => {
    if (theme === "light" || theme === "dark") {
      root.dataset.theme = theme;
    } else {
      root.dataset.theme = "system";
    }

    const isDark = root.dataset.theme === "dark" ||
      (root.dataset.theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);

    if (themeToggle) {
      themeToggle.setAttribute("aria-pressed", String(isDark));
      themeToggle.setAttribute("aria-label", isDark ? "Use light theme" : "Use dark theme");
    }

    if (themeLabel) {
      themeLabel.textContent = isDark ? "Dark" : "Light";
    }
  };

  applyTheme(readTheme() || "system");

  themeToggle?.addEventListener("click", () => {
    const isDark = root.dataset.theme === "dark" ||
      (root.dataset.theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    const next = isDark ? "light" : "dark";
    applyTheme(next);
    saveTheme(next);
  });

  window.matchMedia("(prefers-color-scheme: dark)").addEventListener?.("change", () => {
    if (!readTheme()) {
      applyTheme("system");
    }
  });

  const closeMenu = () => {
    siteNav?.classList.remove("is-open");
    menuToggle?.setAttribute("aria-expanded", "false");
  };

  menuToggle?.addEventListener("click", () => {
    const open = siteNav?.classList.toggle("is-open") ?? false;
    menuToggle.setAttribute("aria-expanded", String(open));
  });

  document.querySelectorAll(".site-nav a").forEach((link) => {
    link.addEventListener("click", closeMenu);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeMenu();
    }
  });

  document.addEventListener("click", (event) => {
    if (!siteNav || !menuToggle || !siteNav.classList.contains("is-open")) return;
    const target = event.target;
    if (target instanceof Node && !siteNav.contains(target) && !menuToggle.contains(target)) {
      closeMenu();
    }
  });

  const sections = [...document.querySelectorAll("main section[id]")];
  const navLinks = [...document.querySelectorAll(".nav-link")];

  const setActiveSection = (id) => {
    navLinks.forEach((link) => {
      const active = link.getAttribute("href") === `#${id}`;
      link.classList.toggle("is-active", active);
    });
  };

  if ("IntersectionObserver" in window && sections.length) {
    const sectionObserver = new IntersectionObserver((entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

      if (visible?.target?.id) {
        setActiveSection(visible.target.id);
      }
    }, {
      rootMargin: "-25% 0px -55% 0px",
      threshold: [0.01, 0.2, 0.5]
    });

    sections.forEach((section) => sectionObserver.observe(section));
  }

  const revealItems = [...document.querySelectorAll(".reveal")];

  if (prefersReducedMotion.matches || !("IntersectionObserver" in window)) {
    revealItems.forEach((item) => item.classList.add("is-visible"));
  } else {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08, rootMargin: "0px 0px -40px 0px" });

    revealItems.forEach((item) => revealObserver.observe(item));
  }

  const updateScrollMeter = () => {
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    const progress = maxScroll > 0 ? Math.min(window.scrollY / maxScroll, 1) : 0;
    const meter = document.querySelector(".scroll-meter span");
    if (meter) {
      meter.style.width = `${progress * 100}%`;
    }
  };

  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(() => {
      updateScrollMeter();
      ticking = false;
    });
  };

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", updateScrollMeter, { passive: true });
  updateScrollMeter();

  profileImage?.addEventListener("error", () => {
    const fallback = profileImage.dataset.fallback;
    if (!fallback || profileImage.dataset.failed === "true") return;

    profileImage.dataset.failed = "true";
    profileImage.src = fallback;
    profileImage.alt = "Faizan Saiyed — profile placeholder";
  }, { once: true });

  const year = document.querySelector("#year");
  if (year) {
    year.textContent = String(new Date().getFullYear());
  }

  window.addEventListener("resize", () => {
    if (window.innerWidth > 780) {
      closeMenu();
    }
  });
})();
