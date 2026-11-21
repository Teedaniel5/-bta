import { q } from "@/lib/db";
import AdminNav from "../AdminNav";
import ConfirmForm from "@/components/ConfirmForm";
import { deleteSignalAction, publishSignalAction, updateSignalAction } from "../actions";
import { fmtDate, timeAgo } from "@/lib/files";

export const metadata = { title: "Admin — Signals" };

const INSTRUMENTS = [
  "EURUSD",
  "GBPUSD",
  "USDJPY",
  "XAUUSD",
  "GBPJPY",
  "AUDUSD",
  "USDCAD",
  "BTCUSD",
  "Other",
];

export default async function AdminSignals({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const sp = await searchParams;
  const signals = await q(`SELECT * FROM signals ORDER BY id DESC LIMIT 100`);

  return (
    <div className="container">
      <h1 className="page-title">
        Signal <span>Management</span>
      </h1>
      <AdminNav />
      {sp.ok && <div className="msg-banner msg-ok">Signal updated.</div>}
      {sp.error && <div className="msg-banner msg-err">{sp.error}</div>}

      <div className="panel">
        <h2>Publish a signal</h2>
        <form className="stack" action={publishSignalAction}>
          <div className="grid grid-3">
            <label className="field">
              Instrument
              <input name="instrument" list="instruments" required placeholder="XAUUSD" />
              <datalist id="instruments">
                {INSTRUMENTS.map((i) => (
                  <option key={i} value={i} />
                ))}
              </datalist>
            </label>
            <label className="field">
              Direction
              <select name="direction">
                <option value="buy">BUY</option>
                <option value="sell">SELL</option>
              </select>
            </label>
            <label className="field">
              Timeframe
              <input name="timeframe" placeholder="M15 / H1 / H4" />
            </label>
          </div>
          <div className="grid grid-3">
            <label className="field">
              Entry price
              <input name="entry" required placeholder="2330.50" />
            </label>
            <label className="field">
              Stop loss
              <input name="stopLoss" placeholder="2325.00" />
            </label>
            <label className="field">
              Risk : Reward
              <input name="rr" placeholder="1:2.5" />
            </label>
          </div>
          <label className="field">
            Take profit levels
            <input name="takeProfits" placeholder="TP1: 2336.00, TP2: 2342.00" />
          </label>
          <label className="field">
            Trading rationale / analysis
            <textarea name="rationale" rows={3} />
          </label>
          <div className="grid grid-2">
            <label className="field">
              Tier
              <select name="tier">
                <option value="pro">Premium (Signals Pro)</option>
                <option value="vip">VIP Elite only</option>
                <option value="free">Free sample</option>
              </select>
            </label>
            <label className="field">
              Chart screenshot
              <input name="chart" type="file" accept=".jpg,.jpeg,.png,.webp,.gif" />
            </label>
          </div>
          <button className="btn-gold-lg btn-lg" type="submit">
            Publish signal
          </button>
        </form>
      </div>

      <div className="panel">
        <h2>Signals ({signals.length})</h2>
        <div className="table-scroll">
          <table className="table">
            <thead>
              <tr><th>Instrument</th><th>Dir</th><th>Entry / SL / TP</th><th>Tier</th><th>Status</th><th>Published</th><th>Update</th></tr>
            </thead>
            <tbody>
              {signals.map((s) => (
                <tr key={String(s.id)}>
                  <td><b>{String(s.instrument)}</b></td>
                  <td><span className={`chip ${s.direction === "sell" ? "red" : "green"}`}>{String(s.direction)}</span></td>
                  <td style={{ fontSize: "0.78rem" }}>{String(s.entry)} / {String(s.stop_loss || "—")} / {String(s.take_profits || "—")}</td>
                  <td><span className="chip">{String(s.tier)}</span></td>
                  <td>
                    {s.result ? <span className={`chip ${s.result === "win" ? "green" : s.result === "loss" ? "red" : "amber"}`}>{String(s.result)}</span> : <span className="chip amber">{String(s.status)}</span>}
                    <br />
                    <span style={{ fontSize: "0.72rem", color: "var(--muted)" }}>{timeAgo(s.created_at)}</span>
                  </td>
                  <td style={{ fontSize: "0.78rem" }}>{fmtDate(s.created_at)}</td>
                  <td>
                    <form action={updateSignalAction} className="stack" style={{ gap: "0.4rem", minWidth: 190 }}>
                      <input type="hidden" name="id" value={String(s.id)} />
                      <select name="status" defaultValue={String(s.status)}>
                        <option value="active">Active</option>
                        <option value="closed">Closed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                      <select name="result" defaultValue={String(s.result || "")}>
                        <option value="">Outcome…</option>
                        <option value="win">Win</option>
                        <option value="loss">Loss</option>
                        <option value="breakeven">Break-even</option>
                      </select>
                      <button className="btn green sm" type="submit">
                        Update
                      </button>
                    </form>
                    <ConfirmForm action={deleteSignalAction} fields={{ id: String(s.id) }} label="Delete" />
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
