import { createClient, type InValue } from "@libsql/client";

const url = process.env.DATABASE_URL || "file:data/bta.db";

export const db = createClient({ url, authToken: process.env.DATABASE_AUTH_TOKEN });

export type Row = Record<string, unknown>;

let initPromise: Promise<void> | null = null;

export function ensureInit(): Promise<void> {
  if (!initPromise) initPromise = initDb();
  return initPromise;
}

export async function q(sql: string, args: InValue[] = []): Promise<Row[]> {
  await ensureInit();
  const r = await db.execute({ sql, args });
  return r.rows as Row[];
}

async function raw(sql: string, args: InValue[] = []): Promise<Row[]> {
  const r = await db.execute({ sql, args });
  return r.rows as Row[];
}

export async function one(sql: string, args: InValue[] = []): Promise<Row | null> {
  const rows = await q(sql, args);
  return rows[0] ?? null;
}

export async function run(sql: string, args: InValue[] = []): Promise<void> {
  await ensureInit();
  await db.execute({ sql, args });
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'member',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  expires_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  price REAL NOT NULL DEFAULT 0,
  cover_path TEXT,
  preview TEXT,
  file_path TEXT,
  published INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL REFERENCES products(id),
  user_id INTEGER NOT NULL REFERENCES users(id),
  rating INTEGER NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS courses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  price REAL NOT NULL DEFAULT 0,
  cover_path TEXT,
  published INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS modules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  course_id INTEGER NOT NULL REFERENCES courses(id),
  title TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS lessons (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  module_id INTEGER NOT NULL REFERENCES modules(id),
  title TEXT NOT NULL,
  body TEXT,
  video_url TEXT,
  file_path TEXT,
  position INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS enrollments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  course_id INTEGER NOT NULL REFERENCES courses(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, course_id)
);
CREATE TABLE IF NOT EXISTS lesson_progress (
  user_id INTEGER NOT NULL REFERENCES users(id),
  lesson_id INTEGER NOT NULL REFERENCES lessons(id),
  completed_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, lesson_id)
);
CREATE TABLE IF NOT EXISTS signals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  instrument TEXT NOT NULL,
  direction TEXT NOT NULL,
  entry TEXT NOT NULL,
  stop_loss TEXT,
  take_profits TEXT,
  rr TEXT,
  timeframe TEXT,
  rationale TEXT,
  image_path TEXT,
  tier TEXT NOT NULL DEFAULT 'pro',
  status TEXT NOT NULL DEFAULT 'active',
  result TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  closed_at TEXT
);
CREATE TABLE IF NOT EXISTS subscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  plan TEXT NOT NULL,
  billing_period TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'awaiting_payment',
  started_at TEXT,
  expires_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  item_type TEXT NOT NULL,
  item_id INTEGER,
  description TEXT NOT NULL,
  amount REAL NOT NULL,
  method TEXT,
  reference TEXT,
  proof_path TEXT,
  status TEXT NOT NULL DEFAULT 'awaiting_payment',
  approved_by INTEGER,
  approved_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS rooms (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  access TEXT NOT NULL DEFAULT 'public'
);
CREATE TABLE IF NOT EXISTS posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  room_id INTEGER NOT NULL REFERENCES rooms(id),
  user_id INTEGER NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  image_path TEXT,
  pinned INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS replies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id INTEGER NOT NULL REFERENCES posts(id),
  user_id INTEGER NOT NULL REFERENCES users(id),
  body TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS post_likes (
  post_id INTEGER NOT NULL REFERENCES posts(id),
  user_id INTEGER NOT NULL REFERENCES users(id),
  PRIMARY KEY (post_id, user_id)
);
CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS contact_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  body TEXT NOT NULL,
  handled INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS resources (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'article',
  body TEXT NOT NULL DEFAULT '',
  file_path TEXT,
  published INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`;

async function migrate() {
  for (const stmt of SCHEMA.split(";")) {
    if (stmt.trim()) await db.execute(stmt);
  }
}

async function seed() {
  const rooms = await raw(`SELECT COUNT(*) AS c FROM rooms`);
  if (Number(rooms[0]?.c ?? 0) === 0) {
    const seedRooms = [
      ["Public Lounge", "public-lounge", "Open discussion for everyone.", "public"],
      ["Forex News", "forex-news", "Share and discuss market news.", "public"],
      ["Q&A", "qa", "Ask questions, get answers.", "public"],
      ["Strategy Lab", "strategy-lab", "Trading strategy discussions.", "member"],
      ["Members Lounge", "members-lounge", "Registered members only.", "member"],
      ["Student Room", "student-room", "For students enrolled in courses.", "student"],
      ["VIP Room", "vip-room", "VIP Elite members only.", "vip"],
    ];
    for (const [name, slug, description, access] of seedRooms) {
      await raw(
        `INSERT INTO rooms (name, slug, description, access) VALUES (?, ?, ?, ?)`,
        [name, slug, description, access]
      );
    }
  }
  const settings = await raw(`SELECT COUNT(*) AS c FROM settings`);
  if (Number(settings[0]?.c ?? 0) === 0) {
    const defaults: [string, string][] = [
      ["whatsapp_primary", "+263786612844"],
      ["whatsapp_secondary", "+263774827123"],
      ["whatsapp_primary_link", "https://wa.me/263786612844"],
      ["whatsapp_secondary_link", "https://wa.me/263774827123"],
      [
        "payment_instructions",
        "Pay via EcoCash/OneMoney/Innbucks/Bank Transfer to the details provided in the WhatsApp confirmation. After paying, upload your proof of payment on the checkout page. Your access is granted once an administrator verifies the payment.",
      ],
    ];
    for (const [k, v] of defaults) {
      await raw(`INSERT INTO settings (key, value) VALUES (?, ?)`, [k, v]);
    }
  }
  const products = await raw(`SELECT COUNT(*) AS c FROM products`);
  if (Number(products[0]?.c ?? 0) === 0) {
    const desc =
      "Our powerful premium indicator for MT4/MT5 that gives clear buy and sell signals, with trend filter and risk management built in.";
    const seedProducts: [string, string, string, number][] = [
      ["Mr Euaggelion Pro v1 Indicator — Monthly", "indicator", desc, 50],
      ["Mr Euaggelion Pro v1 Indicator — Yearly", "indicator", desc, 100],
      ["Mr Euaggelion Pro v1 Indicator — Lifetime", "indicator", desc, 500],
    ];
    for (const [title, category, description, price] of seedProducts) {
      await raw(
        `INSERT INTO products (title, category, description, price, published) VALUES (?, ?, ?, ?, 1)`,
        [title, category, description, price]
      );
    }
  }
}

export async function initDb() {
  await migrate();
  await seed();
}

export async function getSetting(key: string): Promise<string> {
  const row = await one(`SELECT value FROM settings WHERE key = ?`, [key]);
  return row ? String(row.value) : "";
}
