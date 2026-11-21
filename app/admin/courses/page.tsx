import Link from "next/link";
import { one, q } from "@/lib/db";
import AdminNav from "../AdminNav";
import ConfirmForm from "@/components/ConfirmForm";
import {
  addLessonAction,
  addModuleAction,
  createCourseAction,
  deleteCourseAction,
  deleteLessonAction,
  deleteModuleAction,
  deleteUploadAction,
} from "../actions";

export const metadata = { title: "Admin — Courses" };

const CATEGORIES = [
  "Beginner Forex Trading",
  "Intermediate Forex Trading",
  "Advanced Technical Analysis",
  "Price Action Trading",
  "Market Structure",
  "Supply and Demand",
  "Trading Psychology and Risk Management",
  "Advanced Trading Strategies",
  "MT4 and MT5 Training",
  "Algorithmic Trading and Expert Advisors",
];

export default async function AdminCourses({
  searchParams,
}: {
  searchParams: Promise<{ course?: string; ok?: string; error?: string }>;
}) {
  const sp = await searchParams;
  const courses = await q(`SELECT * FROM courses ORDER BY id DESC`);
  const selectedId = sp.course ? Number(sp.course) : null;
  const selected = selectedId ? await one(`SELECT * FROM courses WHERE id = ?`, [selectedId]) : null;
  const modules = selectedId ? await q(`SELECT * FROM modules WHERE course_id = ? ORDER BY position`, [selectedId]) : [];
  const lessons = selectedId
    ? await q(
        `SELECT l.*, m.title AS module_title FROM lessons l JOIN modules m ON m.id = l.module_id WHERE m.course_id = ? ORDER BY m.position, l.position`,
        [selectedId]
      )
    : [];
  const enrolled = selectedId
    ? await q(
        `SELECT u.name, u.email FROM enrollments e JOIN users u ON u.id = e.user_id WHERE e.course_id = ?`,
        [selectedId]
      )
    : [];

  return (
    <div className="container">
      <h1 className="page-title">
        Course <span>Management</span>
      </h1>
      <AdminNav />
      {sp.ok && <div className="msg-banner msg-ok">Saved.</div>}
      {sp.error && <div className="msg-banner msg-err">{sp.error}</div>}

      <div className="panel">
        <h2>Create a course</h2>
        <form className="stack" action={createCourseAction}>
          <div className="grid grid-2">
            <label className="field">
              Course title
              <input name="title" required minLength={3} />
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
            Description / overview
            <textarea name="description" rows={3} />
          </label>
          <label className="field">
            Cover image
            <input name="cover" type="file" accept=".jpg,.jpeg,.png,.webp,.gif" />
          </label>
          <button className="btn-gold-lg btn-lg" type="submit">
            Publish course
          </button>
        </form>
      </div>

      <div className="panel">
        <h2>Courses ({courses.length})</h2>
        <div className="table-scroll">
          <table className="table">
            <thead>
              <tr><th>ID</th><th>Title</th><th>Price</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {courses.map((c) => (
                <tr key={String(c.id)}>
                  <td>{String(c.id)}</td>
                  <td>{String(c.title)}</td>
                  <td>${String(c.price)}</td>
                  <td><span className={`chip ${c.published ? "green" : ""}`}>{c.published ? "live" : "draft"}</span></td>
                  <td style={{ display: "flex", gap: "0.4rem" }}>
                    <Link className="btn outline sm" href={`/admin/courses?course=${c.id}`}>Manage lessons</Link>
                    <ConfirmForm action={deleteCourseAction} fields={{ id: String(c.id) }} label="Delete course" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selected && selectedId && (
        <>
          <div className="panel">
            <h2>Manage: {String(selected.title)}</h2>
            <p style={{ color: "var(--muted)", fontSize: "0.85rem" }}>
              {enrolled.length} enrolled students{enrolled.length > 0 && ": " + enrolled.map((e) => String(e.name)).slice(0, 8).join(", ")}
            </p>
            {!!selected.cover_path && (
              <ConfirmForm
                action={deleteUploadAction}
                fields={{ target: "course_cover", id: String(selectedId) }}
                label="Remove cover image"
                className="btn outline sm"
              />
            )}
            <form className="stack" action={addModuleAction} style={{ marginTop: "1rem", maxWidth: 480 }}>
              <input type="hidden" name="courseId" value={selectedId} />
              <label className="field">
                New module title
                <input name="title" required minLength={2} placeholder="e.g. Module 1 — Market Basics" />
              </label>
              <button className="btn" type="submit">
                Add module
              </button>
            </form>
          </div>

          <div className="panel">
            <h2>Curriculum ({modules.length} modules, {lessons.length} lessons)</h2>
            {modules.map((m) => (
              <div key={String(m.id)} style={{ marginBottom: "1rem" }}>
                <div style={{ display: "flex", gap: "0.6rem", alignItems: "center" }}>
                  <b style={{ color: "var(--gold-light)"}}>{String(m.title)}</b>
                  <ConfirmForm
                    action={deleteModuleAction}
                    fields={{ id: String(m.id), courseId: String(selectedId) }}
                    label="Delete module"
                  />
                </div>
                {lessons.filter((l) => Number(l.module_id) === Number(m.id)).length === 0 && (
                  <p style={{ color: "var(--muted)", fontSize: "0.85rem" }}>No lessons yet.</p>
                )}
                {lessons
                  .filter((l) => Number(l.module_id) === Number(m.id))
                  .map((l) => (
                    <div className="tier" key={String(l.id)}>
                      <span className="tier-info">
                        <strong>{String(l.title)}</strong>
                        {l.file_path ? " · has file" : ""}
                        {l.video_url ? " · has video" : ""}
                      </span>
                      <ConfirmForm
                        action={deleteLessonAction}
                        fields={{ id: String(l.id), courseId: String(selectedId) }}
                        label="Delete"
                      />
                    </div>
                  ))}
              </div>
            ))}
          </div>

          <div className="panel">
            <h2>Add a lesson</h2>
            <form className="stack" action={addLessonAction} id="add-lesson">
              <input type="hidden" name="courseId" value={selectedId} />
              <div className="grid grid-2">
                <label className="field">
                  Module
                  <select name="moduleId" required>
                    {modules.map((m) => (
                      <option key={String(m.id)} value={String(m.id)}>
                        {String(m.title)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  Lesson title
                  <input name="title" required minLength={2} />
                </label>
              </div>
              <label className="field">
                Lesson text / notes
                <textarea name="body" rows={3} />
              </label>
              <div className="grid grid-2">
                <label className="field">
                  Video URL (optional)
                  <input name="videoUrl" type="url" placeholder="https://youtube.com/..." />
                </label>
                <label className="field">
                  Upload material (PPT, PDF, MP4, MP3, ZIP…)
                  <input name="file" type="file" />
                </label>
              </div>
              <button className="btn-gold-lg btn-lg" type="submit">
                Add lesson
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
