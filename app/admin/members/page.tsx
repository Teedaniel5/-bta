import { q } from "@/lib/db";
import AdminNav from "../AdminNav";
import { memberAdminAction } from "../actions";
import { fmtDate } from "@/lib/files";

export const metadata = { title: "Admin — Members" };

export default async function AdminMembers({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string }>;
}) {
  const sp = await searchParams;
  const members = await q(`SELECT * FROM users ORDER BY id DESC LIMIT 200`);
  const subs = await q(
    `SELECT s.*, u.email FROM subscriptions s JOIN users u ON u.id = s.user_id WHERE u.id > 0 ORDER BY s.id DESC`
  );
  const subsByUser = new Map<number, typeof subs>();
  for (const s of subs) {
    const key = Number(s.user_id);
    subsByUser.set(key, [...(subsByUser.get(key) ?? []), s]);
  }
  const ROLE_LABEL: Record<string, string> = {
    member: "Free member",
    moderator: "Moderator",
    instructor: "Instructor",
    provider: "Signal provider",
    admin: "Administrator",
    super_admin: "Super Admin",
  };

  return (
    <div className="container">
      <h1 className="page-title">
        Member <span>Management</span>
      </h1>
      <AdminNav />
      {sp.ok && <div className="msg-banner msg-ok">Member updated.</div>}

      <div className="panel">
        <h2>Registered members ({members.length})</h2>
        <div className="table-scroll">
          <table className="table">
            <thead>
              <tr><th>Member</th><th>Role</th><th>Status</th><th>Subscriptions</th><th>Joined</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={String(m.id)}>
                  <td>
                    <b>{String(m.name)}</b>
                    <br />
                    <span style={{ color: "var(--muted)", fontSize: "0.75rem" }}>{String(m.email)}</span>
                  </td>
                  <td><span className="chip purple">{ROLE_LABEL[String(m.role)] ?? String(m.role)}</span></td>
                  <td><span className={`chip ${m.status === "active" ? "green" : "red"}`}>{String(m.status)}</span></td>
                  <td style={{ fontSize: "0.78rem" }}>
                    {(subsByUser.get(Number(m.id)) ?? []).map((s) => (
                      <form action={memberAdminAction} key={String(s.id)} style={{ display: "flex", gap: "0.3rem", alignItems: "center", marginBottom: "0.25rem" }}>
                        <input type="hidden" name="userId" value={String(m.id)} />
                        <input type="hidden" name="subId" value={String(s.id)} />
                        <span>
                          {String(s.plan)} · {String(s.status)}
                          {s.status === "active" ? ` → ${fmtDate(s.expires_at)}` : ""}
                        </span>
                        {s.status === "active" && (
                          <button className="btn danger sm" type="submit" name="op" value="revoke_sub">
                            Revoke
                          </button>
                        )}
                      </form>
                    ))}
                    {(subsByUser.get(Number(m.id)) ?? []).length === 0 && "—"}
                  </td>
                  <td style={{ fontSize: "0.78rem" }}>{fmtDate(m.created_at)}</td>
                  <td>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem", minWidth: 160 }}>
                      <form action={memberAdminAction} style={{ display: "flex", gap: "0.3rem" }}>
                        <input type="hidden" name="userId" value={String(m.id)} />
                        <select name="op" defaultValue="" required>
                          <option value="" disabled>Action…</option>
                          <option value="grant_pro">Grant Signals Pro (30d)</option>
                          <option value="grant_vip">Grant VIP Elite (30d)</option>
                          <option value="member">Set role: member</option>
                          <option value="moderator">Set role: moderator</option>
                          <option value="instructor">Set role: instructor</option>
                          <option value="provider">Set role: signal provider</option>
                          <option value="admin">Set role: admin</option>
                          <option value="suspend">{m.status === "active" ? "Suspend account" : "Activate account"}</option>
                          <option value="activate">Activate account</option>
                        </select>
                        <button className="btn sm" type="submit">
                          Apply
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
