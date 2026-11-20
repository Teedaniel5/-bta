import Link from "next/link";
import { notFound } from "next/navigation";
import { one, q } from "@/lib/db";
import { toggleLessonProgressAction } from "@/app/actions";
import { hasCourseAccess } from "@/lib/access";
import { getSessionUser } from "@/lib/auth";
import { buyAction } from "@/app/actions";

export default async function CoursePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const course = await one(`SELECT * FROM courses WHERE id = ? AND published = 1`, [Number(id)]);
  if (!course) notFound();
  const user = await getSessionUser();
  const access = user ? await hasCourseAccess(user, Number(id)) : false;
  const modules = await q(`SELECT * FROM modules WHERE course_id = ? ORDER BY position`, [Number(id)]);
  const lessons = await q(
    `SELECT l.*, m.id AS mid FROM lessons l JOIN modules m ON m.id = l.module_id WHERE m.course_id = ? ORDER BY m.position, l.position`,
    [Number(id)]
  );
  const completed = user
    ? new Set(
        (
          await q(
            `SELECT lp.lesson_id FROM lesson_progress lp JOIN lessons l ON l.id = lp.lesson_id JOIN modules m ON m.id = l.module_id WHERE lp.user_id = ? AND m.course_id = ?`,
            [user.id as number, Number(id)]
          )
        ).map((r) => Number(r.lesson_id))
      )
    : new Set<number>();
  const progress = lessons.length > 0 ? Math.round((completed.size / lessons.length) * 100) : 0;

  return (
    <div className="container">
      <Link href="/courses" className="hero-alt" style={{ display: "inline-block" }}>
        ← All courses
      </Link>
      <h1 className="page-title" style={{ marginTop: "0.6rem" }}>
        {String(course.title)}
      </h1>
      <p className="page-sub">{String(course.description)}</p>

      <div className="panel">
        <h2>Course overview</h2>
        <div className="tier">
          <span className="tier-info"><strong>{modules.length}</strong> modules · <strong>{lessons.length}</strong> lessons</span>
          {!access && <span className="price">${String(course.price)}</span>}
        </div>
        {access ? (
          <>
            <div style={{ margin: "1rem 0" }}>
              <div className="progress-bar">
                <div style={{ width: `${progress}%` }} />
              </div>
              <p style={{ color: "var(--muted)", fontSize: "0.8rem", marginTop: "0.4rem" }}>
                {progress}% complete
              </p>
            </div>
            {progress === 100 && (
              <Link className="btn green" href={`/courses/${id}/certificate`}>
                Open my certificate
              </Link>
            )}
          </>
        ) : (
          <form action={buyAction} style={{ marginTop: "1rem" }}>
            <input type="hidden" name="itemType" value="course" />
            <input type="hidden" name="itemId" value={String(id)} />
            <button className="btn-gold-lg btn-lg" type="submit" disabled={!user}>
              {user ? `Enroll — ${"$"}${String(course.price)}` : "Login to enroll"}
            </button>
          </form>
        )}
      </div>

      <div className="panel">
        <h2>Curriculum</h2>
        {modules.map((m) => (
          <div key={String(m.id)} style={{ marginBottom: "1.4rem" }}>
            <h3 style={{ fontSize: "1rem", color: "var(--gold-light)", marginBottom: "0.5rem" }}>
              {String(m.title)}
            </h3>
            {lessons
              .filter((l) => Number(l.mid) === Number(m.id))
              .map((l) => (
                <div className="tier" key={String(l.id)}>
                  <span className="tier-info">
                    {completed.has(Number(l.id)) ? "✅ " : ""}
                    <strong>{String(l.title)}</strong>
                  </span>
                  {access ? (
                    <form action={toggleLessonProgressAction}>
                      <input type="hidden" name="lessonId" value={String(l.id)} />
                      <input type="hidden" name="courseId" value={String(id)} />
                      <button className="btn outline sm" type="submit">
                        {completed.has(Number(l.id)) ? "Mark unwatched" : "Mark complete"}
                      </button>
                    </form>
                  ) : (
                    <span className="chip">🔒 Enrolled only</span>
                  )}
                </div>
              ))}
            {access && lessons
              .filter((l) => Number(l.mid) === Number(m.id) && (l.body || l.video_url || l.file_path))
              .map((l) => (
                <details key={`c${l.id}`} style={{ marginTop: "0.4rem", color: "var(--muted)" }}>
                  <summary style={{ cursor: "pointer", fontSize: "0.85rem" }}>
                    Materials · {String(l.title)}
                  </summary>
                  <div style={{ padding: "0.6rem" }}>
                    {!!l.video_url && (
                      <p>
                        <a href={String(l.video_url)} target="_blank" rel="noopener noreferrer" style={{ color: "var(--gold-light)" }}>
                          ▶ Watch video lesson
                        </a>
                      </p>
                    )}
                    {!!l.body && <p style={{ whiteSpace: "pre-wrap" }}>{String(l.body)}</p>}
                    {!!l.file_path && (
                      <p>
                        <a className="btn outline sm" href={`/api/download/lesson/${String(l.id)}`}>
                          Download material
                        </a>
                      </p>
                    )}
                  </div>
                </details>
              ))}
          </div>
        ))}
        {modules.length === 0 && (
          <p style={{ color: "var(--muted)" }}>The instructor is still preparing this curriculum.</p>
        )}
      </div>
    </div>
  );
}
