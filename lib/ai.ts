import { GoogleGenAI } from "@google/genai";

type ChatMessage = { role: "user" | "assistant"; content: string };

const GEMINI_MODELS = ["gemini-2.0-flash", "gemini-2.5-flash", "gemini-flash-latest"];
const GROQ_BASE = "https://api.groq.com/openai/v1";
const GROQ_MODELS = ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"];

export class AiError extends Error {}

function describeError(error: unknown): string {
  if (error instanceof AiError) return error.message;
  const anyErr = error as { message?: string; code?: number; status?: string };
  const parts = [anyErr?.status, anyErr?.code != null ? `HTTP ${anyErr.code}` : null, anyErr?.message].filter(Boolean);
  return parts.join(" — ") || String(error);
}

async function callGeminiModel(
  client: GoogleGenAI,
  model: string,
  system: string,
  messages: ChatMessage[]
): Promise<string> {
  const response = await client.models.generateContent({
    model,
    contents: messages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    })),
    config: {
      systemInstruction: system,
      temperature: 0.6,
      maxOutputTokens: 1200,
    },
  });
  const text = (response.text ?? "").trim();
  if (!text) throw new AiError("Gemini returned an empty response");
  return text;
}

async function discoverGeminiModel(client: GoogleGenAI): Promise<string | null> {
  try {
    let candidate: string | null = null;
    const pager = await client.models.list({ config: { pageSize: 200 } });
    for await (const model of pager) {
      const name = String(model.name ?? "").replace(/^models\//, "");
      const actions = (model as { supportedActions?: string[] }).supportedActions ?? [];
      if (!actions.includes("generateContent")) continue;
      if (/embedding|aqa|image|tts|audio|vision|video/i.test(name)) continue;
      if (name.includes("flash") && !/lite|thinking/i.test(name)) return name;
      if (!candidate && !/pro/i.test(name)) candidate = name;
    }
    return candidate;
  } catch {
    return null;
  }
}

async function callGemini(apiKey: string, system: string, messages: ChatMessage[]): Promise<string> {
  const client = new GoogleGenAI({ apiKey });
  let lastError = "";
  for (const model of GEMINI_MODELS) {
    try {
      return await callGeminiModel(client, model, system, messages);
    } catch (error) {
      const message = describeError(error);
      console.error(`Gemini ${model} failed:`, message);
      if (error instanceof AiError && error.message === "Gemini returned an empty response") throw error;
      if (/API key not valid|PERMISSION_DENIED|API_KEY_INVALID|UNAUTHENTICATED/i.test(message)) {
        throw new AiError(`Your GEMINI_API_KEY was rejected — ${message}`);
      }
      lastError = message;
    }
  }
  const fallbackModel = await discoverGeminiModel(client);
  if (fallbackModel && !GEMINI_MODELS.includes(fallbackModel)) {
    console.error("Falling back to discovered Gemini model:", fallbackModel);
    try {
      return await callGeminiModel(client, fallbackModel, system, messages);
    } catch (error) {
      console.error("Gemini fallback model also failed:", describeError(error));
      throw new AiError(describeError(error));
    }
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
      let detail = `HTTP ${res.status}`;
      try {
        const data = (await res.json()) as { error?: { message?: string } };
        if (data.error?.message) detail = `${res.status}: ${data.error.message}`;
      } catch {}
      console.error(`Groq ${model} failed:`, detail);
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
