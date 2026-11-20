import { q } from "@/lib/db";
import AdminNav from "./AdminNav";
import { getSessionUser } from "@/lib/auth";

export const metadata = { title: "Admin" };

export default async function AdminHome() {
  const user = await getSessionUser();
  const [users, subs, revenue, orders, prods, courses, sigs, enrollments, contactPending] =
    await Promise.all([
      q(`SELECT COUNT(*) AS c FROM users WHERE status = 'active'`),
      q(`SELECT COUNT(*) AS c FROM subscriptions WHERE status = 'active' AND expires_at > datetime('now')`),
      q(`SELECT IFNULL(SUM(amount), 0) AS total FROM orders WHERE status = 'approved'`),
      q(`SELECT COUNT(*) AS c FROM orders WHERE status IN ('awaiting_payment','verifying')`),
      q(`SELECT COUNT(*) AS c FROM products WHERE published = 1`),
      q(`SELECT COUNT(*) AS c FROM courses WHERE published = 1`),
      q(`SELECT COUNT(*) AS c FROM signals`),
      q(`SELECT COUNT(*) AS c FROM enrollments`),
      q(`SELECT COUNT(*) AS c FROM contact_messages WHERE handled = 0`),
    ]);
  const monthly = await q(
    `SELECT strftime('%Y-%m', approved_at) AS ym, IFNULL(SUM(amount),0) AS total, COUNT(*) AS n
     FROM orders WHERE status = 'approved' AND approved_at IS NOT NULL
     GROUP BY ym ORDER BY ym DESC LIMIT 6`
  );
  const distribution = await q(
    `SELECT plan, COUNT(*) AS c FROM subscriptions WHERE status = 'active' AND expires_at > datetime('now') GROUP BY plan`
  );
  const max = Math.max(1, ...monthly.map((m) => Number(m.total)));
  const n = (x: unknown) => Number(x ?? 0);

  return (
    <div className="container">
      <h1 className="page-title">
        Admin <span>Control Centre</span>
      </h1>
      <p className="page-sub">Signed in as {String(user?.name)} (super admin / admin tools).</p>
      <AdminNav />

      <div className="stat-grid">
        <div className="stat"><div className="value">{n(users[0]?.c)}</div><div className="label">Registered members</div></div>
        <div className="stat"><div className="value">{n(subs[0]?.c)}</div><div className="label">Active subscribers</div></div>
        <div className="stat"><div className="value">$ {n(revenue[0]?.total)}</div><div className="label">Total sales (approved)</div></div>
        <div className="stat"><div className="value">{n(orders[0]?.c)}</div><div className="label">Orders to review</div></div>
        <div className="stat"><div className="value">{n(enrollments[0]?.c)}</div><div className="label">Course enrolments</div></div>
        <div className="stat"><div className="value">{n(prods[0]?.c)} / {n(courses[0]?.c)}</div><div className="label">Products / Courses live</div></div>
        <div className="stat"><div className="value">{n(sigs[0]?.c)}</div><div className="label">Signals published</div></div>
        <div className="stat"><div className="value">{n(contactPending[0]?.c)}</div><div className="label">Unread messages</div></div>
      </div>

      <div className="grid grid-2" style={{ marginTop: "1.5rem" }}>
        <div className="panel">
          <h2>Monthly revenue (verified payments)</h2>
          {monthly.length === 0 && <p style={{ color: "var(--muted)" }}>No approved payments yet.</p>}
          {monthly.map((m) => (
            <div className="tier" key={String(m.ym)}>
              <span className="tier-info"><strong>{String(m.ym)}</strong> · {String(m.n)} payments</span>
              <span style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                <span className="progress-bar" style={{ width: `${(Number(m.total) / max) * 120 + 10}px` }}>
                  <div style={{ width: "100%" }} />
                </span>
                <b style={{ color: "var(--gold-light)" }}>$ {String(m.total)}</b>
              </span>
            </div>
          ))}
        </div>
        <div className="panel">
          <h2>Membership distribution (active)</h2>
          {distribution.length === 0 && <p style={{ color: "var(--muted)" }}>No active subscriptions yet.</p>}
          {distribution.map((d) => (
            <div className="tier" key={String(d.plan)}>
              <span className="tier-info">{String(d.plan)}</span>
              <b style={{ color: "var(--gold-light)" }}>{String(d.c)}</b>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
