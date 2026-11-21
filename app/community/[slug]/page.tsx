import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { one, q } from "@/lib/db";
import { newPostAction } from "@/app/actions";
import { getSessionUser } from "@/lib/auth";
import { canAccessRoom } from "@/lib/access";
import { fmtDate, timeAgo } from "@/lib/files";

export const metadata = { title: "Community" };

export default async function RoomPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ error?: string; q?: string }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const room = await one(`SELECT * FROM rooms WHERE slug = ?`, [slug]);
  if (!room) notFound();
  const user = await getSessionUser();
  const access = await canAccessRoom(user, room.access as string);
  if (!access) notFound();

  const search = (sp.q || "").trim();
  const posts = search
    ? await q(
        `SELECT p.*, u.name AS author, (SELECT COUNT(*) FROM post_likes pl WHERE pl.post_id = p.id) AS likes, (SELECT COUNT(*) FROM replies r WHERE r.post_id = p.id) AS reply_count
         FROM posts p JOIN users u ON u.id = p.user_id
         WHERE p.room_id = ? AND (p.title LIKE ? OR p.body LIKE ?)
         ORDER BY p.pinned DESC, p.created_at DESC`,
        [room.id as number, `%${search}%`, `%${search}%`]
      )
    : await q(
        `SELECT p.*, u.name AS author, (SELECT COUNT(*) FROM post_likes pl WHERE pl.post_id = p.id) AS likes, (SELECT COUNT(*) FROM replies r WHERE r.post_id = p.id) AS reply_count
         FROM posts p JOIN users u ON u.id = p.user_id
         WHERE p.room_id = ? ORDER BY p.pinned DESC, p.created_at DESC`,
        [room.id as number]
      );

  return (
    <div className="container">
      <Link href="/community" className="hero-alt" style={{ display: "inline-block" }}>
        ← All rooms
      </Link>
      <h1 className="page-title" style={{ marginTop: "0.6rem" }}>
        {String(room.name)}
      </h1>
      <p className="page-sub">{String(room.description)}</p>
      {sp.error && <div className="msg-banner msg-err">{sp.error}</div>}

      <div className="panel">
        <h2>Start a discussion</h2>
        <form className="stack" action={newPostAction}>
          <input type="hidden" name="roomId" value={String(room.id)} />
          <label className="field">
            Title
            <input name="title" required minLength={3} placeholder="What do you want to discuss?" />
          </label>
          <label className="field">
            Message
            <textarea name="body" rows={4} required minLength={3} />
          </label>
          <label className="field">
            Chart screenshot (optional)
            <input type="file" name="image" accept=".jpg,.jpeg,.png,.webp,.gif" />
          </label>
          <button className="btn-gold-lg btn-lg" type="submit" disabled={!user}>
            {user ? "Post discussion" : "Login to post"}
          </button>
        </form>
        {!user && (
          <p className="hero-alt">
            <Link href="/login">Login</Link> or{" "}
            <Link href="/register">create a free account</Link> to join the discussion.
          </p>
        )}
      </div>

      <form style={{ margin: "1.4rem 0", display: "flex", gap: "0.5rem", maxWidth: 480 }} action={`/community/${slug}`}>
        <input name="q" defaultValue={search} placeholder="Search discussions…" aria-label="Search" />
        <button className="btn" type="submit">
          Search
        </button>
      </form>

      <div className="grid grid-2">
        {posts.length === 0 && (
          <div className="card">
            <p>{search ? "No discussions matched your search." : "No discussions yet — be the first to post."}</p>
          </div>
        )}
        {posts.map((p) => (
          <div className="card" key={String(p.id)}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem" }}>
              <b>{String(p.title)}</b>
              {!!p.pinned ? <span className="chip gold">pinned</span> : null}
            </div>
            <p style={{ color: "var(--muted)", fontSize: "0.78rem", marginTop: "0.3rem" }}>
              by <b style={{ color: "var(--gold-light)" }}>{String(p.author)}</b> · {timeAgo(p.created_at)}
            </p>
            <p style={{ color: "var(--muted)", marginTop: "0.5rem" }}>{String(p.body).slice(0, 220)}</p>
            {!!p.image_path && (
              <Image src={`/api/file/${String(p.image_path)}`} alt="chart" width={380} height={190} style={{ borderRadius: 8, marginTop: "0.6rem" }} />
            )}
            <div className="price-row">
              <span className="tier-info">💬 {String(p.reply_count)} · ❤️ {String(p.likes)}</span>
              <span style={{ fontSize: "0.78rem", color: "var(--muted)" }}>{fmtDate(p.created_at)}</span>
            </div>
            <Link className="btn outline sm" href={`/community/post/${p.id}`} style={{ marginTop: "0.6rem" }}>
              Open discussion
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
