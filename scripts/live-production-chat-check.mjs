const API_URL = "https://portfolio-zeta-sandy-t9r8wi4kkz.vercel.app/api/chat";
const question = "Explain FrameFlux architecture and tell me which APIs it uses.";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callProduction(message) {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: "https://faizansaiyed123.github.io"
    },
    body: JSON.stringify({
      message,
      history: []
    })
  });

  const raw = await response.text();
  let payload = null;
  try {
    payload = raw ? JSON.parse(raw) : null;
  } catch {
    console.log("Production chat raw response:", raw);
  }
  return { response, payload };
}

async function runCheck(name, message, predicate) {
  const { response, payload } = await callProduction(message);
  console.log(name, {
    status: response.status,
    ok: payload?.ok ?? false,
    chatStatus: payload?.status ?? null,
    code: payload?.code ?? null,
    answer: typeof payload?.answer === "string" ? payload.answer.slice(0, 500) : null,
    repositories: (payload?.repositories || []).map((repo) => repo.fullName)
  });
  if (!predicate(response, payload)) {
    throw new Error(
      `${name} failed: HTTP ${response.status} ${payload?.code || ""} ${payload?.error || ""}`
    );
  }
}

for (let attempt = 1; attempt <= 12; attempt += 1) {
  try {
    await runCheck(
      "Casual conversation check",
      "Hi",
      (response, payload) =>
        response.ok &&
        payload?.ok === true &&
        payload?.status === "answer" &&
        payload?.kind === "conversation" &&
        typeof payload?.answer === "string" &&
        payload.answer.trim().length > 0
    );

    await runCheck(
      "Grounded FrameFlux interview check",
      question,
      (response, payload) =>
        response.ok &&
        payload?.ok === true &&
        payload?.status === "answer" &&
        typeof payload?.answer === "string" &&
        payload.answer.trim().length > 0 &&
        Array.isArray(payload.repositories) &&
        payload.repositories.some((repo) => repo.name === "FrameFlux-Frontend") &&
        payload.repositories.some((repo) => repo.name === "FrameFlux-Backend")
    );

    console.log("Production end-to-end AI interview checks passed.");
    process.exit(0);

    if (payload?.status === "answer") {
      throw new Error(
        "Production returned an AI answer, but FrameFlux frontend/backend evidence was incomplete."
      );
    }

    if (payload?.code === "AI_PROVIDER_ERROR" || payload?.code === "CHAT_UNAVAILABLE") {
      throw new Error(
        `Production AI integration is unavailable: ${payload.code} ${payload.error || ""}`
      );
    }

    if (payload?.status === "inaccessible") {
      throw new Error("Production incorrectly treated the public FrameFlux project as inaccessible.");
    }
  } catch (error) {
    if (attempt === 12) throw error;
    console.log(`Production check not ready yet; retrying (${attempt}/12).`);
  }

  await sleep(10_000);
}

throw new Error("Production chat check did not become ready.");
