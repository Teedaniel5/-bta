import Link from "next/link";
import { q } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { isAdmin } from "@/lib/auth";
import { PLANS, membershipLevel, activeSubscriptions } from "@/lib/access";
import { fmtDate, money } from "@/lib/files";

export const metadata = { title: "My Dashboard" };

export default async function Dashboard() {
  const user = await requireUser();
  const uid = user.id as number;
  const [level, subs, products, courses, payments, notifs, activity] = await Promise.all([
    membershipLevel(user),
    activeSubscriptions(uid),
    q(`SELECT p.title, p.id FROM orders o JOIN products p ON p.id = o.item_id WHERE o.user_id = ? AND o.item_type = 'product' AND o.status = 'approved'`, [uid]),
    q(`SELECT c.title, c.id FROM enrollments e JOIN courses c ON c.id = e.course_id WHERE e.user_id = ?`, [uid]),
    q(`SELECT * FROM orders WHERE user_id = ? AND status = 'approved' ORDER BY approved_at DESC LIMIT 5`, [uid]),
    q(`SELECT * FROM notifications WHERE user_id = ? OR user_id IS NULL ORDER BY id DESC LIMIT 12`, [uid]),
    q(`SELECT COUNT(*) AS c FROM posts WHERE user_id = ?`, [uid]),
  ]);
  const pending = await q(
    `SELECT id, description FROM orders WHERE user_id = ? AND status IN ('awaiting_payment','verifying')`,
    [uid]
  );

  const labels: Record<string, string> = {
    free: "Free Member",
    student: "Student",
    pro: "Signals Pro",
    vip: "VIP Elite",
  };

  return (
    <div className="container">
      <h1 className="page-title">
        Welcome back, <span>{String(user.name).split(" ")[0]}</span> 👋
      </h1>
      <p className="page-sub">
        {isAdmin(user) ? "You are staff — manage the academy from the admin area." : "This is your personal BTA dashboard."}
      </p>

      <div className="stat-grid">
        <div className="stat">
          <div className="value" style={{ fontSize: "1rem", letterSpacing: "0.06em" }}>{labels[level]}</div>
          <div className="label">Membership level</div>
        </div>
        {subs.map((s) => (
          <div className="stat" key={String(s.id)}>
            <div className="value" style={{ fontSize: "1rem" }}>{PLANS[String(s.plan)]?.label ?? ""}</div>
            <div className="label">Active until {fmtDate(s.expires_at)}</div>
          </div>
        ))}
        <div className="stat">
          <div className="value">{courses.length}</div>
          <div className="label">Courses enrolled</div>
        </div>
        <div className="stat">
          <div className="value">{products.length}</div>
          <div className="label">Products owned</div>
        </div>
        <div className="stat">
          <div className="value">{Number(activity[0]?.c ?? 0)}</div>
          <div className="label">Community posts</div>
        </div>
      </div>

      {pending.length > 0 && (
        <div className="panel">
          <h2>Pending payment</h2>
          {pending.map((p) => (
            <div className="tier" key={String(p.id)}>
              <span className="tier-info"><strong>{String(p.description)}</strong> · {String(p.status).replace("_", " ")}</span>
              <Link className="btn gold sm" href={`/checkout/order/${p.id}`}>
                {p.status === "awaiting_payment" ? "Complete payment" : "View status"}
              </Link>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-2" style={{ marginTop: "1.25rem" }}>
        <div className="panel">
          <h2>Quick links</h2>
          <div className="contact-list">
            <Link className="btn outline sm" href="/courses">My courses</Link>
            <Link className="btn outline sm" href="/library">Library &amp; downloads</Link>
            <Link className="btn outline sm" href="/signals">Signals centre</Link>
            <Link className="btn outline sm" href="/community">Community</Link>
            <Link className="btn outline sm" href="/resources">Free resources</Link>
          </div>
          <p className="hero-alt">Want more? <Link href="/membership">Upgrade your membership</Link></p>
        </div>
        <div className="panel">
          <h2>Recent payments</h2>
          {payments.length === 0 && <p style={{ color: "var(--muted)" }}>No approved payments yet.</p>}
          {payments.map((p) => (
            <div className="tier" key={String(p.id)}>
              <span className="tier-info">{String(p.description)}</span>
              <span className="tier-info"><strong>{money(Number(p.amount))}</strong> · {fmtDate(p.approved_at)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="panel">
        <h2>Notifications</h2>
        {notifs.length === 0 && <p style={{ color: "var(--muted)" }}>Nothing new right now.</p>}
        {notifs.map((n) => (
          <div className="tier" key={String(n.id)}>
            <span className="tier-info">
              {n.user_id ? "🔔" : "📣"} {String(n.message)}
            </span>
            {!!n.link && (
              <Link className="btn outline sm" href={String(n.link)}>
                Open
              </Link>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
