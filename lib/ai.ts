
import { GoogleGenAI } from "@google/genai";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

const GEMINI_MODEL = "gemini-3.8-flash";

const GROQ_BASE = "https://api.groq.com/openai/v1";
const GROQ_MODELS = [
  "llama-3.3-70b-versatile",
  "llama-3.1-8b-instant",
];

export class AiError extends Error {}

function describeError(error: unknown): string {
  if (error instanceof AiError) return error.message;

  const anyErr = error as {
    message?: string;
    code?: number;
    status?: string;
  };

  const parts = [
    anyErr?.status,
    anyErr?.code != null ? `HTTP ${anyErr.code}` : null,
    anyErr?.message,
  ].filter(Boolean);

  return parts.join(" — ") || String(error);
}

async function callGemini(
  apiKey: string,
  system: string,
  messages: ChatMessage[]
): Promise<string> {
  const client = new GoogleGenAI({
    apiKey,
    httpOptions: { apiVersion: "v1beta" },
  });

  const response = await client.models.generateContent({
    model: GEMINI_MODEL,
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

  const result = (response.text ?? "").trim();

  if (!result) {
    throw new AiError("Gemini returned an empty response");
  }

  return result;
}

async function callGroq(
  apiKey: string,
  system: string,
  messages: ChatMessage[]
): Promise<string> {
  let lastError = "";

  for (const model of GROQ_MODELS) {
    try {
      const res = await fetch(`${GROQ_BASE}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: system },
            ...messages,
          ],
          temperature: 0.6,
          max_tokens: 1200,
        }),
        signal: AbortSignal.timeout(45000),
      });

      if (!res.ok) {
        let detail = `HTTP ${res.status}`;

        try {
          const data = (await res.json()) as {
            error?: { message?: string };
          };

          if (data.error?.message) {
            detail = `${res.status}: ${data.error.message}`;
          }
        } catch {}

        console.error(`Groq ${model} failed:`, detail);

        if (res.status === 401) {
          throw new AiError(
            `Your GROQ_API_KEY was rejected — ${detail}`
          );
        }

        lastError = detail;
        continue;
      }

      const data = (await res.json()) as {
        choices?: {
          message?: { content?: string };
        }[];
      };

      const result = (
        data.choices?.[0]?.message?.content ?? ""
      ).trim();

      if (result) return result;

      lastError = "Groq returned an empty response";
    } catch (error) {
      if (error instanceof AiError) throw error;

      lastError = describeError(error);
      console.error(`Groq ${model} request failed:`, lastError);
    }
  }

  throw new AiError(lastError || "Groq request failed");
}

export async function chatComplete(
  system: string,
  messages: ChatMessage[]
): Promise<string> {
  const geminiKey = process.env.GEMINI_API_KEY?.trim();
  const groqKey = process.env.GROQ_API_KEY?.trim();

  if (!geminiKey && !groqKey) {
    throw new AiError("NO_AI_KEY");
  }

  // Try Gemini first.
  if (geminiKey) {
    try {
      console.log("AI Mentor: Trying Gemini...");
      const result = await callGemini(
        geminiKey,
        system,
        messages
      );

      console.log("AI Mentor: Gemini responded successfully.");
      return result;
    } catch (error) {
      const message = describeError(error);

      console.error("Gemini failed:", message);

      // If Groq is not configured, report the Gemini error.
      if (!groqKey) {
        throw new AiError(`Gemini failed: ${message}`);
      }

      console.log("AI Mentor: Switching to Groq fallback...");
    }
  }

  // Use Groq if Gemini is unavailable or fails.
  if (groqKey) {
    try {
      const result = await callGroq(
        groqKey,
        system,
        messages
      );

      console.log("AI Mentor: Groq responded successfully.");
      return result;
    } catch (error) {
      throw new AiError(
        `Both AI services are unavailable. Groq error: ${describeError(error)}`
      );
    }
  }

  throw new AiError("NO_AI_KEY");
}
