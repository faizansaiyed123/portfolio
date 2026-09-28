const API_URL = "https://portfolio-saiyedfaizan842-9431.vercel.app/api/chat";
const question = "Explain FrameFlux architecture and tell me which APIs it uses.";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callProduction() {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: "https://faizansaiyed123.github.io"
    },
    body: JSON.stringify({
      message: question,
      history: []
    })
  });

  const payload = await response.json().catch(() => null);
  return { response, payload };
}

for (let attempt = 1; attempt <= 12; attempt += 1) {
  try {
    const { response, payload } = await callProduction();

    console.log("Production chat attempt", attempt, {
      status: response.status,
      ok: payload?.ok ?? false,
      chatStatus: payload?.status ?? null,
      code: payload?.code ?? null,
      model: payload?.model ?? null,
      repositories: (payload?.repositories || []).map((repo) => repo.fullName)
    });

    if (
      response.ok &&
      payload?.ok === true &&
      payload?.status === "answer" &&
      typeof payload?.answer === "string" &&
      payload.answer.trim().length > 0 &&
      Array.isArray(payload.repositories) &&
      payload.repositories.some((repo) => repo.name === "FrameFlux-Frontend") &&
      payload.repositories.some((repo) => repo.name === "FrameFlux-Backend")
    ) {
      console.log("Production end-to-end AI chat check passed.");
      process.exit(0);
    }

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
