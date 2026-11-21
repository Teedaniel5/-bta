import Link from "next/link";
import { buyAction } from "@/app/actions";
import { PLANS } from "@/lib/access";
import { money } from "@/lib/files";
import { getSessionUser } from "@/lib/auth";

export const metadata = { title: "Membership Plans" };

const BENEFITS: Record<string, string[]> = {
  signals_pro: [
    "Premium daily forex & gold signals",
    "Entry, Stop Loss and Take Profit on every signal",
    "Full signal history archive",
    "Signal notifications",
    "Signal performance dashboard",
  ],
  vip_elite: [
    "Everything in Signals Pro",
    "Exclusive VIP signals and advanced analysis",
    "Private VIP community room",
    "Weekly live market analysis sessions",
    "Premium ebooks, indicators and resources",
    "Priority mentor assistance",
  ],
};

export default async function Membership() {
  const user = await getSessionUser();
  return (
    <div className="container">
      <h1 className="page-title">
        BTA <span>Membership Plans</span>
      </h1>
      <p className="page-sub">
        Signals Pro and VIP Elite are subscription memberships with automatic expiry dates and
        verified payments. Every purchase is reviewed by our team and access is granted instantly
        after approval.
      </p>
      {!user && (
        <div className="msg-banner msg-ok">
          <Link href="/register" style={{ color: "inherit", fontWeight: 700 }}>
            Create a free account first
          </Link>{" "}
          — then choose your plan below.
        </div>
      )}
      <div className="grid grid-2">
        {Object.entries(PLANS).map(([plan, def]) => (
          <div className="card" key={plan}>
            <span className={`chip ${plan === "vip_elite" ? "gold" : "purple"}`}>{def.label}</span>
            <ul style={{ margin: "1rem 0 1.2rem", paddingLeft: "1.1rem", color: "var(--muted)", fontSize: "0.92rem" }}>
              {BENEFITS[plan].map((b) => (
                <li key={b} style={{ marginBottom: "0.35rem" }}>
                  {b}
                </li>
              ))}
            </ul>
            {[["Monthly", "monthly"], ["Quarterly", "quarterly"], ["Annual", "annual"]].map(
              ([label, period]) => (
                <div className="tier" key={period}>
                  <span className="tier-info">
                    <strong>{label}</strong> · ${def.prices[period]}
                  </span>
                  <form action={buyAction}>
                    <input type="hidden" name="itemType" value="subscription" />
                    <input type="hidden" name="plan" value={plan} />
                    <input type="hidden" name="period" value={period} />
                    <button className="btn green sm" type="submit" disabled={!user}>
                      {user ? "Subscribe" : "Login to subscribe"}
                    </button>
                  </form>
                </div>
              )
            )}
          </div>
        ))}
      </div>
      <div className="panel" style={{ marginTop: "1.5rem", textAlign: "center" }}>
        <h2 style={{ justifyContent: "center" }}>Free Member?</h2>
        <p>
          Free accounts keep community access, free resources and sample signals — forever.{" "}
          <Link href="/register" style={{ color: "var(--gold-light)", fontWeight: 700 }}>
            Register free
          </Link>
        </p>
      </div>
      <p className="auth-links" style={{ textAlign: "center", marginTop: "1.5rem" }}>
        Total shown per plan: {money(15)}+ per month for Signals Pro ·{" "}
        <Link href="/vip">see VIP benefits</Link>
      </p>
    </div>
  );
}
