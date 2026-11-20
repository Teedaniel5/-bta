"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { one, q, run } from "@/lib/db";
import {
  createSession,
  destroySession,
  getSessionUser,
  hashPassword,
  rateLimit,
  verifyPassword,
  type User,
} from "@/lib/auth";
import { PLANS, PERIOD_DAYS, canAccessRoom, hasProduct } from "@/lib/access";
import { notify, notifyStaff, saveUpload } from "@/lib/files";

async function clientKey(scope: string): Promise<string> {
  const h = await headers();
  return `${scope}:${h.get("x-forwarded-for")?.split(",")[0]?.trim() || "local"}`;
}

export async function registerAction(formData: FormData): Promise<void> {
  if (!(await rateLimit(await clientKey("register"), 5))) {
    redirect("/register?error=Too+many+attempts.+Try+again+in+a+minute.");
  }
  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const phone = String(formData.get("phone") || "").trim();
  const password = String(formData.get("password") || "");
  if (name.length < 2 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || password.length < 8) {
    redirect(
      "/register?error=Enter+a+valid+name+and+email,+and+a+password+of+at+least+8+characters."
    );
  }
  const existing = await one(`SELECT id FROM users WHERE email = ?`, [email]);
  if (existing) redirect("/register?error=An+account+with+this+email+already+exists.");
  const count = await one(`SELECT COUNT(*) AS c FROM users`);
  const isFirst = Number(count?.c ?? 0) === 0;
  const role =
    isFirst || email === (process.env.SUPER_ADMIN_EMAIL || "").toLowerCase()
      ? "super_admin"
      : "member";
  const result = await run(
    `INSERT INTO users (email, password_hash, name, phone, role) VALUES (?, ?, ?, ?, ?)`,
    [email, hashPassword(password), name, phone, role]
  );
  const user = await one(`SELECT id, role FROM users WHERE email = ?`, [email]);
  if (!user) redirect("/register?error=Could+not+create+account.");
  await notify(
    user.id as number,
    "welcome",
    "Welcome to Brilliant Trading Academy! Explore free resources and the community.",
    "/dashboard"
  );
  await createSession(user.id as number);
  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function loginAction(formData: FormData): Promise<void> {
  const key = await clientKey("login");
  if (!(await rateLimit(key, 8))) {
    redirect("/login?error=Too+many+login+attempts.+Try+again+in+a+minute.");
  }
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const user = (await one(`SELECT * FROM users WHERE email = ?`, [
    email,
  ])) as User | null;
  if (!user || !verifyPassword(password, user.password_hash as string)) {
    redirect("/login?error=Invalid+email+or+password.");
  }
  if (user.status !== "active") {
    redirect("/login?error=This+account+has+been+suspended.+Contact+support.");
  }
  await createSession(user.id as number);
  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  revalidatePath("/", "layout");
  redirect("/");
}

export async function buyAction(formData: FormData): Promise<void> {
  const user = await getSessionUser();
  if (!user) redirect(`/login?next=/store`);
  const itemType = String(formData.get("itemType") || "");
  const itemId = Number(formData.get("itemId"));
  if (itemType === "product") {
    const product = await one(`SELECT * FROM products WHERE id = ? AND published = 1`, [itemId]);
    if (!product) redirect("/store");
    const existing = await hasProduct(user, itemId);
    if (existing) redirect("/library");
    await run(
      `INSERT INTO orders (user_id, item_type, item_id, description, amount) VALUES (?, 'product', ?, ?, ?)`,
      [user.id as number, itemId, product.title as string, product.price as number]
    );
  } else if (itemType === "course") {
    const course = await one(`SELECT * FROM courses WHERE id = ? AND published = 1`, [itemId]);
    if (!course) redirect("/courses");
    await run(
      `INSERT INTO orders (user_id, item_type, item_id, description, amount) VALUES (?, 'course', ?, ?, ?)`,
      [user.id as number, itemId, course.title as string, course.price as number]
    );
  } else if (itemType === "subscription") {
    const plan = String(formData.get("plan") || "");
    const period = String(formData.get("period") || "");
    if (!PLANS[plan] || !PERIOD_DAYS[period]) redirect("/membership");
    const description = `${PLANS[plan].label} — ${period}`;
    await run(
      `INSERT INTO subscriptions (user_id, plan, billing_period, status) VALUES (?, ?, ?, 'awaiting_payment')`,
      [user.id as number, plan, period]
    );
    const sub = await one(
      `SELECT id FROM subscriptions WHERE user_id = ? ORDER BY id DESC LIMIT 1`,
      [user.id as number]
    );
    const subId: number | null = sub ? Number(sub.id) : null;
    await run(
      `INSERT INTO orders (user_id, item_type, item_id, description, amount) VALUES (?, 'subscription', ?, ?, ?)`,
      [user.id as number, subId, description, PLANS[plan].prices[period]]
    );
  } else {
    redirect("/");
  }
  const order = await one(
    `SELECT id FROM orders WHERE user_id = ? ORDER BY id DESC LIMIT 1`,
    [user.id as number]
  );
  revalidatePath("/library");
  redirect(`/checkout/order/${order?.id}`);
}

export async function submitProofAction(formData: FormData): Promise<void> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const orderId = Number(formData.get("orderId"));
  const order = await one(
    `SELECT * FROM orders WHERE id = ? AND user_id = ?`,
    [orderId, user.id as number]
  );
  if (!order || order.status !== "awaiting_payment") redirect("/library");
  const method = String(formData.get("method") || "");
  const reference = String(formData.get("reference") || "").trim();
  const proof = await saveUpload(formData.get("proof"), ["jpg", "jpeg", "png", "webp", "pdf"]);
  if (!method || !reference || !proof) {
    redirect(`/checkout/order/${orderId}?error=Fill+in+all+fields+and+upload+a+valid+file.`);
  }
  await run(
    `UPDATE orders SET method = ?, reference = ?, proof_path = ?, status = 'verifying' WHERE id = ?`,
    [method, reference, proof, orderId]
  );
  await notifyStaff(
    "payment_verifying",
    `${user.name} submitted payment proof for order #${orderId} (${order.description}).`,
    `/admin/orders`
  );
  await notify(
    user.id as number,
    "payment",
    "We received your payment proof. Access is granted once an administrator verifies it.",
    "/library"
  );
  revalidatePath("/library");
  redirect("/library?submitted=1");
}

