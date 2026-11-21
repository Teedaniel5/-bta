"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { one, q, run } from "@/lib/db";
import { ADMIN_EXTS, notify, saveUpload, unlinkUpload } from "@/lib/files";
import {
  isAdmin,
  canManageCourses,
  canManageSignals,
  canModerate,
  getSessionUser,
  type User,
} from "@/lib/auth";
import { PERIOD_DAYS } from "@/lib/access";

async function staff(): Promise<User> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

function deny(): never {
  redirect("/dashboard?error=You+do+not+have+permission+for+that+action.");
}

async function adminUpload(value: FormDataEntryValue | null): Promise<string | null> {
  return saveUpload(value, ADMIN_EXTS);
}

export async function createProductAction(formData: FormData): Promise<void> {
  const user = await staff();
  if (!isAdmin(user)) deny();
  const title = String(formData.get("title") || "").trim();
  const category = String(formData.get("category") || "ebook");
  const description = String(formData.get("description") || "").trim();
  const price = Number(formData.get("price") || 0);
  const cover = await adminUpload(formData.get("cover"));
  const file = await adminUpload(formData.get("file"));
  if (title.length < 2 || price < 0) redirect("/admin/products?error=Title+and+price+are+required.");
  await run(
    `INSERT INTO products (title, category, description, price, cover_path, preview, file_path, published) VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
    [title, category, description, price, cover, description.slice(0, 280), file]
  );
  revalidatePath("/admin/products");
  revalidatePath("/store");
  redirect("/admin/products?ok=1");
}

export async function updateProductAction(formData: FormData): Promise<void> {
  const user = await staff();
  if (!isAdmin(user)) deny();
  const id = Number(formData.get("id"));
  const title = String(formData.get("title") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const price = Number(formData.get("price") || 0);
  const published = formData.get("published") ? 1 : 0;
  const file = await adminUpload(formData.get("file"));
  if (file) {
    const old = await one(`SELECT file_path FROM products WHERE id = ?`, [id]);
    await unlinkUpload(old?.file_path);
    await run(`UPDATE products SET file_path = ? WHERE id = ?`, [file, id]);
  }
  await run(
    `UPDATE products SET title = ?, description = ?, price = ?, published = ? WHERE id = ?`,
    [title, description, price, published, id]
  );
  revalidatePath("/admin/products");
  revalidatePath("/store");
  redirect("/admin/products?ok=1");
}

export async function reviewOrderAction(formData: FormData): Promise<void> {
  const user = await staff();
  if (!isAdmin(user)) deny();
  const orderId = Number(formData.get("orderId"));
  const decision = String(formData.get("decision") || "");
  const order = await one(`SELECT * FROM orders WHERE id = ?`, [orderId]);
  if (!order) redirect("/admin/orders");
  if (decision === "approve") {
    await run(
      `UPDATE orders SET status = 'approved', approved_by = ?, approved_at = datetime('now') WHERE id = ?`,
      [user.id as number, orderId]
    );
    if (order.item_type === "course" && order.item_id) {
      const exists = await one(
        `SELECT id FROM enrollments WHERE user_id = ? AND course_id = ?`,
        [order.user_id as number, order.item_id as number]
      );
      if (!exists) {
        await run(`INSERT INTO enrollments (user_id, course_id) VALUES (?, ?)`, [
          order.user_id as number,
          order.item_id as number,
        ]);
      }
    }
    if (order.item_type === "subscription" && order.item_id) {
      const sub = await one(`SELECT * FROM subscriptions WHERE id = ?`, [order.item_id as number]);
      if (sub) {
        const days = PERIOD_DAYS[sub.billing_period as string] || 30;
        const existing = await one(
          `SELECT id, expires_at FROM subscriptions WHERE user_id = ? AND plan = ? AND status = 'active' AND expires_at > datetime('now')`,
          [order.user_id as number, sub.plan as string]
        );
        const base = existing?.expires_at
          ? new Date(String(existing.expires_at).replace(" ", "T")).getTime()
          : Date.now();
        const startIso = new Date().toISOString().replace("T", " ").slice(0, 19);
        const expireIso = new Date(base + days * 86400000)
          .toISOString()
          .replace("T", " ")
          .slice(0, 19);
        await run(
          `UPDATE subscriptions SET status = 'active', started_at = ?, expires_at = ? WHERE id = ?`,
          [startIso, expireIso, sub.id as number]
        );
        if (existing && existing.id !== sub.id) {
          await run(`UPDATE subscriptions SET status = 'expired' WHERE id = ?`, [Number(existing.id)]);
        }
      }
    }
    await notify(
      order.user_id as number,
      "payment_approved",
      `Your payment for "${order.description}" was approved. Access granted!`,
      "/library"
    );
  } else if (decision === "reject") {
    await run(
      `UPDATE orders SET status = 'rejected', approved_by = ?, approved_at = datetime('now') WHERE id = ?`,
      [user.id as number, orderId]
    );
    await notify(
      order.user_id as number,
      "payment_rejected",
      `Your payment for "${order.description}" was rejected. Please contact our WhatsApp support.`,
      "/library"
    );
  }
  revalidatePath("/admin/orders");
  redirect("/admin/orders?ok=1");
}

export async function createCourseAction(formData: FormData): Promise<void> {
  const user = await staff();
  if (!canManageCourses(user)) deny();
  const title = String(formData.get("title") || "").trim();
  const category = String(formData.get("category") || "beginner");
  const description = String(formData.get("description") || "").trim();
  const price = Number(formData.get("price") || 0);
  const cover = await adminUpload(formData.get("cover"));
  if (title.length < 3) redirect("/admin/courses?error=Course+title+is+required.");
  await run(
    `INSERT INTO courses (title, category, description, price, cover_path, published) VALUES (?, ?, ?, ?, ?, 1)`,
    [title, category, description, price, cover]
  );
  revalidatePath("/admin/courses");
  revalidatePath("/courses");
  redirect("/admin/courses?ok=1");
}

export async function addModuleAction(formData: FormData): Promise<void> {
  const user = await staff();
  if (!canManageCourses(user)) deny();
  const courseId = Number(formData.get("courseId"));
  const title = String(formData.get("title") || "").trim();
  if (title.length < 2) redirect(`/admin/courses?error=Module+title+is+required.`);
  const pos = await one(`SELECT COUNT(*) AS c FROM modules WHERE course_id = ?`, [courseId]);
  await run(`INSERT INTO modules (course_id, title, position) VALUES (?, ?, ?)`, [
    courseId,
    title,
    Number(pos?.c ?? 0),
  ]);
  revalidatePath("/admin/courses");
  redirect(`/admin/courses?course=${courseId}`);
}

export async function addLessonAction(formData: FormData): Promise<void> {
  const user = await staff();
  if (!canManageCourses(user)) deny();
  const moduleId = Number(formData.get("moduleId"));
  const courseId = Number(formData.get("courseId"));
  const title = String(formData.get("title") || "").trim();
  const body = String(formData.get("body") || "").trim();
  const videoUrl = String(formData.get("videoUrl") || "").trim();
  const file = await adminUpload(formData.get("file"));
  if (title.length < 2)
    redirect(`/admin/courses?course=${courseId}&error=Lesson+title+is+required.`);
  const pos = await one(`SELECT COUNT(*) AS c FROM lessons WHERE module_id = ?`, [moduleId]);
  await run(
    `INSERT INTO lessons (module_id, title, body, video_url, file_path, position) VALUES (?, ?, ?, ?, ?, ?)`,
    [moduleId, title, body, videoUrl, file, Number(pos?.c ?? 0)]
  );
  revalidatePath("/admin/courses");
  redirect(`/admin/courses?course=${courseId}`);
}

export async function deleteLessonAction(formData: FormData): Promise<void> {
  const user = await staff();
  if (!canManageCourses(user)) deny();
  const id = Number(formData.get("id"));
  const courseId = Number(formData.get("courseId"));
  const lesson = await one(`SELECT file_path FROM lessons WHERE id = ?`, [id]);
  await unlinkUpload(lesson?.file_path);
  await run(`DELETE FROM lesson_progress WHERE lesson_id = ?`, [id]);
  await run(`DELETE FROM lessons WHERE id = ?`, [id]);
  revalidatePath("/admin/courses");
  redirect(`/admin/courses?course=${courseId}`);
}

export async function deleteModuleAction(formData: FormData): Promise<void> {
  const user = await staff();
  if (!canManageCourses(user)) deny();
  const id = Number(formData.get("id"));
  const courseId = Number(formData.get("courseId"));
  const lessons = await q(`SELECT id, file_path FROM lessons WHERE module_id = ?`, [id]);
  for (const l of lessons) await unlinkUpload(l.file_path);
  for (const l of lessons)
    await run(`DELETE FROM lesson_progress WHERE lesson_id = ?`, [l.id as number]);
  await run(`DELETE FROM lessons WHERE module_id = ?`, [id]);
  await run(`DELETE FROM modules WHERE id = ?`, [id]);
  revalidatePath("/admin/courses");
  redirect(`/admin/courses?course=${courseId}`);
}

export async function deleteCourseAction(formData: FormData): Promise<void> {
  const user = await staff();
  if (!canManageCourses(user)) deny();
  const id = Number(formData.get("id"));
  const course = await one(`SELECT cover_path FROM courses WHERE id = ?`, [id]);
  const lessons = await q(
    `SELECT l.id, l.file_path FROM lessons l JOIN modules m ON m.id = l.module_id WHERE m.course_id = ?`,
    [id]
  );
  for (const l of lessons) await unlinkUpload(l.file_path);
  for (const l of lessons)
    await run(`DELETE FROM lesson_progress WHERE lesson_id = ?`, [l.id as number]);
  await unlinkUpload(course?.cover_path);
  await run(
    `DELETE FROM lessons WHERE module_id IN (SELECT id FROM modules WHERE course_id = ?)`,
    [id]
  );
  await run(`DELETE FROM modules WHERE course_id = ?`, [id]);
  await run(`DELETE FROM enrollments WHERE course_id = ?`, [id]);
  await run(`DELETE FROM courses WHERE id = ?`, [id]);
  revalidatePath("/admin/courses");
  revalidatePath("/courses");
  redirect("/admin/courses?ok=1");
}

export async function deleteProductAction(formData: FormData): Promise<void> {
  const user = await staff();
  if (!isAdmin(user)) deny();
  const id = Number(formData.get("id"));
  const product = await one(`SELECT cover_path, file_path FROM products WHERE id = ?`, [id]);
  await unlinkUpload(product?.cover_path);
  await unlinkUpload(product?.file_path);
  await run(`DELETE FROM reviews WHERE product_id = ?`, [id]);
  await run(`DELETE FROM products WHERE id = ?`, [id]);
  revalidatePath("/admin/products");
  revalidatePath("/store");
  redirect("/admin/products?ok=1");
}

export async function deleteSignalAction(formData: FormData): Promise<void> {
  const user = await staff();
  if (!canManageSignals(user)) deny();
  const id = Number(formData.get("id"));
  const signal = await one(`SELECT image_path FROM signals WHERE id = ?`, [id]);
  await unlinkUpload(signal?.image_path);
  await run(`DELETE FROM signals WHERE id = ?`, [id]);
  revalidatePath("/admin/signals");
  revalidatePath("/signals");
  redirect("/admin/signals?ok=1");
}

const DELETABLE_FIELDS: Record<string, { table: string; field: string }> = {
  product_cover: { table: "products", field: "cover_path" },
  product_file: { table: "products", field: "file_path" },
  course_cover: { table: "courses", field: "cover_path" },
  signal_chart: { table: "signals", field: "image_path" },
  resource_file: { table: "resources", field: "file_path" },
  post_image: { table: "posts", field: "image_path" },
};

export async function deleteUploadAction(formData: FormData): Promise<void> {
  const user = await staff();
  if (!isAdmin(user)) deny();
  const key = String(formData.get("target") || "");
  const id = Number(formData.get("id"));
  const entry = DELETABLE_FIELDS[key];
  if (!entry) redirect("/admin?error=Unknown+upload.");
  const row = await one(`SELECT ${entry.field} AS f FROM ${entry.table} WHERE id = ?`, [id]);
  await unlinkUpload(row?.f);
  await run(`UPDATE ${entry.table} SET ${entry.field} = NULL WHERE id = ?`, [id]);
  revalidatePath("/admin/products");
  revalidatePath("/admin/courses");
  revalidatePath("/admin/signals");
  revalidatePath("/admin/resources");
}

export async function publishSignalAction(formData: FormData): Promise<void> {
  const user = await staff();
  if (!canManageSignals(user)) deny();
  const instrument = String(formData.get("instrument") || "").trim().toUpperCase();
  const direction = String(formData.get("direction") || "buy");
  const entry = String(formData.get("entry") || "").trim();
  const stopLoss = String(formData.get("stopLoss") || "").trim();
  const takeProfits = String(formData.get("takeProfits") || "").trim();
  const rr = String(formData.get("rr") || "").trim();
  const timeframe = String(formData.get("timeframe") || "").trim();
  const rationale = String(formData.get("rationale") || "").trim();
  const tier = String(formData.get("tier") || "pro");
  const image = await adminUpload(formData.get("chart"));
  if (!instrument || !["buy", "sell"].includes(direction) || !entry) {
    redirect("/admin/signals?error=Instrument,+direction+and+entry+are+required.");
  }
  await run(
    `INSERT INTO signals (instrument, direction, entry, stop_loss, take_profits, rr, timeframe, rationale, image_path, tier) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [instrument, direction, entry, stopLoss, takeProfits, rr, timeframe, rationale, image, tier]
  );
  const label = tier === "free" ? "Free" : tier === "vip" ? "VIP" : "Premium";
  await notify(
    null,
    "signal_new",
    `New ${label} ${direction.toUpperCase()} signal published for ${instrument}.`,
    "/signals"
  );
  revalidatePath("/admin/signals");
  revalidatePath("/signals");
  redirect("/admin/signals?ok=1");
}

