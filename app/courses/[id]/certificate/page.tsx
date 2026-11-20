import Link from "next/link";
import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import { one, q } from "@/lib/db";
import { hasCourseAccess } from "@/lib/access";
import { getSessionUser } from "@/lib/auth";
import { fmtDate } from "@/lib/files";

export const metadata = { title: "Certificate" };

export default async function Certificate({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const course = await one(`SELECT * FROM courses WHERE id = ? AND published = 1`, [Number(id)]);
  if (!course) notFound();
  if (!(await hasCourseAccess(user, Number(id)))) notFound();

  const lessons = await q(
    `SELECT COUNT(*) AS total FROM lessons l JOIN modules m ON m.id = l.module_id WHERE m.course_id = ?`,
    [Number(id)]
  );
  const done = await q(
    `SELECT COUNT(*) AS c FROM lesson_progress lp JOIN lessons l ON l.id = lp.lesson_id JOIN modules m ON m.id = l.module_id WHERE lp.user_id = ? AND m.course_id = ?`,
    [user.id as number, Number(id)]
  );
  const total = Number(lessons[0]?.total ?? 0);
  const completed = Number(done[0]?.c ?? 0);

  return (
    <div className="container">
      {total === 0 || completed < total ? (
        <div className="panel" style={{ textAlign: "center" }}>
          <div className="msg-banner msg-err">
            Certificate unlocks when you complete 100% of the lessons. Progress:{" "}
            <b>
              {completed}/{total}
            </b>
          </div>
          <Link className="btn" href={`/courses/${id}`}>
            Back to course
          </Link>
        </div>
      ) : (
        <>
          <div className="certificate">
            <Image src="/logo.jpg" alt="BTA" width={90} height={90} style={{ borderRadius: 12, margin: "0 auto 1rem" }} />
            <h1>Certificate of Completion</h1>
            <p style={{ color: "#7a5d00", letterSpacing: "0.2em", textTransform: "uppercase", fontSize: "0.75rem", marginTop: "0.6rem" }}>
              Brilliant Trading Academy — Treasures in Hidden Places
            </p>
            <p style={{ marginTop: "1.6rem" }}>This certifies that</p>
            <div className="cert-name">{String(user.name)}</div>
            <p>
              has successfully completed the course
              <br />
              <b style={{ color: "#7a5d00" }}>{String(course.title)}</b>
            </p>
            <p style={{ marginTop: "1.4rem", fontSize: "0.85rem" }}>
              Completed on {fmtDate(new Date().toISOString().replace("T", " ").slice(0, 19))}
            </p>
            <p style={{ marginTop: "1rem", fontSize: "0.75rem", color: "#8b7a45" }}>
              Certificate ID: BTA-{String(course.id)}-U{String(user.id)}-{String(Math.round(Date.now() / 100000))}
            </p>
          </div>
          <p className="auth-links no-print" style={{ textAlign: "center" }}>
            Print this page (Ctrl/Cmd + P) to save your certificate as PDF.
          </p>
        </>
      )}
    </div>
  );
}
