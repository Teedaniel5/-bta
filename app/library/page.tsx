import Link from "next/link";
import { q } from "@/lib/db";
import { cancelSubscriptionAction } from "@/app/admin/actions";
import { money, fmtDate } from "@/lib/files";
import { PLANS } from "@/lib/access";
import { requireUser } from "@/lib/auth";

export const metadata = { title: "My Library" };

export default async function Library({
  searchParams,
}: {
  searchParams: Promise<{ submitted?: string; cancelled?: string }>;
}) {
  const user = await requireUser();
  const sp = await searchParams;
  const uid = user.id as number;
  const [purchases, subs, orders, enrolled] = await Promise.all([
    q(`SELECT o.*, p.file_path, COALESCE(p.title, 'Product removed by admin') AS title, CASE WHEN p.id IS NULL THEN 1 ELSE 0 END AS removed FROM orders o LEFT JOIN products p ON p.id = o.item_id WHERE o.user_id = ? AND o.item_type = 'product' AND o.status = 'approved'`, [uid]),
    q(`SELECT * FROM subscriptions WHERE user_id = ? ORDER BY id DESC`, [uid]),
    q(`SELECT * FROM orders WHERE user_id = ? ORDER BY id DESC LIMIT 20`, [uid]),
    q(`SELECT c.* FROM enrollments e JOIN courses c ON c.id = e.course_id WHERE e.user_id = ?`, [uid]),
  ]);
  const expirySoon = subs.some(
    (s) =>
      s.status === "active" &&
      s.expires_at &&
      new Date(String(s.expires_at).replace(" ", "T")).getTime() - Date.now() <
        7 * 86400000
  );

  return (
    <div className="container">
      <h1 className="page-title">
        My <span>Library</span>
      </h1>
      {sp.submitted && (
        <div className="msg-banner msg-ok">Proof submitted — an admin will verify it shortly.</div>
      )}
      {sp.cancelled && (
        <div className="msg-banner msg-ok">Subscription cancelled — access remains until the paid period ends.</div>
      )}
      {expirySoon && (
        <div className="msg-banner msg-ok">
          One of your subscriptions expires within 7 days — renew from the{" "}
          <Link href="/membership" style={{ color: "inherit", fontWeight: 700 }}>
            membership page
          </Link>{" "}
          to keep access.
        </div>
      )}

      <div className="panel">
        <h2>Purchased products &amp; downloads</h2>
        {purchases.length === 0 && (
          <p style={{ color: "var(--muted)" }}>
            No approved purchases yet.{" "}
            <Link href="/store" style={{ color: "var(--gold-light)" }}>
              Browse the store
            </Link>
          </p>
        )}
        {purchases.map((p) => (
          <div className="tier" key={String(p.id)}>
            <span className="tier-info"><strong>{String(p.title)}</strong></span>
            {p.removed ? (
              <span className="chip amber">No longer available</span>
            ) : p.file_path ? (
              <a className="btn green sm" href={`/api/download/order/${String(p.id)}`}>
                Secure download
              </a>
            ) : (
              <span className="chip amber">Awaiting file from admin</span>
            )}
          </div>
        ))}
      </div>

      <div className="panel">
        <h2>My courses</h2>
        {enrolled.length === 0 && (
          <p style={{ color: "var(--muted)" }}>
            Not enrolled in any course yet.{" "}
            <Link href="/courses" style={{ color: "var(--gold-light)" }}>
              Explore courses
            </Link>
          </p>
        )}
        {enrolled.map((c) => (
          <div className="tier" key={String(c.id)}>
            <span className="tier-info"><strong>{String(c.title)}</strong></span>
            <Link className="btn sm" href={`/courses/${c.id}`}>
              Continue learning
            </Link>
          </div>
        ))}
      </div>

      <div className="panel">
        <h2>My subscriptions</h2>
        {subs.length === 0 && (
          <p style={{ color: "var(--muted)" }}>
            No subscriptions yet.{" "}
            <Link href="/membership" style={{ color: "var(--gold-light)" }}>
              Join Signals Pro or VIP Elite
            </Link>
          </p>
        )}
        <div className="table-scroll">
          <table className="table">
            <thead>
              <tr>
                <th>Plan</th>
                <th>Period</th>
                <th>Status</th>
                <th>Expires</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {subs.map((s) => (
                <tr key={String(s.id)}>
                  <td>{PLANS[String(s.plan)]?.label ?? String(s.plan)}</td>
                  <td>{String(s.billing_period)}</td>
                  <td>
                    <span className={`chip ${s.status === "active" ? "green" : s.status === "cancelled" ? "red" : "amber"}`}>
                      {String(s.status).replace("_", " ")}
                    </span>
                  </td>
                  <td>{s.status === "active" ? fmtDate(s.expires_at) : "—"}</td>
                  <td>
                    {s.status === "active" && (
                      <form action={cancelSubscriptionAction}>
                        <input type="hidden" name="subId" value={String(s.id)} />
                        <button className="btn danger sm" type="submit">
                          Cancel
                        </button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="panel">
        <h2>Payment history</h2>
        <div className="table-scroll">
          <table className="table">
            <thead>
              <tr>
                <th>#</th>
                <th>Description</th>
                <th>Amount</th>
                <th>Method</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={String(o.id)}>
                  <td>{String(o.id)}</td>
                  <td>{String(o.description)}</td>
                  <td>{money(Number(o.amount))}</td>
                  <td>{o.method ? String(o.method).replace("_", " ") : "—"}</td>
                  <td>
                    <span className={`chip ${o.status === "approved" ? "green" : o.status === "rejected" ? "red" : "amber"}`}>
                      {String(o.status).replace("_", " ")}
                    </span>
                  </td>
                  <td>{o.approved_at ? fmtDate(o.approved_at) : fmtDate(o.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