export async function updateSignalAction(formData: FormData): Promise<void> {
  const user = await staff();
  if (!canManageSignals(user)) deny();
  const id = Number(formData.get("id"));
  const status = String(formData.get("status") || "");
  const result = String(formData.get("result") || "") || null;
  if (!["active", "closed", "cancelled"].includes(status)) {
    redirect("/admin/signals?error=Invalid+status.");
  }
  await run(
    `UPDATE signals SET status = ?, result = ?, closed_at = CASE WHEN ? = 'active' THEN NULL ELSE datetime('now') END WHERE id = ?`,
    [status, result, status, id]
  );
  await notify(null, `signal_${status}`, `A signal was marked ${status}.`, "/signals");
  revalidatePath("/admin/signals");
  revalidatePath("/signals");
  redirect("/admin/signals?ok=1");
}

export async function memberAdminAction(formData: FormData): Promise<void> {
  const staffUser = await staff();
  if (!isAdmin(staffUser)) deny();
  const userId = Number(formData.get("userId"));
  const op = String(formData.get("op") || "");
  const target = await one(`SELECT * FROM users WHERE id = ?`, [userId]);
  if (!target) redirect("/admin/members");
  if (target.role === "super_admin" && staffUser.role !== "super_admin") deny();
  if (op === "suspend" || op === "activate") {
    await run(`UPDATE users SET status = ? WHERE id = ?`, [
      op === "suspend" ? "suspended" : "active",
      userId,
    ]);
  } else if (["member", "moderator", "instructor", "provider", "admin"].includes(op)) {
    await run(`UPDATE users SET role = ? WHERE id = ?`, [op, userId]);
  } else if (op === "grant_pro" || op === "grant_vip") {
    const plan = op === "grant_pro" ? "signals_pro" : "vip_elite";
    const days = Number(formData.get("days") || 30);
    const existing = await one(
      `SELECT id, expires_at FROM subscriptions WHERE user_id = ? AND plan = ? AND status = 'active' AND expires_at > datetime('now')`,
      [userId, plan]
    );
    const base = existing?.expires_at
      ? new Date(String(existing.expires_at).replace(" ", "T")).getTime()
      : Date.now();
    const expireIso = new Date(base + days * 86400000)
      .toISOString()
      .replace("T", " ")
      .slice(0, 19);
    if (existing) {
      await run(`UPDATE subscriptions SET expires_at = ? WHERE id = ?`, [
        expireIso,
        existing.id as number,
      ]);
    } else {
      await run(
        `INSERT INTO subscriptions (user_id, plan, billing_period, status, started_at, expires_at) VALUES (?, ?, 'admin_grant', 'active', datetime('now'), ?)`,
        [userId, plan, expireIso]
      );
    }
    await notify(
      userId,
      "membership",
      `Your ${plan === "vip_elite" ? "VIP Elite" : "Signals Pro"} access was granted until ${expireIso.slice(0, 10)}.`,
      "/dashboard"
    );
  } else if (op === "revoke_sub") {
    const subId = Number(formData.get("subId"));
    await run(`UPDATE subscriptions SET status = 'cancelled' WHERE id = ?`, [subId]);
    await notify(
      userId,
      "membership_revoked",
      "A subscription on your account was revoked by the administrators.",
      "/dashboard"
    );
  }
  revalidatePath("/admin/members");
  redirect("/admin/members?ok=1");
}

