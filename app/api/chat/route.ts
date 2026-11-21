import { NextResponse } from "next/server";
import { AiError, chatComplete } from "@/lib/ai";
import { buildMarketContext, getMarketSnapshot, parseSymbols } from "@/lib/broker";

const BASE_SYSTEM = `You are the AI mentor for Brilliant Trading Academy (BTA), a forex trading academy.
You help students learn forex trading, answer questions about our services, and explain our products.

What we offer:
- Forex education: beginner to advanced courses covering pairs, pips, lots, leverage, risk management, price action, technical analysis, strategy building and trading psychology.
- Signal services: daily trade setups with entry, stop loss and take profit, delivered by subscription.
- Products: the Mr Euaggelion Pro v1 premium indicator for MT4/MT5 with clear buy and sell signals, available as monthly, yearly or lifetime plans.

Guidelines:
- Be clear, encouraging and practical. Use short paragraphs and concrete examples.
- Always teach risk management first: position sizing, stop losses and never risking more than a small percentage of the account per trade.
- When asked about signals or products, explain what is included and invite the person to join via the website.
- Never guarantee profits or returns. Do not give personalized financial advice; encourage demo-account practice.
- If asked something unrelated to trading, briefly answer and steer back to trading topics.`;

type ChatMessage = { role: "user" | "assistant"; content: string };

export async function POST(request: Request) {
  let messages: ChatMessage[];
  try {
    const body = await request.json();
    messages = body?.messages;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (
    !Array.isArray(messages) ||
    messages.length === 0 ||
    messages.length > 24 ||
    messages.some(
      (m) =>
        !m ||
        (m.role !== "user" && m.role !== "assistant") ||
        typeof m.content !== "string" ||
        m.content.trim() === ""
    )
  ) {
    return NextResponse.json({ error: "Request must include 1-24 user/assistant messages." }, { status: 400 });
  }

  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  const symbols = parseSymbols(lastUser?.content ?? "");
  const snapshot = await getMarketSnapshot(symbols);
  const system = `${BASE_SYSTEM}\n\n${buildMarketContext(snapshot)}`;

  try {
    const reply = await chatComplete(system, messages);
    return NextResponse.json({ reply });
  } catch (error) {
    const message = String((error as Error).message || error);
    console.error("AI provider error:", message);
    if (message === "NO_AI_KEY") {
      return NextResponse.json(
        {
          error:
            "The AI mentor is not configured yet. The site owner needs to add a free GEMINI_API_KEY (or GROQ_API_KEY) in the server environment variables, then redeploy.",
        },
        { status: 503 }
      );
    }
    if (error instanceof AiError && /rejected/.test(message)) {
      return NextResponse.json(
        {
          error: `AI key problem — ${message} Double-check the key in Vercel → Settings → Environment Variables (Production AND Preview), then redeploy.`,
        },
        { status: 502 }
      );
    }
    if (error instanceof AiError && /NOT_FOUND|404/i.test(message)) {
      return NextResponse.json(
        {
          error: `AI model is not available on this key — ${message}`,
        },
        { status: 502 }
      );
    }
    return NextResponse.json(
      { error: "The assistant is unavailable right now. Please try again." },
      { status: 502 }
    );
  }
}
