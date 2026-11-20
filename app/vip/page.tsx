import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { activeSubscription } from "@/lib/access";
import { fmtDate } from "@/lib/files";
import { buyAction } from "@/app/actions";
import { q } from "@/lib/db";

export const metadata = { title: "VIP Elite Club" };

export default async function VIP({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const sp = await searchParams;
  const period = ["monthly", "quarterly", "annual"].includes(sp.period || "")
    ? (sp.period as string)
    : "monthly";
  const user = await getSessionUser();
  const sub = user ? await activeSubscription(user.id as number, "vip_elite") : null;
  const signalCount = await q(`SELECT COUNT(*) AS c FROM signals WHERE tier = 'vip'`);

  const benefits = [
    "Exclusive VIP trading signals",
    "Advanced market analysis & daily opportunities",
    "Private VIP community room",
    "Weekly live market analysis",
    "Exclusive trading strategy lessons & webinars",
    "Priority mentor assistance",
    "Premium eBooks and resources",
    "Access to selected premium indicators",
    "Recorded VIP sessions",
    "Monthly trading education reports",
  ];

  const prices: Record<string, number> = { monthly: 50, quarterly: 135, annual: 450 };

  return (
    <div className="container">
      <section className="hero" style={{ padding: "3rem 0", marginBottom: "2rem" }}>
        <span className="eyebrow">VIP Elite Club</span>
        <h1>
          <span className="gold">The inner circle</span> of BTA
        </h1>
        <p className="lead">
          The premium membership for serious traders — exclusive signals, live analysis and
          priority mentorship in a private gold-and-navy members area.
        </p>
        {sub ? (
          <div className="msg-banner msg-ok" style={{ display: "inline-block" }}>
            Your VIP membership is active until <b>{fmtDate(sub.expires_at)}</b>.{" "}
            <Link href="/signals" style={{ color: "inherit" }}>
              Open the signals centre →
            </Link>
          </div>
        ) : (
          <div className="cta-row">
            {(["monthly", "quarterly", "annual"] as const).map((p) => (
              <form action={buyAction} key={p}>
                <input type="hidden" name="itemType" value="subscription" />
                <input type="hidden" name="plan" value="vip_elite" />
                <input type="hidden" name="period" value={p} />
                <button
                  className={`btn-lg ${p === period ? "btn-gold-lg" : "btn-outline-lg"}`}
                  type="submit"
                  disabled={!user}
                >
                  {p === "monthly" ? "Monthly — $50" : p === "quarterly" ? "Quarterly — $135" : "Annual — $450"}
                </button>
              </form>
            ))}
          </div>
        )}
        {!user && (
          <p className="hero-alt">
            <Link href="/login">Login</Link> or <Link href="/register">register free</Link> to
            subscribe.
          </p>
        )}
      </section>

      <h2 className="page-title">
        VIP <span>benefits</span>
      </h2>
      <div className="grid grid-3" style={{ marginTop: "1.5rem" }}>
        {benefits.map((b) => (
          <div className="card" key={b}>
            <span className="chip gold">VIP</span>
            <p style={{ marginTop: "0.7rem" }}>{b}</p>
          </div>
        ))}
      </div>
      <div className="panel" style={{ marginTop: "1.5rem" }}>
        <h2>VIP members area</h2>
        <p style={{ color: "var(--muted)" }}>
          Once subscribed, your dashboard unlocks the VIP signals feed (currently{" "}
          {signalCount[0] ? String(signalCount[0].c) : "0"} VIP signals published), the private VIP
          room in the community, and premium resources.
        </p>
        <p style={{ marginTop: "0.75rem", color: "var(--muted)" }}>
          Risk notice: trading involves substantial risk of loss. VIP content is education and
          analysis — not financial advice and not a promise of profit.
        </p>
      </div>
    </div>
  );
}
