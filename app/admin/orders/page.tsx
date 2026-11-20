import Image from "next/image";
import { q } from "@/lib/db";
import AdminNav from "../AdminNav";
import { reviewOrderAction } from "../actions";
import { fmtDate, money, timeAgo } from "@/lib/files";

export const metadata = { title: "Admin — Orders" };

export default async function AdminOrders({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string }>;
}) {
  const sp = await searchParams;
  const pending = await q(
    `SELECT o.*, u.name AS member, u.email, s.expires_at AS sub_expires, u.id AS uid
     FROM orders o JOIN users u ON u.id = o.user_id
     LEFT JOIN subscriptions s ON s.id = o.item_id AND o.item_type = 'subscription'
     WHERE o.status IN ('awaiting_payment','verifying') ORDER BY o.id DESC`
  );
  const history = await q(
    `SELECT o.*, u.name AS member, u.email FROM orders o JOIN users u ON u.id = o.user_id
     WHERE o.status IN ('approved','rejected') ORDER BY o.id DESC LIMIT 50`
  );

  return (
    <div className="container">
      <h1 className="page-title">
        Orders &amp; <span>Payment Verification</span>
      </h1>
      <AdminNav />
      {sp.ok && <div className="msg-banner msg-ok">Order updated.</div>}

      <div className="panel">
        <h2>Pending review ({pending.length})</h2>
        {pending.length === 0 && <p style={{ color: "var(--muted)" }}>Nothing waiting for verification.</p>}
        {pending.map((o) => (
          <div className="card" key={String(o.id)} style={{ marginBottom: "1rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem" }}>
              <div>
                <b>#{String(o.id)} — {String(o.description)}</b>
                <p style={{ color: "var(--muted)", fontSize: "0.85rem" }}>
                  {String(o.member)} ({String(o.email)}) ·{" "}
                  {money(Number(o.amount))} · method: <b>{String(o.method || "not provided")}</b> ·{" "}
                  ref: <b>{String(o.reference || "—")}</b> · {timeAgo(o.created_at)}
                </p>
              </div>
              <span className={`chip ${o.status === "verifying" ? "amber" : ""}`}>{String(o.status).replace("_", " ")}</span>
            </div>
            {!!o.proof_path && (
              <Image src={`/api/file/${String(o.proof_path)}`} alt="proof" width={420} height={260} style={{ borderRadius: 8, margin: "0.8rem 0" }} />
            )}
            <div style={{ display: "flex", gap: "0.6rem" }}>
              <form action={reviewOrderAction}>
                <input type="hidden" name="orderId" value={String(o.id)} />
                <input type="hidden" name="decision" value="approve" />
                <button className="btn green sm" type="submit">
                  ✔ Approve &amp; grant access
                </button>
              </form>
              <form action={reviewOrderAction}>
                <input type="hidden" name="orderId" value={String(o.id)} />
                <input type="hidden" name="decision" value="reject" />
                <button className="btn danger sm" type="submit">
                  ✖ Reject
                </button>
              </form>
            </div>
          </div>
        ))}
      </div>

      <div className="panel">
        <h2>Order history</h2>
        <div className="table-scroll">
          <table className="table">
            <thead>
              <tr><th>#</th><th>Member</th><th>Item</th><th>Amount</th><th>Status</th><th>Handled</th></tr>
            </thead>
            <tbody>
              {history.map((o) => (
                <tr key={String(o.id)}>
                  <td>{String(o.id)}</td>
                  <td>{String(o.member)}<br /><span style={{ color: "var(--muted)", fontSize: "0.75rem" }}>{String(o.email)}</span></td>
                  <td>{String(o.description)}</td>
                  <td>{money(Number(o.amount))}</td>
                  <td><span className={`chip ${o.status === "approved" ? "green" : "red"}`}>{String(o.status)}</span></td>
                  <td>{fmtDate(o.approved_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
