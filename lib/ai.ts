type ChatMessage = { role: "user" | "assistant"; content: string };

const GEMINI_MODELS = ["gemini-2.5-flash", "gemini-2.0-flash"];
const GROQ_MODELS = ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"];

async function callGemini(apiKey: string, system: string, messages: ChatMessage[]): Promise<string> {
  let lastError = "";
  for (const model of GEMINI_MODELS) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
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
      }
    );
    if (!res.ok) {
      lastError = `Gemini HTTP ${res.status}`;
      continue;
    }
    const data = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const parts = data.candidates?.[0]?.content?.parts ?? [];
    const text = parts.map((p) => p.text ?? "").join("").trim();
    if (text) return text;
    lastError = "Gemini returned an empty response";
  }
  throw new Error(lastError || "Gemini request failed");
}

async function callGroq(apiKey: string, system: string, messages: ChatMessage[]): Promise<string> {
  let lastError = "";
  for (const model of GROQ_MODELS) {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
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
      lastError = `Groq HTTP ${res.status}`;
      continue;
    }
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const text = (data.choices?.[0]?.message?.content ?? "").trim();
    if (text) return text;
    lastError = "Groq returned an empty response";
  }
  throw new Error(lastError || "Groq request failed");
}

export async function chatComplete(system: string, messages: ChatMessage[]): Promise<string> {
  const geminiKey = process.env.GEMINI_API_KEY;
  const groqKey = process.env.GROQ_API_KEY;
  if (geminiKey) return callGemini(geminiKey, system, messages);
  if (groqKey) return callGroq(groqKey, system, messages);
  throw new Error("NO_AI_KEY");
}
