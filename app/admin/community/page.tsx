import Link from "next/link";
import { q } from "@/lib/db";
import AdminNav from "../AdminNav";
import { moderateAction } from "../actions";
import { fmtDate } from "@/lib/files";

export const metadata = { title: "Admin — Community" };

export default async function AdminCommunity({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string }>;
}) {
  const sp = await searchParams;
  const posts = await q(
    `SELECT p.*, u.name AS author, u.status AS author_status, u.id AS uid, r.name AS room_name,
       (SELECT COUNT(*) FROM replies rp WHERE rp.post_id = p.id) AS reply_count,
       (SELECT COUNT(*) FROM post_likes pl WHERE pl.post_id = p.id) AS like_count
     FROM posts p JOIN users u ON u.id = p.user_id JOIN rooms r ON r.id = p.room_id
     ORDER BY p.created_at DESC LIMIT 100`
  );

  return (
    <div className="container">
      <h1 className="page-title">
        Community <span>Moderation</span>
      </h1>
      <AdminNav />
      {sp.ok && <div className="msg-banner msg-ok">Done.</div>}
      <div className="panel">
        <h2>Recent discussions ({posts.length})</h2>
        <div className="table-scroll">
          <table className="table">
            <thead>
              <tr><th>Discussion</th><th>Author</th><th>Room</th><th>Activity</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {posts.map((p) => (
                <tr key={String(p.id)}>
                  <td>
                    <b>{String(p.title)}</b>
                    {!!p.pinned ? <span className="chip gold" style={{ marginLeft: "0.4rem" }}>pinned</span> : null}
                    <br />
                    <span style={{ fontSize: "0.75rem", color: "var(--muted)" }}>{String(p.body).slice(0, 80)}…</span>
                  </td>
                  <td>
                    {String(p.author)}
                    <br />
                    <span style={{ fontSize: "0.72rem", color: p.author_status === "active" ? "var(--muted)" : "var(--red)" }}>
                      {String(p.author_status)}
                    </span>
                  </td>
                  <td>{String(p.room_name)}</td>
                  <td style={{ fontSize: "0.78rem" }}>💬 {String(p.reply_count)} · ❤️ {String(p.like_count)} · {fmtDate(p.created_at)}</td>
                  <td>
                    <div style={{ display: "flex", gap: "0.3rem", flexWrap: "wrap" }}>
                      <Link className="btn outline sm" href={`/community/post/${p.id}`}>
                        View
                      </Link>
                      <form action={moderateAction}>
                        <input type="hidden" name="id" value={String(p.id)} />
                        <button className="btn sm" type="submit" name="op" value="toggle_pin">
                          {!!p.pinned ? "Unpin" : "Pin"}
                        </button>
                      </form>
                      <form action={moderateAction}>
                        <input type="hidden" name="id" value={String(p.id)} />
                        <button className="btn danger sm" type="submit" name="op" value="delete_post">
                          Delete
                        </button>
                      </form>
                      <form action={moderateAction}>
                        <input type="hidden" name="id" value={String(p.uid)} />
                        <button
                          className="btn danger sm"
                          type="submit"
                          name="op"
                          value={p.author_status === "active" ? "ban_user" : "unban_user"}
                        >
                          {p.author_status === "active" ? "Suspend user" : "Un-suspend"}
                        </button>
                      </form>
                    </div>
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
