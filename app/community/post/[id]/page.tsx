import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { one, q } from "@/lib/db";
import { likeAction, replyAction } from "@/app/actions";
import { moderateAction } from "@/app/admin/actions";
import { getSessionUser, canModerate } from "@/lib/auth";
import { canAccessRoom } from "@/lib/access";
import { timeAgo } from "@/lib/files";

export const metadata = { title: "Discussion" };

export default async function PostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const post = await one(
    `SELECT p.*, u.name AS author, u.id AS author_id, r.name AS room_name, r.slug AS room_slug, r.access AS room_access
     FROM posts p JOIN users u ON u.id = p.user_id JOIN rooms r ON r.id = p.room_id WHERE p.id = ?`,
    [Number(id)]
  );
  if (!post) notFound();
  const user = await getSessionUser();
  const access = await canAccessRoom(user, post.room_access as string);
  if (!access) notFound();
  const replies = await q(
    `SELECT r.*, u.name AS author FROM replies r JOIN users u ON u.id = r.user_id WHERE r.post_id = ? ORDER BY r.created_at`,
    [Number(id)]
  );
  const likes = await one(`SELECT COUNT(*) AS c FROM post_likes WHERE post_id = ?`, [Number(id)]);
  const liked = user
    ? await one(`SELECT 1 AS x FROM post_likes WHERE post_id = ? AND user_id = ?`, [
        Number(id),
        user.id as number,
      ])
    : null;
  const mod = user && canModerate(user);
  const staff = mod || Number(user?.id) === Number(post.author_id);

  return (
    <div className="container" style={{ maxWidth: 860 }}>
      <Link href={`/community/${String(post.room_slug)}`} className="hero-alt" style={{ display: "inline-block" }}>
        ← {String(post.room_name)}
      </Link>
      <div className="panel" style={{ marginTop: "1rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem", flexWrap: "wrap" }}>
          <h1 style={{ fontSize: "1.4rem" }}>
            {post.pinned ? <span className="chip gold">pinned</span> : null} {String(post.title)}
          </h1>
          <span className="tier-info">
            by <b style={{ color: "var(--gold-light)" }}>{String(post.author)}</b> · {timeAgo(post.created_at)}
          </span>
        </div>
        <p style={{ color: "var(--ink)", marginTop: "0.8rem", whiteSpace: "pre-wrap" }}>{String(post.body)}</p>
        {!!post.image_path && (
          <Image src={`/api/file/${String(post.image_path)}`} alt="chart" width={640} height={340} style={{ borderRadius: 8, marginTop: "0.8rem" }} />
        )}
        <div style={{ display: "flex", gap: "0.6rem", marginTop: "1rem", alignItems: "center" }}>
          <form action={likeAction}>
            <input type="hidden" name="postId" value={String(id)} />
            <button className="btn outline sm" type="submit" disabled={!user}>
              {liked ? "❤️ Liked" : "🤍 Like"} ({Number(likes?.c ?? 0)})
            </button>
          </form>
          {mod && (
            <form action={moderateAction}>
              <input type="hidden" name="op" value="toggle_pin" />
              <input type="hidden" name="id" value={String(id)} />
              <button className="btn sm" type="submit">
                {post.pinned ? "Unpin" : "Pin"}
              </button>
            </form>
          )}
          {staff && (
            <form action={moderateAction}>
              <input type="hidden" name="op" value="delete_post" />
              <input type="hidden" name="id" value={String(id)} />
              <button className="btn danger sm" type="submit">
                Delete post
              </button>
            </form>
          )}
        </div>
      </div>

      <div className="panel">
        <h2>{replies.length} replies</h2>
        {replies.length === 0 && <p style={{ color: "var(--muted)" }}>No replies yet.</p>}
        {replies.map((r) => (
          <div key={String(r.id)} style={{ borderBottom: "1px solid var(--line)", padding: "0.7rem 0" }}>
            <b style={{ color: "var(--gold-light)" }}>{String(r.author)}</b>{" "}
            <span style={{ color: "var(--muted)", fontSize: "0.75rem" }}>{timeAgo(r.created_at)}</span>
            <p style={{ color: "var(--ink)", fontSize: "0.92rem", whiteSpace: "pre-wrap" }}>{String(r.body)}</p>
            {mod && (
              <form action={moderateAction} style={{ marginTop: "0.3rem" }}>
                <input type="hidden" name="op" value="delete_reply" />
                <input type="hidden" name="id" value={String(r.id)} />
                <button className="btn danger sm" type="submit">
                  Delete
                </button>
              </form>
            )}
          </div>
        ))}
        <form className="stack" action={replyAction} style={{ marginTop: "1.2rem" }}>
          <input type="hidden" name="postId" value={String(id)} />
          <label className="field">
            Your reply
            <textarea name="body" rows={3} required minLength={1} placeholder="Share your analysis or answer…" />
          </label>
          <button className="btn-gold-lg btn-lg" type="submit" disabled={!user}>
            {user ? "Post reply" : "Login to reply"}
          </button>
        </form>
      </div>
    </div>
  );
}