export async function contactAction(formData: FormData): Promise<void> {
  if (!(await rateLimit(await clientKey("contact"), 5))) {
    redirect("/contact?error=Too+many+messages.+Try+again+later.");
  }
  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const body = String(formData.get("body") || "").trim();
  if (!name || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || body.length < 5) {
    redirect("/contact?error=Please+fill+in+all+fields.");
  }
  await run(`INSERT INTO contact_messages (name, email, body) VALUES (?, ?, ?)`, [
    name,
    email,
    body,
  ]);
  await notifyStaff("contact", `New message from ${name} <${email}>.`, `/admin/messages`);
  redirect("/contact?sent=1");
}

export async function toggleLessonProgressAction(formData: FormData): Promise<void> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const lessonId = Number(formData.get("lessonId"));
  const courseId = Number(formData.get("courseId"));
  const enrollment = await one(
    `SELECT id FROM enrollments WHERE user_id = ? AND course_id = ?`,
    [user.id as number, courseId]
  );
  if (!enrollment) redirect(`/courses/${courseId}`);
  const done = await one(
    `SELECT l.lesson_id AS id FROM lesson_progress l WHERE l.user_id = ? AND l.lesson_id = ?`,
    [user.id as number, lessonId]
  );
  if (done) {
    await run(`DELETE FROM lesson_progress WHERE user_id = ? AND lesson_id = ?`, [
      user.id as number,
      lessonId,
    ]);
  } else {
    await run(`INSERT INTO lesson_progress (user_id, lesson_id) VALUES (?, ?)`, [
      user.id as number,
      lessonId,
    ]);
  }
  revalidatePath(`/courses/${courseId}`);
}

