import Link from "next/link";
import { notFound } from "next/navigation";
import { one } from "@/lib/db";
import { getSetting } from "@/lib/db";
import { submitProofAction } from "@/app/actions";
import { money } from "@/lib/files";
import { fmtDate } from "@/lib/files";
import { requireUser } from "@/lib/auth";

export const metadata = { title: "Checkout" };

export default async function CheckoutPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const sp = await searchParams;
  const order = await one(`SELECT * FROM orders WHERE id = ? AND user_id = ?`, [
    Number(id),
    user.id as number,
  ]);
  if (!order) notFound();
  const instructions = await getSetting("payment_instructions");
  const [wa1Name, wa1, wa2Name, wa2] = await Promise.all([
    getSetting("whatsapp_primary"),
    getSetting("whatsapp_primary_link"),
    getSetting("whatsapp_secondary"),
    getSetting("whatsapp_secondary_link"),
  ]);

  return (
    <div className="container" style={{ maxWidth: 760 }}>
      <h1 className="page-title">
        Complete your <span>order</span>
      </h1>
      <div className="panel">
        <h2>Order #{String(order.id)}</h2>
        <div className="tier">
          <span className="tier-info"><strong>{String(order.description)}</strong></span>
          <span className="price">{money(Number(order.amount))}</span>
        </div>
        <p style={{ color: "var(--muted)", marginTop: "0.75rem", fontSize: "0.85rem" }}>
          Placed {fmtDate(order.created_at)} · Status: <b>{String(order.status).replace("_", " ")}</b>
        </p>
      </div>

      {order.status === "approved" && (
        <div className="panel">
          <div className="msg-banner msg-ok">Payment approved — your access is active.</div>
          <Link className="btn green" href="/library">
            Open my library
          </Link>
        </div>
      )}

      {order.status === "verifying" && (
        <div className="panel">
          <div className="msg-banner msg-ok">
            Proof received! An administrator is verifying your payment. You will be notified, and
            your access is activated immediately after approval.
          </div>
          <Link className="btn outline" href="/library">
            Back to library
          </Link>
        </div>
      )}

      {(order.status === "awaiting_payment" || order.status === "rejected") && (
        <div className="panel">
          <h2>Payment instructions</h2>
          <p style={{ color: "var(--muted)", whiteSpace: "pre-wrap" }}>{instructions}</p>
          <div className="contact-list" style={{ margin: "1rem 0" }}>
            <a className="btn green" href={wa1} target="_blank" rel="noopener noreferrer">
              Get payment details on WhatsApp ({wa1Name})
            </a>
            <a className="btn outline" href={wa2} target="_blank" rel="noopener noreferrer">
              Second line: {wa2Name}
            </a>
          </div>
          {sp.error && <div className="msg-banner msg-err">{sp.error}</div>}
          <h2 style={{ marginTop: "1rem" }}>Submit your proof of payment</h2>
          <form className="stack" action={submitProofAction}>
            <input type="hidden" name="orderId" value={String(order.id)} />
            <label className="field">
              Payment method
              <select name="method" required defaultValue="">
                <option value="" disabled>
                  Select method
                </option>
                <option value="ecocash">EcoCash</option>
                <option value="onemoney">OneMoney</option>
                <option value="innbucks">Innbucks</option>
                <option value="bank_transfer">Bank transfer</option>
                <option value="card">Card / international</option>
                <option value="other">Other</option>
              </select>
            </label>
            <label className="field">
              Transaction reference
              <input name="reference" required placeholder="e.g. EC12345678" />
            </label>
            <label className="field">
              Proof of payment (screenshot or PDF)
              <input name="proof" type="file" accept=".jpg,.jpeg,.png,.webp,.pdf" required />
            </label>
            <button className="btn-gold-lg btn-lg" type="submit">
              Submit for verification
            </button>
          </form>
          <p style={{ color: "var(--muted)", fontSize: "0.8rem", marginTop: "0.8rem" }}>
            Never pay outside the details our team provides on WhatsApp. Access is only granted
            after admin verification — a screenshot alone is not enough.
          </p>
        </div>
      )}
    </div>
  );
}
