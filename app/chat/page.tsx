"use client";

import { useEffect, useRef, useState } from "react";

type ChatMessage = { role: "user" | "assistant"; content: string };

const WELCOME: ChatMessage = {
  role: "assistant",
  content:
    "Welcome to Brilliant Trading Academy! I can explain forex basics, our courses, signal membership, and our EAs and indicators. What would you like to know?",
};

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    const nextMessages: ChatMessage[] = [
      ...messages,
      { role: "user", content: text },
    ];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages.slice(1) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong.");
      setMessages([...nextMessages, { role: "assistant", content: data.reply }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="chat-page">
      <h1>Ask a Mentor</h1>
      <p>
        Chat with the Brilliant Trading Academy assistant about forex trading,
        our courses, signals and products.
      </p>

      <div className="chat-window">
        {messages.map((m, i) => (
          <div key={i} className={`msg msg-bubble ${m.role}`}>
            {m.content}
          </div>
        ))}
        {loading && <div className="status">Thinking…</div>}
        <div ref={endRef} />
      </div>

      <form className="chat-form" onSubmit={send}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about pips, our signals, EAs…"
          disabled={loading}
          aria-label="Message"
        />
        <button type="submit" disabled={loading || !input.trim()}>
          Send
        </button>
      </form>
      <div className="status">{error}</div>
    </div>
  );
}