export async function newPostAction(formData: FormData): Promise<void> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const roomId = Number(formData.get("roomId"));
  const room = await one(`SELECT * FROM rooms WHERE id = ?`, [roomId]);
  if (!room || !(await canAccessRoom(user, room.access as string))) {
    redirect("/community?error=You+do+not+have+access+to+that+room.");
  }
  const title = String(formData.get("title") || "").trim();
  const body = String(formData.get("body") || "").trim();
  const image = await saveUpload(formData.get("image"), ["jpg", "jpeg", "png", "webp", "gif"]);
  if (title.length < 3 || body.length < 3) {
    redirect(`/community/${room.slug as string}?error=Title+and+message+are+required.`);
  }
  await run(
    `INSERT INTO posts (room_id, user_id, title, body, image_path) VALUES (?, ?, ?, ?, ?)`,
    [roomId, user.id as number, title, body, image]
  );
  revalidatePath(`/community/${room.slug as string}`);
  redirect(`/community/${room.slug as string}`);
}

export async function replyAction(formData: FormData): Promise<void> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const postId = Number(formData.get("postId"));
  const body = String(formData.get("body") || "").trim();
  const post = await one(
    `SELECT p.*, r.slug AS room_slug, r.access AS room_access FROM posts p JOIN rooms r ON r.id = p.room_id WHERE p.id = ?`,
    [postId]
  );
  if (!post || !(await canAccessRoom(user, post.room_access as string))) {
    redirect("/community?error=You+do+not+have+access+to+that+discussion.");
  }
  if (body.length < 1) redirect(`/community/post/${postId}`);
  await run(`INSERT INTO replies (post_id, user_id, body) VALUES (?, ?, ?)`, [
    postId,
    user.id as number,
    body,
  ]);
  if (post.user_id !== user.id) {
    await notify(
      post.user_id as number,
      "reply",
      `${user.name} replied to your post "${post.title}".`,
      `/community/post/${postId}`
    );
  }
  revalidatePath(`/community/post/${postId}`);
  redirect(`/community/post/${postId}`);
}

export async function likeAction(formData: FormData): Promise<void> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const postId = Number(formData.get("postId"));
  const liked = await one(`SELECT 1 AS x FROM post_likes WHERE post_id = ? AND user_id = ?`, [
    postId,
    user.id as number,
  ]);
  if (liked) {
    await run(`DELETE FROM post_likes WHERE post_id = ? AND user_id = ?`, [
      postId,
      user.id as number,
    ]);
  } else {
    await run(`INSERT INTO post_likes (post_id, user_id) VALUES (?, ?)`, [
      postId,
      user.id as number,
    ]);
  }
  const post = await one(`SELECT r.slug AS room_slug FROM posts p JOIN rooms r ON r.id = p.room_id WHERE p.id = ?`, [postId]);
  revalidatePath(`/community/post/${postId}`);
  redirect(`/community/post/${postId}`);
}

export async function reviewProductAction(formData: FormData): Promise<void> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const productId = Number(formData.get("productId"));
  const rating = Math.min(5, Math.max(1, Number(formData.get("rating") || 0)));
  const body = String(formData.get("body") || "").trim().slice(0, 1000);
  if (!(await hasProduct(user, productId))) {
    redirect(`/store/${productId}?error=Only+customers+who+paid+for+this+product+can+review+it.`);
  }
  if (!rating || body.length < 3) {
    redirect(`/store/${productId}?error=Provide+a+rating+and+a+short+review.`);
  }
  const existing = await one(
    `SELECT id FROM reviews WHERE product_id = ? AND user_id = ?`,
    [productId, user.id as number]
  );
  if (existing) {
    await run(`UPDATE reviews SET rating = ?, body = ? WHERE id = ?`, [
      rating,
      body,
      existing.id as number,
    ]);
  } else {
    await run(`INSERT INTO reviews (product_id, user_id, rating, body) VALUES (?, ?, ?, ?)`, [
      productId,
      user.id as number,
      rating,
      body,
    ]);
  }
  revalidatePath(`/store/${productId}`);
  redirect(`/store/${productId}`);
}
