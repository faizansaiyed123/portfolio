(() => {
  "use strict";

  const root = document.querySelector("[data-trace-root]");
  if (!root) return;

  const $ = (selector, scope = root) => scope.querySelector(selector);
  const $$ = (selector, scope = root) => [...scope.querySelectorAll(selector)];

  const traceSystems = {
    frameflux: {
      label: "FRAMEFLUX / ASYNC MEDIA PIPELINE",
      summary: "UPLOAD → JOB STATE → WORKER → MEDIA → VERIFY",
      steps: [
        {
          title: "Make upload progress explicit.",
          type: "UPLOAD STATE",
          description: "Upload progress is recorded in Redis with an upload identifier, user association, status, bounded percentage, optional byte totals, and an expiry.",
          decision: "Progress becomes queryable state. The read path checks the user association before returning the upload record.",
          source: "https://github.com/faizansaiyed123/FrameFlux-Backend/blob/main/app/features/media/upload_progress.py",
          sourceLabel: "app/features/media/upload_progress.py",
          test: "https://github.com/faizansaiyed123/FrameFlux-Backend/blob/main/tests/test_validation_and_uploads.py",
          testLabel: "tests/test_validation_and_uploads.py"
        },
        {
          title: "Persist the job lifecycle.",
          type: "DURABLE JOB STATE",
          description: "Processing jobs are created with a queued state and persisted through the database session. Updates carry status, progress, stage, error details, output names, and lifecycle timestamps.",
          decision: "The job record gives the interface a durable state model instead of relying only on a worker's transient response.",
          source: "https://github.com/faizansaiyed123/FrameFlux-Backend/blob/main/app/features/jobs/service.py",
          sourceLabel: "app/features/jobs/service.py",
          test: "https://github.com/faizansaiyed123/FrameFlux-Backend/blob/main/tests/test_status_and_jobs.py",
          testLabel: "tests/test_status_and_jobs.py"
        },
        {
          title: "Move expensive work to workers.",
          type: "BACKGROUND EXECUTION",
          description: "The ARQ worker registers the media task functions and receives its Redis connection through worker startup and shutdown hooks.",
          decision: "Long-running media operations leave the request path, so the API can report and control a durable job while workers do the heavy work.",
          source: "https://github.com/faizansaiyed123/FrameFlux-Backend/blob/main/app/infrastructure/worker.py",
          sourceLabel: "app/infrastructure/worker.py",
          test: "https://github.com/faizansaiyed123/FrameFlux-Backend/blob/main/tests/test_media_processing_and_editing.py",
          testLabel: "tests/test_media_processing_and_editing.py"
        },
        {
          title: "Keep processing stages inspectable.",
          type: "MEDIA TASKS",
          description: "The worker is wired to concrete task handlers for compression, conversion, editing, merging, transforms, overlays, splitting, clips, and workflow execution.",
          decision: "Task registration makes supported work explicit and keeps execution concerns in the worker layer.",
          source: "https://github.com/faizansaiyed123/FrameFlux-Backend/blob/main/app/infrastructure/tasks.py",
          sourceLabel: "app/infrastructure/tasks.py",
          test: "https://github.com/faizansaiyed123/FrameFlux-Backend/blob/main/tests/test_media_processing_and_editing.py",
          testLabel: "tests/test_media_processing_and_editing.py"
        },
        {
          title: "Verify the lifecycle from the API.",
          type: "REGRESSION COVERAGE",
          description: "Job-status tests exercise queued, processing, completed, and failed responses, including returned progress and output details.",
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
      summary: "INGEST → DETECT → PERSIST → STREAM → VERIFY",
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
          decision: "A signal is not labelled anomalous before enough history exists, and zero-variance windows are handled without division by zero.",
          source: "https://github.com/faizansaiyed123/telemetry-backend/blob/main/app/services/anomaly_detector.py",
          sourceLabel: "app/services/anomaly_detector.py",
          test: "https://github.com/faizansaiyed123/telemetry-backend/blob/main/tests/unit/test_anomaly_detector.py",
          testLabel: "tests/unit/test_anomaly_detector.py"
        },
        {
          title: "Persist alert changes off the hot path.",
          type: "ALERT LIFECYCLE",
          description: "Alert persistence uses a bounded asyncio queue and a background worker. Failed persistence retains the event for retry; queue overflow is counted and logged.",
          decision: "The queue has explicit capacity and failure behavior instead of silently allowing unbounded in-memory growth.",
          source: "https://github.com/faizansaiyed123/telemetry-backend/blob/main/app/services/alert_persistence.py",
          sourceLabel: "app/services/alert_persistence.py",
          test: "https://github.com/faizansaiyed123/telemetry-backend/blob/main/tests/unit/test_alert_persistence.py",
          testLabel: "tests/unit/test_alert_persistence.py"
        },
        {
          title: "Fan out updates to connected clients.",
          type: "REALTIME DELIVERY",
          description: "The WebSocket manager tracks connected clients and broadcasts telemetry updates to the active connection set.",
          decision: "Realtime delivery is isolated behind a manager so connection lifecycle and fan-out behavior stay explicit.",
          source: "https://github.com/faizansaiyed123/telemetry-backend/blob/main/app/services/websocket_manager.py",
          sourceLabel: "app/services/websocket_manager.py",
          test: "https://github.com/faizansaiyed123/telemetry-backend/blob/main/tests/integration/test_websocket.py",
          testLabel: "tests/integration/test_websocket.py"
        },
        {
          title: "Verify the authenticated stream.",
          type: "INTEGRATION TESTING",
          description: "WebSocket integration tests obtain a short-lived token, validate telemetry message shape and sequence progression, and exercise multiple clients and disconnect behavior.",
          decision: "The stream is tested through an authenticated client boundary, not just by calling the manager in isolation.",
          source: "https://github.com/faizansaiyed123/telemetry-backend/blob/main/app/api/websocket.py",
          sourceLabel: "app/api/websocket.py",
          test: "https://github.com/faizansaiyed123/telemetry-backend/blob/main/tests/integration/test_websocket.py",
          testLabel: "tests/integration/test_websocket.py"
        }
      ]
    }
  };

  const systemButtons = $$(".trace-system-button");
  const stepsRoot = $("#trace-steps");
  const systemLabel = $("#trace-system-label");
  const stepCount = $("#trace-step-count");
  const pathSummary = $("#trace-path-summary");
  const detailIndex = $("#trace-detail-index");
  const stageType = $("#trace-stage-type");
  const stageTitle = $("#trace-stage-title");
  const stageDescription = $("#trace-stage-description");
  const stageDecision = $("#trace-stage-decision");
  const sourceLink = $("#trace-source-link");
  const sourceLabel = $("#trace-source-label");
  const testLink = $("#trace-test-link");
  const testLabel = $("#trace-test-label");

  let activeSystem = "frameflux";
  let activeStep = 0;

  const render = () => {
    const system = traceSystems[activeSystem];
    if (!system) return;

    const step = system.steps[activeStep];
    systemLabel.textContent = system.label;
    stepCount.textContent = String(activeStep + 1).padStart(2, "0") + " / " + String(system.steps.length).padStart(2, "0");
    pathSummary.textContent = system.summary;
    detailIndex.textContent = String(activeStep + 1).padStart(2, "0") + " / " + activeSystem.toUpperCase();
    stageType.textContent = step.type;
    stageTitle.textContent = step.title;
    stageDescription.textContent = step.description;
    stageDecision.textContent = step.decision;

    sourceLink.href = step.source;
    sourceLabel.textContent = step.sourceLabel;
    sourceLink.setAttribute("aria-label", "Inspect source file " + step.sourceLabel);

    testLink.href = step.test;
    testLabel.textContent = step.testLabel;
    testLink.setAttribute("aria-label", "View related tests " + step.testLabel);

    stepsRoot.replaceChildren(...system.steps.map((item, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "trace-step" + (index === activeStep ? " is-active" : "");
      button.setAttribute("aria-pressed", String(index === activeStep));
      button.setAttribute("role", "listitem");
      button.innerHTML =
        '<span class="trace-step-index">' + String(index + 1).padStart(2, "0") + '</span>' +
        '<span class="trace-step-line" aria-hidden="true"></span>' +
        '<span class="trace-step-copy"><small>' + item.type + '</small><b>' + item.title + '</b></span>' +
        '<span class="trace-step-arrow" aria-hidden="true">↗</span>';
      button.addEventListener("click", () => {
        activeStep = index;
        render();
      });
      return button;
    }));

    systemButtons.forEach((button) => {
      const active = button.dataset.traceSystem === activeSystem;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });
  };

  systemButtons.forEach((button) => {
    button.addEventListener("click", () => {
      activeSystem = button.dataset.traceSystem || "frameflux";
      activeStep = 0;
      render();
    });
  });

  render();
})();
