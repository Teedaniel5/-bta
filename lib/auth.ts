import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { one, run, type Row } from "./db";

export type User = Row & {
  id: number;
  email: string;
  name: string;
  role: string;
  status: string;
  phone: string | null;
};

const COOKIE = "bta_session";
const SESSION_DAYS = 30;

const limitMap = new Map<string, { count: number; reset: number }>();

export function rateLimit(key: string, max = 10, windowMs = 60_000): boolean {
  const now = Date.now();
  const entry = limitMap.get(key);
  if (!entry || now > entry.reset) {
    limitMap.set(key, { count: 1, reset: now + windowMs });
    return true;
  }
  entry.count += 1;
  return entry.count <= max;
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const candidate = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}

export async function createSession(userId: number): Promise<void> {
  const token = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + SESSION_DAYS * 24 * 3600 * 1000)
    .toISOString()
    .replace("T", " ")
    .slice(0, 19);
  await run(`INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)`, [
    token,
    userId,
    expires,
  ]);
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: new Date(Date.now() + SESSION_DAYS * 24 * 3600 * 1000),
    path: "/",
  });
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) await run(`DELETE FROM sessions WHERE token = ?`, [token]);
  jar.delete(COOKIE);
}

export async function getSessionUser(): Promise<User | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  const row = (await one(
    `SELECT u.*, s.expires_at FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ?`,
    [token]
  )) as User | null;
  if (!row) return null;
  if (new Date(row.expires_at as string).getTime() < Date.now()) return null;
  if (row.status !== "active") return null;
  return row;
}

export async function requireUser(): Promise<User> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireStaff(): Promise<User> {
  const user = await requireUser();
  if (!isAdmin(user)) redirect("/dashboard");
  return user;
}

export function isAdmin(user: User): boolean {
  return user.role === "admin" || user.role === "super_admin";
}

export function canModerate(user: User): boolean {
  return isAdmin(user) || user.role === "moderator";
}

export function canManageSignals(user: User): boolean {
  return isAdmin(user) || user.role === "provider";
}

export function canManageCourses(user: User): boolean {
  return isAdmin(user) || user.role === "instructor";
}
