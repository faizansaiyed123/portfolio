process.env.VERCEL_ENV = "development";
delete process.env.GEMINI_API_KEY;

const { default: handler } = await import("../api/chat.ts");

async function request(message: string) {
  const request = new Request("http://localhost/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: "https://faizansaiyed123.github.io"
    },
    body: JSON.stringify({ message, history: [] })
  });

  const response = await handler(request);
  const payload = await response.json();
  return { response, payload };
}

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message);
}

const open = await request("Open the GitHub repository for FrameFlux.");
console.log("Open repository payload:", JSON.stringify(open.payload));
assert(open.response.status === 200, "Open repository route should return HTTP 200.");
assert(open.payload?.ok === true, "Open repository response should be successful.");
assert(open.payload?.status === "links", "Open repository response should return links.");
assert(
  Array.isArray(open.payload?.repositories) &&
    open.payload.repositories.some((repo: any) => repo.name === "FrameFlux-Backend"),
  "Open repository response should include the live FrameFlux backend repository."
);

const ambiguous = await request("Explain the backend project.");
assert(ambiguous.response.status === 200, "Ambiguous project route should return HTTP 200.");
assert(ambiguous.payload?.ok === true, "Ambiguous project response should be successful.");
assert(
  ambiguous.payload?.status === "ambiguous",
  "Generic backend question should be treated as ambiguous rather than guessed."
);

const privateRepo = await request("Explain Nexora-backend.");
assert(privateRepo.response.status === 200, "Private repository route should return HTTP 200.");
assert(privateRepo.payload?.ok === true, "Private repository response should be successful.");
assert(
  privateRepo.payload?.status === "inaccessible",
  "Private repository route should protect the repository rather than exposing source."
);

console.log("API contract checks passed:", {
  openRepository: true,
  ambiguousProject: true,
  inaccessibleRepository: true
});
