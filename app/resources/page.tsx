import Link from "next/link";
import { q } from "@/lib/db";
import { fmtDate } from "@/lib/files";

export const metadata = { title: "Free Resources" };

export default async function Resources() {
  const resources = await q(`SELECT * FROM resources WHERE published = 1 ORDER BY created_at DESC`);
  return (
    <div className="container">
      <h1 className="page-title">
        Free <span>Resources</span>
      </h1>
      <p className="page-sub">
        Free forex guides, trading tips, market education articles and terminology — published by
        the BTA team. Want structured learning?{" "}
        <Link href="/courses" style={{ color: "var(--gold-light)" }}>
          Explore our courses
        </Link>{" "}
        or <Link href="/chat" style={{ color: "var(--gold-light)" }}>ask the AI Mentor</Link> any
        question about forex, candlesticks, market structure or MT4/MT5.
      </p>
      <div className="grid grid-3">
        {resources.length === 0 && (
          <div className="card">
            <p>No resources published yet — check back soon.</p>
          </div>
        )}
        {resources.map((r) => (
          <div className="card" key={String(r.id)}>
            <span className="chip purple">{String(r.type)}</span>
            <h3 style={{ margin: "0.6rem 0 0.5rem" }}>{String(r.title)}</h3>
            <p>{String(r.body).slice(0, 300)}</p>
            {!!r.file_path && (
              <p style={{ marginTop: "0.75rem" }}>
                <a className="btn outline sm" href={`/api/file/${String(r.file_path)}`}>
                  Download attachment
                </a>
              </p>
            )}
            <p style={{ marginTop: "0.75rem", fontSize: "0.78rem" }}>{fmtDate(r.created_at)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