export async function settingsAction(formData: FormData): Promise<void> {
  const user = await staff();
  if (!isAdmin(user)) deny();
  const keys = [
    "whatsapp_primary",
    "whatsapp_secondary",
    "whatsapp_primary_link",
    "whatsapp_secondary_link",
    "payment_instructions",
  ];
  for (const key of keys) {
    if (formData.has(key)) {
      await run(`UPDATE settings SET value = ? WHERE key = ?`, [
        String(formData.get(key) || ""),
        key,
      ]);
    }
  }
  revalidatePath("/", "layout");
  redirect("/admin/settings?ok=1");
}

export async function moderateAction(formData: FormData): Promise<void> {
  const staffUser = await staff();
  if (!canModerate(staffUser)) deny();
  const op = String(formData.get("op") || "");
  const id = Number(formData.get("id"));
  if (op === "delete_post") {
    const post = await one(`SELECT image_path FROM posts WHERE id = ?`, [id]);
    await unlinkUpload(post?.image_path);
    await run(`DELETE FROM post_likes WHERE post_id = ?`, [id]);
    await run(`DELETE FROM replies WHERE post_id = ?`, [id]);
    await run(`DELETE FROM posts WHERE id = ?`, [id]);
  } else if (op === "delete_reply") {
    await run(`DELETE FROM replies WHERE id = ?`, [id]);
  } else if (op === "toggle_pin") {
    const post = await one(`SELECT pinned FROM posts WHERE id = ?`, [id]);
    await run(`UPDATE posts SET pinned = ? WHERE id = ?`, [post?.pinned ? 0 : 1, id]);
  } else if (op === "ban_user") {
    await run(`UPDATE users SET status = 'suspended' WHERE id = ?`, [id]);
  } else if (op === "unban_user") {
    await run(`UPDATE users SET status = 'active' WHERE id = ?`, [id]);
  }
  revalidatePath("/admin/community");
  redirect("/admin/community?ok=1");
}

