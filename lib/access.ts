import { one, q, type Row } from "./db";
import { isAdmin, type User } from "./auth";

export type MembershipLevel = "free" | "student" | "pro" | "vip";

export const PLANS: Record<
  string,
  { label: string; prices: Record<string, number> }
> = {
  signals_pro: {
    label: "Signals Pro",
    prices: { monthly: 15, quarterly: 40, annual: 120 },
  },
  vip_elite: {
    label: "VIP Elite",
    prices: { monthly: 50, quarterly: 135, annual: 450 },
  },
};

export const PERIOD_DAYS: Record<string, number> = {
  monthly: 30,
  quarterly: 90,
  annual: 365,
};

export async function activeSubscription(
  userId: number,
  plan: string
): Promise<Row | null> {
  return one(
    `SELECT * FROM subscriptions WHERE user_id = ? AND plan = ? AND status = 'active' AND expires_at > datetime('now') ORDER BY expires_at DESC LIMIT 1`,
    [userId, plan]
  );
}

export async function activeSubscriptions(userId: number): Promise<Row[]> {
  return q(
    `SELECT * FROM subscriptions WHERE user_id = ? AND status = 'active' AND expires_at > datetime('now')`,
    [userId]
  );
}

export async function membershipLevel(user: User): Promise<MembershipLevel> {
  if (!user) return "free";
  const vip = await activeSubscription(user.id as number, "vip_elite");
  if (vip) return "vip";
  const pro = await activeSubscription(user.id as number, "signals_pro");
  if (pro) return "pro";
  const bought = await one(
    `SELECT COUNT(*) AS c FROM orders WHERE user_id = ? AND status = 'approved' AND item_type IN ('product','course')`,
    [user.id as number]
  );
  const enrolled = await one(`SELECT COUNT(*) AS c FROM enrollments WHERE user_id = ?`, [
    user.id as number,
  ]);
  const total = Number(bought?.c ?? 0) + Number(enrolled?.c ?? 0);
  return total > 0 ? "student" : "free";
}

export async function canAccessRoom(
  user: User | null,
  roomAccess: string
): Promise<boolean> {
  if (roomAccess === "public") return true;
  if (!user) return false;
  if (roomAccess === "member") return true;
  if (isAdmin(user) || user.role === "moderator") return true;
  if (roomAccess === "student") {
    const count = await one(`SELECT COUNT(*) AS c FROM enrollments WHERE user_id = ?`, [
      user.id as number,
    ]);
    return Number(count?.c ?? 0) > 0;
  }
  if (roomAccess === "vip") {
    const vip = await activeSubscription(user.id as number, "vip_elite");
    return !!vip;
  }
  return false;
}

export async function hasProduct(user: User, productId: number): Promise<boolean> {
  const order = await one(
    `SELECT id FROM orders WHERE user_id = ? AND item_type = 'product' AND item_id = ? AND status = 'approved'`,
    [user.id as number, productId]
  );
  return !!order || isAdmin(user);
}

export async function hasCourseAccess(user: User, courseId: number): Promise<boolean> {
  if (isAdmin(user)) return true;
  const enrollment = await one(
    `SELECT id FROM enrollments WHERE user_id = ? AND course_id = ?`,
    [user.id as number, courseId]
  );
  if (enrollment) return true;
  const direct = await one(
    `SELECT id FROM orders WHERE user_id = ? AND item_type = 'course' AND item_id = ? AND status = 'approved'`,
    [user.id as number, courseId]
  );
  return !!direct;
}
