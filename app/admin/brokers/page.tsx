import { getBrokerConfig } from "@/lib/broker";
import AdminNav from "../AdminNav";
import { saveBrokerAction, testBrokerAction } from "../actions";

export const metadata = { title: "Admin — Broker APIs" };

function mask(secret: string): string {
  if (!secret) return "Not set";
  return `••••••${secret.slice(-4)}`;
}

function statusChip(status: string | undefined) {
  if (!status) return <span className="chip">Never tested</span>;
  const ok = status.startsWith("OK");
  return (
    <span className={`chip ${ok ? "green" : "red"}`} title={status}>
      {ok ? "Last test: OK" : "Last test: FAILED"}
    </span>
  );
}

export default async function AdminBrokers({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; tested?: string; result?: string }>;
}) {
  const sp = await searchParams;
  const cfg = await getBrokerConfig();

  return (
    <div className="container">
      <h1 className="page-title">
        Broker <span>APIs</span>
      </h1>
      <AdminNav />
      {sp.ok && <div className="msg-banner msg-ok">Broker settings saved.</div>}
      {sp.tested && (
        <div className={`msg-banner ${sp.result === "1" ? "msg-ok" : "msg-err"}`}>
          {sp.tested === "weltrade" ? "Weltrade" : "Deriv"} connection test{" "}
          {sp.result === "1" ? "succeeded" : "failed"} — see status below.
        </div>
      )}

      <div className="panel">
        <h2>How this works</h2>
        <p style={{ color: "var(--muted)", fontSize: "0.92rem" }}>
          The AI mentor uses these broker connections to read <b>live market data</b> (prices, charts,
          account balance). Key details are stored server-side, shown masked, and are never visible to
          students. Deriv gives live forex and gold data with only an App ID (free at api.deriv.com).
          Weltrade accounts are MT4/MT5 — if Weltrade support gives you a WebAPI endpoint, enter it here;
          otherwise keep Weltrade OFF and the AI uses Deriv.
        </p>
      </div>

      <div className="panel">
        <h2>Deriv (live prices &amp; charts) {statusChip(cfg.deriv_status)}</h2>
        {cfg.deriv_status && (
          <p style={{ color: "var(--muted)", fontSize: "0.82rem" }}>{cfg.deriv_status}</p>
        )}
        <form className="stack" action={saveBrokerAction}>
          <div className="grid grid-3">
            <label className="field">
              Deriv App ID
              <input
                name="deriv_app_id"
                defaultValue={cfg.deriv_app_id || ""}
                placeholder="e.g. 1089 (test app id)"
              />
            </label>
            <label className="field">
              Deriv API token {!cfg.deriv_api_token && "(paste to set)"}
              {cfg.deriv_api_token && ` (stored: ${mask(cfg.deriv_api_token)})`}
              <input name="deriv_api_token" type="password" placeholder="Leave blank to keep current" />
            </label>
            <label style={{ display: "flex", gap: "0.4rem", alignItems: "center", color: "var(--muted)", fontSize: "0.85rem" }}>
              <input type="checkbox" name="deriv_enabled" defaultChecked={cfg.deriv_enabled === "1"} />
              Deriv enabled
            </label>
          </div>
          <div style={{ display: "flex", gap: "0.6rem" }}>
            <button className="btn-gold-lg" type="submit">
              Save Deriv settings
            </button>
          </div>
        </form>
        <form action={testBrokerAction} style={{ marginTop: "0.6rem" }}>
          <input type="hidden" name="broker" value="deriv" />
          <button className="btn green" type="submit">
            Test Deriv connection
          </button>
        </form>
      </div>

      <div className="panel">
        <h2>Weltrade (MT4/MT5) {statusChip(cfg.weltrade_status)}</h2>
        {cfg.weltrade_status && (
          <p style={{ color: "var(--muted)", fontSize: "0.82rem" }}>{cfg.weltrade_status}</p>
        )}
        <form className="stack" action={saveBrokerAction}>
          <div className="grid grid-3">
            <label className="field">
              Weltrade WebAPI URL
              <input
                name="weltrade_api_url"
                defaultValue={cfg.weltrade_api_url || ""}
                placeholder="https://.../api (from Weltrade support)"
              />
            </label>
            <label className="field">
              MT4/MT5 login (stored if set {cfg.weltrade_login ? `: ${mask(cfg.weltrade_login)}` : ""})
              <input name="weltrade_login" placeholder="Account number" />
            </label>
            <label className="field">
              MT4/MT5 password {!cfg.weltrade_password && "(paste to set)"}
              {cfg.weltrade_password && ` (stored: ${mask(cfg.weltrade_password)})`}
              <input name="weltrade_password" type="password" placeholder="Leave blank to keep current" />
            </label>
          </div>
          <label style={{ display: "flex", gap: "0.4rem", alignItems: "center", color: "var(--muted)", fontSize: "0.85rem" }}>
            <input type="checkbox" name="weltrade_enabled" defaultChecked={cfg.weltrade_enabled === "1"} />
            Weltrade enabled
          </label>
          <div style={{ display: "flex", gap: "0.6rem" }}>
            <button className="btn-gold-lg" type="submit">
              Save Weltrade settings
            </button>
          </div>
        </form>
        <form action={testBrokerAction} style={{ marginTop: "0.6rem" }}>
          <input type="hidden" name="broker" value="weltrade" />
          <button className="btn green" type="submit">
            Test Weltrade connection
          </button>
        </form>
      </div>
    </div>
  );
}
