(() => {
  "use strict";
  const PREVIEW_URL = "/agencyos-demo/";

  const makeLink = (className, label) => {
    const link = document.createElement("a");
    link.className = className;
    link.href = PREVIEW_URL;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = label;
    return link;
  };

  const appendFacts = (container) => {
    const facts = document.createElement("div");
    facts.className = "agencyos-preview-facts";
    ["No account or setup", "7 sample roles", "Fictional records", "Resettable workspace"].forEach((label) => {
      const item = document.createElement("span");
      item.textContent = label;
      facts.append(item);
    });
    container.append(facts);
  };

  const enhanceCardDialog = () => {
    const dialog = document.querySelector("#project-dialog");
    const content = document.querySelector("#dialog-content");
    if (!dialog?.open || !content) return;
    const title = content.querySelector("#dialog-title");
    if (title?.textContent.trim() !== "AgencyOS") return;
    const readiness = content.querySelector(".demo-readiness");
    if (!readiness || readiness.dataset.agencyosPreviewEnhanced === "true") return;
    readiness.dataset.agencyosPreviewEnhanced = "true";

    const state = content.querySelector(".dialog-state");
    if (state) {
      state.textContent = "Interactive preview available";
      state.classList.add("agencyos-preview-state");
    }
    const heading = readiness.querySelector("h3");
    if (heading) heading.textContent = "Full-stack environment status";
    const description = readiness.querySelector("p");
    if (description) description.textContent =
      "The browser preview is ready to use. The separate multi-user API, PostgreSQL tenancy and worker deployment remain under verification.";
    const warning = readiness.querySelector(".demo-warning");
    if (warning) warning.textContent =
      "Preview boundary: changes are saved only in this browser profile. Email, external webhooks, payment processing and background workers are not sent or run.";

    const statusLine = content.querySelector(".dialog-status-line");
    if (statusLine) {
      statusLine.replaceChildren();
      ["INTERACTIVE PREVIEW: AVAILABLE", "FULL-STACK API: VERIFICATION PENDING", "DATA: FICTIONAL / BROWSER-LOCAL"].forEach((value) => {
        const item = document.createElement("span");
        item.textContent = value;
        statusLine.append(item);
      });
    }
    const oldUrl = [...readiness.querySelectorAll("a")].find((link) => /listed frontend url/i.test(link.textContent));
    oldUrl?.remove();

    const panel = document.createElement("div");
    panel.className = "agencyos-preview-panel";
    const copy = document.createElement("div");
    copy.className = "agencyos-preview-copy";
    const kicker = document.createElement("span");
    kicker.className = "agencyos-preview-kicker";
    kicker.textContent = "Ready to explore";
    const titleText = document.createElement("h3");
    titleText.textContent = "Step inside the workspace.";
    const body = document.createElement("p");
    body.textContent = "Open a ready-to-use sample agency workspace without signing up. Start as the Owner, switch between team and client roles, and explore the connected workflow.";
    copy.append(kicker, titleText, body);
    appendFacts(copy);
    const action = makeLink("agencyos-preview-link", "Open interactive workspace ↗");
    action.setAttribute("aria-label", "Open the AgencyOS interactive browser preview in a new tab");
    panel.append(copy, action);
    readiness.insertBefore(panel, readiness.firstChild);

    const disclosure = document.createElement("p");
    disclosure.className = "agencyos-preview-disclosure";
    disclosure.textContent = "Your work stays in this browser. Use “Reset workspace” inside AgencyOS to restore the original sample data. This is a functional frontend preview, not a shared multi-user production service.";
    readiness.insertBefore(disclosure, statusLine || null);

    const systemTitle = [...readiness.querySelectorAll("h3")].find((item) => item.textContent.trim() === "System path");
    if (systemTitle) systemTitle.textContent = "Full-stack architecture reference";
  };

  const enhanceProjectLab = () => {
    const article = document.querySelector("#project-lab");
    const title = document.querySelector("#lab-title");
    if (!article || article.hidden || title?.textContent.trim() !== "AgencyOS") return;
    if (article.dataset.agencyosPreviewEnhanced === "true") return;
    article.dataset.agencyosPreviewEnhanced = "true";

    const heroActions = document.querySelector("#lab-hero-actions");
    if (heroActions) heroActions.replaceChildren(makeLink("button button-primary agencyos-preview-link", "Open interactive workspace ↗"));
    const heroNote = document.querySelector(".lab-hero-note");
    if (heroNote) heroNote.textContent = "No sign-up or installation is needed. You enter a preloaded Owner workspace with fictional agency data. Changes stay in this browser and can be reset at any time.";

    const statusCard = document.querySelector(".lab-status-row .lab-status-card");
    const statusLabel = statusCard?.querySelector(".lab-meta-label");
    if (statusLabel) statusLabel.textContent = "INTERACTIVE PREVIEW";
    const status = document.querySelector("#lab-status");
    if (status) status.textContent = "Ready to explore";
    const statusDetail = document.querySelector("#lab-status-detail");
    if (statusDetail) statusDetail.textContent = "The browser-local workspace is available now. Full-stack API, shared PostgreSQL tenancy and worker deployment remain verification-pending.";

    const runtime = document.querySelector("#lab-runtime");
    if (runtime) runtime.textContent = "Browser-local workspace (IndexedDB)";
    const runtimeDetail = document.querySelector("#lab-runtime-detail");
    if (runtimeDetail) runtimeDetail.textContent = "Each visitor has their own seeded workspace in their browser profile. Changes are not shared with other visitors; Reset workspace restores the sample records.";

    const systemIntro = document.querySelector(".lab-system-section .lab-section-heading > p");
    if (systemIntro) systemIntro.textContent = "This map shows the full-stack application architecture. The public interactive preview is frontend-only and does not connect to the API, PostgreSQL or background worker.";

    const demoTitle = document.querySelector("#lab-demo-title");
    if (demoTitle) demoTitle.textContent = "Try the interactive workspace.";
    const demoPlan = document.querySelector("#lab-demo-plan");
    if (demoPlan) demoPlan.textContent = "You enter a ready-to-use Owner workspace with fictional clients, deals, proposals, projects and invoices. Use “View workspace as” to explore Owner, Admin, Account Manager, Project Manager, Team Member, Finance and Client Portal views. No email or account setup is required.";

    const demoStatus = document.querySelector("#lab-demo-status");
    if (demoStatus) demoStatus.textContent = "PREVIEW: AVAILABLE · DATA: BROWSER-LOCAL · FULL-STACK BACKEND: VERIFICATION PENDING";
    const demoAction = document.querySelector("#lab-demo-action");
    if (demoAction) {
      demoAction.replaceChildren();
      demoAction.append(makeLink("agencyos-preview-link", "Open AgencyOS workspace ↗"));
      const note = document.createElement("p");
      note.className = "lab-demo-action-note agencyos-preview-lab-note";
      note.textContent = "Your edits persist in this browser only. Reset workspace restores the sample. External email, webhook, payment and background-job effects are simulated, not sent or executed.";
      demoAction.append(note);
    }

    const listedLink = document.querySelector("#lab-listed-url");
    if (listedLink) listedLink.hidden = true;
    const listedNote = document.querySelector("#lab-listed-url-note");
    if (listedNote) listedNote.textContent = "The old unverified frontend URL is no longer promoted. Use the interactive preview above; the full-stack API remains pending.";
  };

  const dialogContent = document.querySelector("#dialog-content");
  if (dialogContent) {
    const observer = new MutationObserver(() => requestAnimationFrame(enhanceCardDialog));
    observer.observe(dialogContent, { childList: true, subtree: true });
  }
  const dialog = document.querySelector("#project-dialog");
  if (dialog) {
    const observer = new MutationObserver(() => requestAnimationFrame(enhanceCardDialog));
    observer.observe(dialog, { attributes: true, attributeFilter: ["open"] });
  }
  const labArticle = document.querySelector("#project-lab");
  if (labArticle) {
    const observer = new MutationObserver(enhanceProjectLab);
    observer.observe(labArticle, { attributes: true, childList: true, subtree: true });
    enhanceProjectLab();
  }
})();
