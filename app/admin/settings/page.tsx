import { getSetting } from "@/lib/db";
import AdminNav from "../AdminNav";
import { settingsAction } from "../actions";

export const metadata = { title: "Admin — Settings" };

export default async function AdminSettings({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string }>;
}) {
  const sp = await searchParams;
  const [wa1, wa2, wa1l, wa2l, instructions] = await Promise.all([
    getSetting("whatsapp_primary"),
    getSetting("whatsapp_secondary"),
    getSetting("whatsapp_primary_link"),
    getSetting("whatsapp_secondary_link"),
    getSetting("payment_instructions"),
  ]);
  return (
    <div className="container">
      <h1 className="page-title">
        Site <span>Settings</span>
      </h1>
      <AdminNav />
      {sp.ok && <div className="msg-banner msg-ok">Settings saved.</div>}
      <div className="panel" style={{ maxWidth: 720 }}>
        <h2>WhatsApp numbers</h2>
        <form className="stack" action={settingsAction}>
          <div className="grid grid-2">
            <label className="field">
              Primary number (display)
              <input name="whatsapp_primary" defaultValue={wa1} />
            </label>
            <label className="field">
              Primary wa.me link
              <input name="whatsapp_primary_link" defaultValue={wa1l} />
            </label>
          </div>
          <div className="grid grid-2">
            <label className="field">
              Secondary number (display)
              <input name="whatsapp_secondary" defaultValue={wa2} />
            </label>
            <label className="field">
              Secondary wa.me link
              <input name="whatsapp_secondary_link" defaultValue={wa2l} />
            </label>
          </div>
          <h2 style={{ marginTop: "1rem" }}>Manual payment instructions</h2>
          <label className="field">
            Shown to customers on checkout (EcoCash, bank details, etc.)
            <textarea name="payment_instructions" rows={6} defaultValue={instructions} />
          </label>
          <button className="btn-gold-lg btn-lg" type="submit">
            Save settings
          </button>
        </form>
        <p style={{ color: "var(--muted)", fontSize: "0.82rem", marginTop: "1rem" }}>
          Payments note: the current live flow is manual verification (customer uploads proof →
          admin approves). Automated gateway integrations (webhook-verified) can be added per
          provider availability in Zimbabwe — see docs/DEPLOYMENT.md.
        </p>
      </div>
    </div>
  );
}
