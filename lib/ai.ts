type ChatMessage = { role: "user" | "assistant"; content: string };

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta";
const GEMINI_MODELS = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-flash-latest"];
const GROQ_BASE = "https://api.groq.com/openai/v1";
const GROQ_MODELS = ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"];

async function readError(res: Response): Promise<string> {
  try {
    const data = (await res.json()) as { error?: { message?: string; status?: string } };
    if (data.error?.message) return `${res.status}: ${data.error.message}`;
  } catch {}
  return `HTTP ${res.status}`;
}

export class AiError extends Error {}

async function callGeminiModel(
  apiKey: string,
  model: string,
  system: string,
  messages: ChatMessage[]
): Promise<string> {
  const res = await fetch(`${GEMINI_BASE}/models/${model}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: system }] },
      contents: messages.map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      })),
      generationConfig: { temperature: 0.6, maxOutputTokens: 1200 },
    }),
    signal: AbortSignal.timeout(45000),
  });
  if (!res.ok) {
    const detail = await readError(res);
    if (/API key not valid|PERMISSION_DENIED/i.test(detail)) {
      throw new AiError(`Your GEMINI_API_KEY was rejected — ${detail}`);
    }
    throw new AiError(detail);
  }
  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const parts = data.candidates?.[0]?.content?.parts ?? [];
  const text = parts.map((p) => p.text ?? "").join("").trim();
  if (!text) throw new AiError("Gemini returned an empty response");
  return text;
}

async function discoverGeminiModel(apiKey: string): Promise<string | null> {
  try {
    const res = await fetch(`${GEMINI_BASE}/models?pageSize=200`, {
      headers: { "x-goog-api-key": apiKey },
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      models?: { name?: string; supportedGenerationMethods?: string[] }[];
    };
    const usable = (data.models ?? [])
      .filter(
        (m) =>
          (m.supportedGenerationMethods ?? []).includes("generateContent") &&
          !/embedding|aqa|image|tts|audio/i.test(String(m.name))
      )
      .map((m) => String(m.name).replace(/^models\//, ""));
    return (
      usable.find((n) => n.includes("flash") && !/lite|thinking/i.test(n)) ??
      usable.find((n) => !/pro/i.test(n)) ??
      usable[0] ??
      null
    );
  } catch {
    return null;
  }
}

async function callGemini(apiKey: string, system: string, messages: ChatMessage[]): Promise<string> {
  let lastError = "";
  for (const model of GEMINI_MODELS) {
    try {
      return await callGeminiModel(apiKey, model, system, messages);
    } catch (error) {
      const message = String((error as Error).message || error);
      if (error instanceof AiError && /rejected|empty response/.test(message)) throw error;
      lastError = message;
    }
  }
  const fallbackModel = await discoverGeminiModel(apiKey);
  if (fallbackModel && !GEMINI_MODELS.includes(fallbackModel)) {
    return callGeminiModel(apiKey, fallbackModel, system, messages);
  }
  throw new AiError(lastError || "Gemini request failed");
}

async function callGroq(apiKey: string, system: string, messages: ChatMessage[]): Promise<string> {
  let lastError = "";
  for (const model of GROQ_MODELS) {
    const res = await fetch(`${GROQ_BASE}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages: [{ role: "system", content: system }, ...messages],
        temperature: 0.6,
        max_tokens: 1200,
      }),
      signal: AbortSignal.timeout(45000),
    });
    if (!res.ok) {
      const detail = await readError(res);
      if (res.status === 401) {
        throw new AiError(`Your GROQ_API_KEY was rejected — ${detail}`);
      }
      lastError = detail;
      continue;
    }
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const text = (data.choices?.[0]?.message?.content ?? "").trim();
    if (text) return text;
    lastError = "Groq returned an empty response";
  }
  throw new AiError(lastError || "Groq request failed");
}

export async function chatComplete(system: string, messages: ChatMessage[]): Promise<string> {
  const geminiKey = process.env.GEMINI_API_KEY?.trim();
  const groqKey = process.env.GROQ_API_KEY?.trim();
  if (geminiKey) return callGemini(geminiKey, system, messages);
  if (groqKey) return callGroq(groqKey, system, messages);
  throw new AiError("NO_AI_KEY");
}
