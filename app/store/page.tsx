import Link from "next/link";
import Image from "next/image";
import { q } from "@/lib/db";
import { fmtDate } from "@/lib/files";

export const metadata = {
  title: "Digital Store",
  description: "Indicators, expert advisors, ebooks, strategies, templates and trading tools.",
};

export default async function Store() {
  const products = await q(`SELECT * FROM products WHERE published = 1 ORDER BY created_at DESC`);
  return (
    <div className="container">
      <h1 className="page-title">
        BTA <span>Digital Store</span>
      </h1>
      <p className="page-sub">
        Professional digital products for serious traders. Every purchase is delivered as a
        secure download from your library after payment verification.
      </p>
      <div className="grid grid-3">
        {products.length === 0 && (
          <div className="card">
            <p>The store is being stocked — check back soon.</p>
          </div>
        )}
        {products.map((p) => (
          <div className="card" key={String(p.id)}>
            {!!p.cover_path && (
              <Image
                src={`/api/file/${String(p.cover_path)}`}
                alt={String(p.title)}
                width={400}
                height={200}
                style={{ borderRadius: 8, objectFit: "cover", marginBottom: "0.8rem" }}
              />
            )}
            <span className="chip purple">{String(p.category)}</span>
            <h3 style={{ margin: "0.6rem 0 0.4rem" }}>{String(p.title)}</h3>
            <p>{String(p.description).slice(0, 120)}</p>
            <div className="price-row">
              <span className="price">${String(p.price)}</span>
              <Link className="btn sm" href={`/store/${p.id}`}>
                View
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
