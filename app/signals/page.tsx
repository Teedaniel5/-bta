import Link from "next/link";
import Image from "next/image";
import { q } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { isAdmin, canManageSignals } from "@/lib/auth";
import { activeSubscription } from "@/lib/access";
import { timeAgo } from "@/lib/files";

export const metadata = { title: "Trading Signals" };

export default async function Signals() {
  const user = await getSessionUser();
  const [pro, vip, all, closed] = await Promise.all([
    user ? activeSubscription(user.id as number, "signals_pro") : Promise.resolve(null),
    user ? activeSubscription(user.id as number, "vip_elite") : Promise.resolve(null),
    q(`SELECT * FROM signals ORDER BY created_at DESC`),
    q(`SELECT * FROM signals WHERE status != 'cancelled' ORDER BY created_at DESC`),
  ]);
  const staffUser = user ? isAdmin(user) || canManageSignals(user) : false;
  const level = vip ? "vip" : pro ? "pro" : staffUser ? "staff" : "free";

  const measured = closed.filter((s) => s.result === "win" || s.result === "loss" || s.result === "breakeven");
  const wins = measured.filter((s) => s.result === "win").length;
  const losses = measured.filter((s) => s.result === "loss").length;
  const cancelled = all.filter((s) => s.status === "cancelled").length;
  const be = measured.filter((s) => s.result === "breakeven").length;
  const winRate = measured.length > 0 ? Math.round(((wins + be * 0.5) / measured.length) * 100) : null;
  const rrs = measured
    .map((s) => {
      const raw = String(s.rr || "").trim();
      if (!raw) return 0;
      const parts = raw.split(":");
      return parseFloat(parts[1] ?? parts[0] ?? "0");
    })
    .filter((v) => !Number.isNaN(v) && v > 0);
  const avgRR = rrs.length > 0 ? (rrs.reduce((a, b) => a + b, 0) / rrs.length).toFixed(2) : null;

  const groups: [string, typeof all, string][] = [
    ["VIP Elite signals", all.filter((s) => s.tier === "vip"), "vip"],
    ["Premium signals (Signals Pro)", all.filter((s) => s.tier === "pro"), "pro"],
    ["Free sample signals", all.filter((s) => s.tier === "free"), "free"],
  ];

  function SignalBody({ s, masked }: { s: typeof all[0]; masked: boolean }) {
    if (masked) {
      return (
        <div style={{ position: "relative" }}>
          <div className="locked">
            <div className="meta">
              <span>Entry: <b>•••••</b></span>
              <span>SL: <b>•••••</b></span>
              <span>TP: <b>•••••</b></span>
            </div>
            <p style={{ color: "var(--muted)" }}>{String(s.rationale || "Full analysis available to subscribers.")}</p>
          </div>
          <div className="lock-overlay">
            <div>
              <Link className="btn-gold-lg btn-lg" href="/membership">
                Subscribe from $15/month
              </Link>
              <p className="hero-alt">Get full entries, stop loss and take profit.</p>
            </div>
          </div>
        </div>
      );
    }
    return (
      <>
        <div className="meta">
          <span>Entry: <b>{String(s.entry)}</b></span>
          <span>SL: <b>{String(s.stop_loss || "—")}</b></span>
          <span>TP: <b>{String(s.take_profits || "—")}</b></span>
          <span>R:R: <b>{String(s.rr || "—")}</b></span>
          <span>TF: <b>{String(s.timeframe || "—")}</b></span>
          <span>Status: <b>{String(s.status)}</b></span>
          {!!s.result && <span>Result: <b>{String(s.result)}</b></span>}
        </div>
        {!!s.image_path && (
          <Image src={`/api/file/${String(s.image_path)}`} alt="Signal chart" width={640} height={320} style={{ borderRadius: 8, margin: "0.5rem 0", border: "1px solid var(--line)" }} />
        )}
        {s.rationale && <p style={{ color: "var(--muted)", fontSize: "0.9rem" }}>{String(s.rationale)}</p>}
      </>
    );
  }

  return (
    <div className="container">
      <h1 className="page-title">
        BTA <span>Signals Centre</span>
      </h1>
      <p className="page-sub">
        {level === "free"
          ? "You are viewing the free feed. Subscribe to Signals Pro ($15/month) or VIP Elite to unlock every premium and VIP signal."
          : `Signed in — ${level === "vip" ? "VIP Elite" : level === "pro" ? "Signals Pro" : "staff"} access active.`}
      </p>

      <div className="panel">
        <h2>Performance dashboard</h2>
        <p style={{ color: "var(--muted)", fontSize: "0.85rem", marginBottom: "1rem" }}>
          Calculated only from recorded signal outcomes in the archive. Nothing on this page is
          estimated or promised. Trading involves risk.
        </p>
        <div className="stat-grid">
          <div className="stat"><div className="value">{closed.length}</div><div className="label">Total signals</div></div>
          <div className="stat"><div className="value">{wins}</div><div className="label">Wins</div></div>
          <div className="stat"><div className="value">{losses}</div><div className="label">Losses</div></div>
          <div className="stat"><div className="value">{be}</div><div className="label">Break-even</div></div>
          <div className="stat"><div className="value">{cancelled}</div><div className="label">Cancelled</div></div>
          <div className="stat"><div className="value">{winRate === null ? "—" : `${winRate}%`}</div><div className="label">Win rate</div></div>
          <div className="stat"><div className="value">{avgRR ?? "—"}</div><div className="label">Average R:R</div></div>
        </div>
      </div>

      {groups.map(([title, list, tierKey]) => {
        const lockedForUser = !user && tierKey !== "free";
        return (
          <div className="panel" key={tierKey}>
            <h2>
              {title}{" "}
              <span className={`chip ${tierKey === "vip" ? "gold" : tierKey === "pro" ? "purple" : "green"}`}>
                {tierKey === "free" ? "free" : tierKey === "pro" ? "pro" : "vip"}
              </span>
            </h2>
            {list.length === 0 && <p style={{ color: "var(--muted)" }}>No signals in this feed yet.</p>}
            <div className="grid grid-2">
              {list.map((s) => {
                const masked = (tierKey !== "free" && level === "free") || lockedForUser;
                return (
                  <div className={`card signal-card ${s.direction === "sell" ? "sell" : ""}`} key={String(s.id)}
                    style={masked ? { position: "relative" } : undefined}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem" }}>
                      <b>{String(s.instrument)}</b>
                      <span className={`chip ${s.direction === "sell" ? "red" : "green"}`}>
                        {String(s.direction).toUpperCase()}
                      </span>
                    </div>
                    <SignalBody s={s} masked={masked} />
                    <p style={{ color: "var(--muted)", fontSize: "0.75rem", marginTop: "0.6rem" }}>
                      {timeAgo(s.created_at)}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      <div className="panel">
        <h2>Risk disclaimer</h2>
        <p style={{ color: "var(--muted)", fontSize: "0.85rem" }}>
          Signals are trade ideas for educational purposes, not financial advice. Trading foreign
          exchange carries a high level of risk. Never risk money you cannot afford to lose, and
          always use a stop loss. Past signal performance does not guarantee future results.
        </p>
      </div>
    </div>
  );
}
