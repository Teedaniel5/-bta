import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { one, q } from "@/lib/db";
import { buyAction, reviewProductAction } from "@/app/actions";
import { hasProduct } from "@/lib/access";
import { getSessionUser } from "@/lib/auth";
import { fmtDate, timeAgo } from "@/lib/files";

export default async function ProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const product = await one(`SELECT * FROM products WHERE id = ? AND published = 1`, [Number(id)]);
  if (!product) notFound();

  const user = await getSessionUser();
  const owned = user ? await hasProduct(user, Number(id)) : false;
  const reviews = await q(
    `SELECT r.*, u.name AS user_name FROM reviews r JOIN users u ON u.id = r.user_id WHERE r.product_id = ? ORDER BY r.created_at DESC`,
    [Number(id)]
  );
  const avg =
    reviews.length > 0
      ? reviews.reduce((a, r) => a + Number(r.rating), 0) / reviews.length
      : 0;

  return (
    <div className="container">
      <Link href="/store" className="hero-alt" style={{ display: "inline-block" }}>
        ← Back to store
      </Link>
      <div className="grid grid-2" style={{ marginTop: "1rem" }}>
        <div>
          {!!product.cover_path && (
            <Image
              src={`/api/file/${String(product.cover_path)}`}
              alt={String(product.title)}
              width={640}
              height={360}
              style={{ borderRadius: 12, border: "1px solid var(--line)" }}
            />
          )}
        </div>
        <div className="panel">
          <span className="chip purple">{String(product.category)}</span>
          <h1 className="page-title" style={{ margin: "0.8rem 0 0.6rem" }}>
            {String(product.title)}
          </h1>
          <p style={{ color: "var(--muted)" }}>{String(product.description)}</p>
          <div className="price-row">
            <span className="price" style={{ fontSize: "1.6rem" }}>
              ${String(product.price)}
            </span>
            {owned ? (
              <Link className="btn green" href="/library">
                Owned — go to library
              </Link>
            ) : (
              <form action={buyAction}>
                <input type="hidden" name="itemType" value="product" />
                <input type="hidden" name="itemId" value={String(id)} />
                <button className="btn-gold-lg btn-lg" type="submit" disabled={!user}>
                  {user ? "Buy now" : "Login to buy"}
                </button>
              </form>
            )}
          </div>
          {sp.error && <div className="msg-banner msg-err" style={{ marginTop: "1rem" }}>{sp.error}</div>}
          {!user && (
            <p className="hero-alt">
              <Link href="/login">Login</Link> or{" "}
              <Link href="/register">create a free account</Link> to purchase.
            </p>
          )}
        </div>
      </div>

      <div className="panel" style={{ marginTop: "1.5rem" }}>
        <h2>Customer reviews {reviews.length > 0 && `(${reviews.length})`} {avg > 0 && <span className="rating">{"★".repeat(Math.round(avg))}</span>}</h2>
        {reviews.length === 0 && <p style={{ color: "var(--muted)" }}>No reviews yet.</p>}
        {reviews.map((r) => (
          <div key={String(r.id)} style={{ borderBottom: "1px solid var(--line)", padding: "0.7rem 0" }}>
            <b>{String(r.user_name)}</b>{" "}
            <span className="rating">{"★".repeat(Number(r.rating))}</span>{" "}
            <span style={{ color: "var(--muted)", fontSize: "0.78rem" }}>{timeAgo(r.created_at)}</span>
            <p style={{ color: "var(--muted)", fontSize: "0.9rem" }}>{String(r.body)}</p>
          </div>
        ))}
        {user && owned && (
          <form className="stack" action={reviewProductAction} style={{ marginTop: "1.2rem" }}>
            <input type="hidden" name="productId" value={String(id)} />
            <label className="field">
              Your rating
              <select name="rating" defaultValue="5">
                <option value="5">★★★★★ (5)</option>
                <option value="4">★★★★ (4)</option>
                <option value="3">★★★ (3)</option>
                <option value="2">★★ (2)</option>
                <option value="1">★ (1)</option>
              </select>
            </label>
            <label className="field">
              Your review
              <textarea name="body" rows={3} required />
            </label>
            <button className="btn" type="submit">
              Submit review
            </button>
          </form>
        )}
        <p style={{ color: "var(--muted)", fontSize: "0.78rem", marginTop: "1rem" }}>
          Product published {fmtDate(product.created_at)}.
        </p>
      </div>
    </div>
  );
}
