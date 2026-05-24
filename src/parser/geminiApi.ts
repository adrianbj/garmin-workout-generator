// Calls the Google Generative AI REST API.
// Returns the model's raw JSON text (already a JSON string per responseMimeType).
// Throws on network/HTTP failure; returns "" on missing candidate.

const MODEL = "gemini-2.5-flash";
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

export type GeminiApiError =
  | { code: "BAD_API_KEY"; message: string }
  | { code: "RATE_LIMITED"; message: string }
  | { code: "UNREACHABLE"; message: string }
  | { code: "PROMPT_FAILED"; message: string };

export type GeminiApiResult =
  | { ok: true; text: string }
  | { ok: false; error: GeminiApiError };

type Transport = (url: string, init: RequestInit) => Promise<Response>;
let transport: Transport = (url, init) => fetch(url, init);

export function _setGeminiTransportForTesting(t: Transport): void {
  transport = t;
}

export async function generateWithGeminiApi(
  systemPrompt: string,
  userText: string,
  apiKey: string,
): Promise<GeminiApiResult> {
  const body = {
    systemInstruction: { parts: [{ text: systemPrompt }] },
    contents: [{ role: "user", parts: [{ text: userText }] }],
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0,
    },
  };

  let res: Response;
  try {
    res = await transport(`${ENDPOINT}?key=${encodeURIComponent(apiKey)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (e) {
    return { ok: false, error: { code: "UNREACHABLE", message: String(e) } };
  }

  if (res.status === 401 || res.status === 403) {
    return { ok: false, error: { code: "BAD_API_KEY", message: "Gemini API rejected the key." } };
  }
  if (res.status === 429) {
    return { ok: false, error: { code: "RATE_LIMITED", message: "Hit Gemini's rate limit. Wait a minute and retry." } };
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return { ok: false, error: { code: "PROMPT_FAILED", message: `Gemini ${res.status}: ${text.slice(0, 200)}` } };
  }

  type GeminiResponse = {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };

  let parsed: GeminiResponse;
  try {
    parsed = (await res.json()) as GeminiResponse;
  } catch (e) {
    return { ok: false, error: { code: "PROMPT_FAILED", message: `Gemini response wasn't JSON: ${String(e)}` } };
  }

  const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
  if (typeof text !== "string" || text.trim() === "") {
    return { ok: false, error: { code: "PROMPT_FAILED", message: "Gemini returned no text." } };
  }
  return { ok: true, text };
}
