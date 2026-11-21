import Image from "next/image";
import { q } from "@/lib/db";
import AdminNav from "../AdminNav";
import ConfirmForm from "@/components/ConfirmForm";
import {
  createProductAction,
  deleteProductAction,
  deleteUploadAction,
  updateProductAction,
} from "../actions";

export const metadata = { title: "Admin — Products" };

const CATEGORIES = ["ebook", "indicator", "ea", "strategy", "template", "journal", "training"];

export default async function AdminProducts({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const sp = await searchParams;
  const products = await q(`SELECT * FROM products ORDER BY id DESC`);

  return (
    <div className="container">
      <h1 className="page-title">
        Product <span>Management</span>
      </h1>
      <AdminNav />
      {sp.ok && <div className="msg-banner msg-ok">Saved.</div>}
      {sp.error && <div className="msg-banner msg-err">{sp.error}</div>}

      <div className="panel">
        <h2>Add a product (eBooks, indicators, EAs, strategies, journals…)</h2>
        <form className="stack" action={createProductAction}>
          <div className="grid grid-2">
            <label className="field">
              Product name
              <input name="title" required minLength={2} />
            </label>
            <label className="field">
              Price (USD)
              <input name="price" type="number" step="0.01" min="0" required />
            </label>
          </div>
          <label className="field">
            Category
            <select name="category">
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Description
            <textarea name="description" rows={3} />
          </label>
          <div className="grid grid-2">
            <label className="field">
              Cover image (jpg/png/webp)
              <input name="cover" type="file" accept=".jpg,.jpeg,.png,.webp,.gif" />
            </label>
            <label className="field">
              Product file (EX4, EX5, PDF, ZIP, MP4, PPT…)
              <input name="file" type="file" />
            </label>
          </div>
          <button className="btn-gold-lg btn-lg" type="submit">
            Publish product
          </button>
        </form>
      </div>

      <div className="panel">
        <h2>All products ({products.length})</h2>
        {products.map((p) => (
          <div key={String(p.id)} style={{ borderBottom: "1px solid var(--line)", paddingBottom: "1rem", marginBottom: "1rem" }}>
          <form className="stack" action={updateProductAction}>
            <input type="hidden" name="id" value={String(p.id)} />
            <div className="grid grid-2">
              <label className="field">
                Title
                <input name="title" defaultValue={String(p.title)} required />
              </label>
              <label className="field">
                Price (USD)
                <input name="price" type="number" step="0.01" defaultValue={String(p.price)} required />
              </label>
            </div>
            <label className="field">
              Description
              <textarea name="description" rows={2} defaultValue={String(p.description)} />
            </label>
            <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
              <label style={{ display: "flex", gap: "0.4rem", alignItems: "center", color: "var(--muted)", fontSize: "0.85rem" }}>
                <input type="checkbox" name="published" defaultChecked={!!p.published} />
                Published
              </label>
              {!!p.cover_path && <Image src={`/api/file/${String(p.cover_path)}`} alt="cover" width={60} height={40} style={{ borderRadius: 4 }} />}
              <span className="chip">{p.file_path ? "file uploaded" : "no file"}</span>
              <label className="field" style={{ flex: 1, minWidth: 220 }}>
                Replace product file
                <input name="file" type="file" />
              </label>
              <button className="btn green sm" type="submit">
                Save changes
              </button>
            </div>
          </form>
          <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
            {!!p.cover_path && (
              <ConfirmForm
                action={deleteUploadAction}
                fields={{ target: "product_cover", id: String(p.id) }}
                label="Remove cover image"
                className="btn outline sm"
              />
            )}
            {!!p.file_path && (
              <ConfirmForm
                action={deleteUploadAction}
                fields={{ target: "product_file", id: String(p.id) }}
                label="Remove product file"
                className="btn outline sm"
              />
            )}
            <ConfirmForm action={deleteProductAction} fields={{ id: String(p.id) }} label="Delete product" />
          </div>
          </div>
        ))}
      </div>
    </div>
  );
}
