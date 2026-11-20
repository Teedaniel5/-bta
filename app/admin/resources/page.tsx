import { q } from "@/lib/db";
import AdminNav from "../AdminNav";
import { createResourceAction, deleteResourceAction } from "../actions";
import { fmtDate } from "@/lib/files";

export const metadata = { title: "Admin — Resources" };

export default async function AdminResources({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const sp = await searchParams;
  const resources = await q(`SELECT * FROM resources ORDER BY id DESC`);

  return (
    <div className="container">
      <h1 className="page-title">
        Free <span>Resources</span>
      </h1>
      <AdminNav />
      {sp.ok && <div className="msg-banner msg-ok">Saved.</div>}
      {sp.error && <div className="msg-banner msg-err">{sp.error}</div>}

      <div className="panel">
        <h2>Publish a free resource</h2>
        <form className="stack" action={createResourceAction}>
          <div className="grid grid-2">
            <label className="field">
              Title
              <input name="title" required minLength={3} />
            </label>
            <label className="field">
              Type
              <select name="type">
                <option value="article">Education article</option>
                <option value="guide">Forex guide</option>
                <option value="tips">Trading tips</option>
                <option value="video">Video</option>
                <option value="terminology">Terminology</option>
                <option value="chart">Chart example</option>
              </select>
            </label>
          </div>
          <label className="field">
            Content
            <textarea name="body" rows={5} />
          </label>
          <label className="field">
            Attachment (optional PDF)
            <input name="file" type="file" accept=".pdf,.jpg,.jpeg,.png" />
          </label>
          <button className="btn-gold-lg btn-lg" type="submit">
            Publish
          </button>
        </form>
      </div>

      <div className="panel">
        <h2>Published ({resources.length})</h2>
        {resources.map((r) => (
          <div className="tier" key={String(r.id)}>
            <span className="tier-info">
              <strong>{String(r.title)}</strong> · {String(r.type)} · {fmtDate(r.created_at)}
            </span>
            <form action={deleteResourceAction}>
              <input type="hidden" name="id" value={String(r.id)} />
              <button className="btn danger sm" type="submit">
                Delete
              </button>
            </form>
          </div>
        ))}
      </div>
    </div>
  );
}
