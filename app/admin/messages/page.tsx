import { q } from "@/lib/db";
import AdminNav from "../AdminNav";
import { handleContactAction } from "../actions";
import { fmtDate } from "@/lib/files";

export const metadata = { title: "Admin — Messages" };

export default async function AdminMessages({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string }>;
}) {
  const sp = await searchParams;
  const messages = await q(`SELECT * FROM contact_messages ORDER BY id DESC LIMIT 100`);
  return (
    <div className="container">
      <h1 className="page-title">
        Contact <span>Messages</span>
      </h1>
      <AdminNav />
      {sp.ok && <div className="msg-banner msg-ok">Marked as handled.</div>}
      <div className="panel">
        <h2>Inbox ({messages.length})</h2>
        {messages.length === 0 && <p style={{ color: "var(--muted)" }}>No messages yet.</p>}
        {messages.map((m) => (
          <div className="card" key={String(m.id)} style={{ marginBottom: "0.8rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem", flexWrap: "wrap" }}>
              <b>{String(m.name)} &lt;{String(m.email)}&gt;</b>
              <span className={`chip ${m.handled ? "green" : "amber"}`}>{m.handled ? "handled" : "new"}</span>
            </div>
            <p style={{ color: "var(--muted)", fontSize: "0.9rem", margin: "0.5rem 0", whiteSpace: "pre-wrap" }}>
              {String(m.body)}
            </p>
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
              <span style={{ fontSize: "0.75rem", color: "var(--muted)" }}>{fmtDate(m.created_at)}</span>
              {!m.handled && (
                <form action={handleContactAction}>
                  <input type="hidden" name="id" value={String(m.id)} />
                  <button className="btn green sm" type="submit">
                    Mark handled
                  </button>
                </form>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
