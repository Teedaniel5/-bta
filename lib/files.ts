import { randomBytes } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { q, run, type Row } from "./db";

export const DATA_DIR =
  process.env.BTA_DATA_DIR || path.join(process.cwd(), "data");
export const UPLOAD_DIR = path.join(DATA_DIR, "uploads");

const MEMBER_EXTS = ["jpg", "jpeg", "png", "webp", "pdf"];
export const ADMIN_EXTS = [
  ...MEMBER_EXTS,
  "gif",
  "mp4",
  "mp3",
  "zip",
  "ex4",
  "ex5",
  "mq4",
  "mq5",
  "mqh",
  "ppt",
  "pptx",
  "txt",
  "xlsx",
  "doc",
  "docx",
  "mql",
  "set",
  "dll",
];
const MAX_SIZE = 100 * 1024 * 1024;

export async function saveUpload(
  file: FormDataEntryValue | null,
  allowed: string[] = MEMBER_EXTS
): Promise<string | null> {
  if (!file || typeof file === "string") return null;
  const f = file as File;
  if (!f.size || f.size > MAX_SIZE) return null;
  const ext = (f.name.split(".").pop() || "").toLowerCase();
  if (!allowed.includes(ext)) return null;
  await mkdir(UPLOAD_DIR, { recursive: true });
  const name = `${Date.now()}-${randomBytes(8).toString("hex")}.${ext}`;
  await writeFile(path.join(UPLOAD_DIR, name), Buffer.from(await f.arrayBuffer()));
  return name;
}

export async function unlinkUpload(name: unknown): Promise<void> {
  const raw = String(name || "");
  if (!raw || !/^[a-z0-9-]+\.[a-z0-9]+$/i.test(raw)) return;
  const target = path.resolve(UPLOAD_DIR, raw);
  if (!target.startsWith(UPLOAD_DIR + path.sep)) return;
  await unlink(target).catch(() => {});
}

export async function notify(
  userId: number | null,
  type: string,
  message: string,
  link?: string
): Promise<void> {
  await run(`INSERT INTO notifications (user_id, type, message, link) VALUES (?, ?, ?, ?)`, [
    userId,
    type,
    message,
    link ?? null,
  ]);
}

export async function notifyStaff(
  type: string,
  message: string,
  link?: string,
  roles: string[] = ["admin", "super_admin"]
): Promise<void> {
  const staff = await q(`SELECT id FROM users WHERE role IN (${roles.map(() => "?").join(",")})`, roles);
  for (const s of staff) await notify(s.id as number, type, message, link);
}

export function money(amount: number): string {
  return `$${amount % 1 === 0 ? amount.toFixed(0) : amount.toFixed(2)}`;
}

export function fmtDate(value: unknown): string {
  if (!value) return "—";
  const d = new Date(String(value).replace(" ", "T"));
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function timeAgo(value: unknown): string {
  const d = new Date(String(value).replace(" ", "T")).getTime();
  if (Number.isNaN(d)) return "";
  const mins = Math.floor((Date.now() - d) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (mins < 1440) return `${Math.floor(mins / 60)}h ago`;
  return `${Math.floor(mins / 1440)}d ago`;
}

export type { Row };
