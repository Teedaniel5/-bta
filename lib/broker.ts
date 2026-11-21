import { q, run } from "./db";

export const DERIV_WS_URL = "wss://ws.derivws.com/websockets/v3";

export const BROKER_FIELDS = [
  "deriv_enabled",
  "deriv_app_id",
  "deriv_api_token",
  "deriv_status",
  "weltrade_enabled",
  "weltrade_api_url",
  "weltrade_login",
  "weltrade_password",
  "weltrade_status",
] as const;

export type BrokerConfig = Record<string, string>;

export async function getBrokerConfig(): Promise<BrokerConfig> {
  const rows = await q(`SELECT key, value FROM settings`);
  const cfg: BrokerConfig = {};
  for (const r of rows) cfg[String(r.key)] = String(r.value ?? "");
  return cfg;
}

export async function saveBrokerSettings(entries: Record<string, string>) {
  for (const [key, value] of Object.entries(entries)) {
    await run(
      `INSERT INTO settings (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      [key, value]
    );
  }
}

const SYMBOL_MAP: Record<string, string> = {
  EURUSD: "frxEURUSD",
  GBPUSD: "frxGBPUSD",
  USDJPY: "frxUSDJPY",
  AUDUSD: "frxAUDUSD",
  USDCAD: "frxUSDCAD",
  GBPJPY: "frxGBPJPY",
  XAUUSD: "frxXAUUSD",
  BTCUSD: "frxBTCUSD",
};

const ALIASES: Record<string, string> = {
  GOLD: "XAUUSD",
  XAUUSD: "XAUUSD",
  BITCOIN: "BTCUSD",
  BTCUSD: "BTCUSD",
};

export function parseSymbols(text: string): string[] {
  const upper = text.toUpperCase();
  const letters = upper.replace(/[^A-Z]/g, "");
  const found = new Set<string>();
  for (const key of Object.keys(SYMBOL_MAP)) {
    if (letters.includes(key)) found.add(key);
  }
  for (const [alias, symbol] of Object.entries(ALIASES)) {
    if (new RegExp(`\\b${alias}\\b`).test(upper)) found.add(symbol);
  }
  return [...found].slice(0, 3);
}

function derivCall(
  appId: string,
  token: string | null,
  payload: Record<string, unknown>
): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    let active: WebSocket;
    try {
      active = new WebSocket(`${DERIV_WS_URL}?app_id=${encodeURIComponent(appId || "1089")}`);
    } catch (err) {
      reject(new Error(`Could not open the Deriv connection: ${String(err)}`));
      return;
    }
    const ws = active;
    const timer = setTimeout(() => {
      try { ws.close(); } catch {}
      reject(new Error("Deriv connection timed out."));
    }, 10000);

    const sendPayload = () => ws.send(JSON.stringify({ ...payload, req_id: 1 }));

    ws.onopen = () => {
      if (token) {
        ws.send(JSON.stringify({ authorize: token, req_id: 2 }));
      } else {
        sendPayload();
      }
    };
    ws.onmessage = (event) => {
      let data: Record<string, unknown>;
      try {
        data = JSON.parse(String(event.data)) as Record<string, unknown>;
      } catch {
        clearTimeout(timer);
        ws.close();
        reject(new Error("Invalid response from Deriv."));
        return;
      }
      const reqId = Number(data.req_id ?? 0);
      if (token && reqId === 2) {
        if (data.error) {
          clearTimeout(timer);
          ws.close();
          reject(new Error(`Deriv authorize failed: ${String((data.error as Record<string, unknown>)?.message ?? "invalid token")}`));
          return;
        }
        sendPayload();
        return;
      }
      if (reqId !== 1) return;
      clearTimeout(timer);
      ws.close();
      if (data.error) {
        reject(new Error(`Deriv error: ${String((data.error as Record<string, unknown>)?.message ?? "unknown")}`));
        return;
      }
      resolve(data);
    };
    ws.onerror = () => {
      clearTimeout(timer);
      reject(new Error("Could not reach the Deriv WebSocket API."));
    };
    ws.onclose = () => clearTimeout(timer);
  });
}

export type SymbolQuote = {
  symbol: string;
  price: string;
  changePct: string;
  high: string;
  low: string;
  timeframe: string;
};

export type BrokerSnapshot = {
  connected: boolean;
  provider: string | null;
  quotes: SymbolQuote[];
  error?: string;
};

export async function getMarketSnapshot(symbols: string[]): Promise<BrokerSnapshot> {
  const cfg = await getBrokerConfig();
  if (cfg.deriv_enabled !== "1") {
    return { connected: false, provider: null, quotes: [] };
  }
  const appId = cfg.deriv_app_id || "1089";
  const token = cfg.deriv_api_token || null;
  const quotes: SymbolQuote[] = [];
  const wanted = symbols.length ? symbols : ["EURUSD", "XAUUSD"];
  try {
    for (const symbol of wanted) {
      const wsSymbol = SYMBOL_MAP[symbol];
      if (!wsSymbol) continue;
      const data = await derivCall(appId, token, {
        ticks_history: wsSymbol,
        adjust_start_time: 1,
        count: 24,
        end: "latest",
        style: "candles",
        granularity: 3600,
      });
      const candles = (data.candles ?? []) as {
        open: string;
        high: string;
        low: string;
        close: string;
      }[];
      if (!candles.length) continue;
      const closes = candles.map((c) => Number(c.close));
      const open = Number(candles[0].open);
      const close = closes[closes.length - 1];
      const decimals = close < 10 ? (close < 1 ? 5 : 4) : 2;
      quotes.push({
        symbol,
        price: close.toFixed(decimals),
        changePct: open ? (((close - open) / open) * 100).toFixed(2) + "%" : "0%",
        high: Math.max(...candles.map((c) => Number(c.high))).toFixed(decimals),
        low: Math.min(...candles.map((c) => Number(c.low))).toFixed(decimals),
        timeframe: "H1 (last 24 hours)",
      });
    }
    if (!quotes.length) {
      return { connected: false, provider: null, quotes: [], error: "No quotes received." };
    }
    return { connected: true, provider: "Deriv", quotes };
  } catch (error) {
    return {
      connected: false,
      provider: null,
      quotes: [],
      error: String((error as Error).message || error),
    };
  }
}

export async function testDerivConnection(): Promise<{ ok: boolean; detail: string }> {
  const cfg = await getBrokerConfig();
  if (cfg.deriv_enabled !== "1") return { ok: false, detail: "Deriv is switched OFF." };
  try {
    const data = await derivCall(cfg.deriv_app_id || "1089", cfg.deriv_api_token || null, { ping: 1 });
    const auth = (data.authorize ?? null) as Record<string, unknown> | null;
    const balance =
      auth && auth.balance != null ? `, account balance ${String(auth.balance)} ${String(auth.currency ?? "")}` : "";
    return { ok: true, detail: `Connected to the Deriv API${balance}.` };
  } catch (error) {
    return { ok: false, detail: String((error as Error).message || error) };
  }
}

export async function testWeltradeConnection(): Promise<{ ok: boolean; detail: string }> {
  const cfg = await getBrokerConfig();
  if (cfg.weltrade_enabled !== "1") return { ok: false, detail: "Weltrade is switched OFF." };
  if (!cfg.weltrade_api_url) {
    return {
      ok: false,
      detail:
        "No Weltrade WebAPI endpoint set. Weltrade accounts are MT4/MT5 accounts — ask Weltrade support for their MetaTrader WebAPI URL. While Weltrade is not connected, the AI uses Deriv for live data.",
    };
  }
  try {
    const res = await fetch(`${cfg.weltrade_api_url.replace(/\/$/, "")}/authorize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ login: cfg.weltrade_login, password: cfg.weltrade_password }),
      signal: AbortSignal.timeout(10000),
    });
    if (res.ok) return { ok: true, detail: `Weltrade WebAPI answered HTTP ${res.status}.` };
    return { ok: false, detail: `Weltrade WebAPI answered HTTP ${res.status}. Check the login and password.` };
  } catch (error) {
    return {
      ok: false,
      detail: `Could not reach the Weltrade WebAPI: ${String((error as Error).message || error)}`,
    };
  }
}

export function buildMarketContext(snapshot: BrokerSnapshot): string {
  const now = new Date().toISOString().replace("T", " ").slice(0, 16) + " UTC";
  if (!snapshot.connected) {
    return `LIVE BROKER DATA STATUS: not connected${snapshot.error ? ` (${snapshot.error})` : ""}.
If the user asks about current prices, market conditions, direction (bullish/bearish) or trade setups, you MUST clearly tell them: "Live broker data is not connected, so I cannot give you the current market picture." NEVER invent, estimate or guess prices, directions or setups.`;
  }
  const lines = snapshot.quotes
    .map(
      (qt) =>
        `- ${qt.symbol}: last price ${qt.price}, change over ${qt.timeframe}: ${qt.changePct}, 24h high ${qt.high}, 24h low ${qt.low}`
    )
    .join("\n");
  return `LIVE BROKER DATA (source: ${snapshot.provider}, retrieved ${now}):
${lines}
When the user asks about the market, a symbol, directions or setups, base your answer ONLY on the figures above, mention that the data comes live from ${snapshot.provider}, quote the current price and the timeframe. Do not invent any other prices.`;
}