export async function createResourceAction(formData: FormData): Promise<void> {
  const staffUser = await staff();
  if (!isAdmin(staffUser)) deny();
  const title = String(formData.get("title") || "").trim();
  const type = String(formData.get("type") || "article");
  const body = String(formData.get("body") || "").trim();
  const file = await adminUpload(formData.get("file"));
  if (title.length < 3) redirect("/admin/resources?error=Title+is+required.");
  await run(`INSERT INTO resources (title, type, body, file_path) VALUES (?, ?, ?, ?)`, [
    title,
    type,
    body,
    file,
  ]);
  await notify(null, "resources_new", `New free resource published: ${title}.`, "/resources");
  revalidatePath("/admin/resources");
  revalidatePath("/resources");
  redirect("/admin/resources?ok=1");
}

export async function deleteResourceAction(formData: FormData): Promise<void> {
  const staffUser = await staff();
  if (!isAdmin(staffUser)) deny();
  const id = Number(formData.get("id"));
  const resource = await one(`SELECT file_path FROM resources WHERE id = ?`, [id]);
  await unlinkUpload(resource?.file_path);
  await run(`DELETE FROM resources WHERE id = ?`, [id]);
  revalidatePath("/admin/resources");
  revalidatePath("/resources");
  redirect("/admin/resources?ok=1");
}

export async function handleContactAction(formData: FormData): Promise<void> {
  const staffUser = await staff();
  if (!isAdmin(staffUser)) deny();
  const id = Number(formData.get("id"));
  await run(`UPDATE contact_messages SET handled = 1 WHERE id = ?`, [id]);
  revalidatePath("/admin/messages");
  redirect("/admin/messages?ok=1");
}

export async function cancelSubscriptionAction(formData: FormData): Promise<void> {
  const user = await staff();
  const subId = Number(formData.get("subId"));
  const sub = await one(`SELECT * FROM subscriptions WHERE id = ? AND user_id = ?`, [
    subId,
    user.id as number,
  ]);
  if (!sub) redirect("/library");
  await run(`UPDATE subscriptions SET status = 'cancelled' WHERE id = ?`, [subId]);
  await notify(
    user.id as number,
    "subscription_cancelled",
    "Your subscription was cancelled. You keep access until the end of the paid period.",
    "/library"
  );
  revalidatePath("/library");
  redirect("/library?cancelled=1");
}
