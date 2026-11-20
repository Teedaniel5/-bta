import Link from "next/link";
import Image from "next/image";
import { one, q } from "@/lib/db";
import { fmtDate } from "@/lib/files";

export const metadata = {
  title: "Courses",
  description: "Structured forex trading courses from beginner to algorithmic trading.",
};

export default async function Courses() {
  const courses = await q(`SELECT * FROM courses WHERE published = 1 ORDER BY created_at DESC`);
  const counts = await q(
    `SELECT c.id, COUNT(l.id) AS lessons FROM courses c
     LEFT JOIN modules m ON m.course_id = c.id LEFT JOIN lessons l ON l.module_id = m.id
     WHERE c.published = 1 GROUP BY c.id`
  );
  const lessonCount = new Map(counts.map((c) => [Number(c.id), Number(c.lessons)]));
  const students = await q(`SELECT course_id, COUNT(*) AS c FROM enrollments GROUP BY course_id`);
  const studentCount = new Map(students.map((s) => [Number(s.course_id), Number(s.c)]));

  return (
    <div className="container">
      <h1 className="page-title">
        BTA <span>Courses</span>
      </h1>
      <p className="page-sub">
        Video lessons, PowerPoint slides, PDF notes and assignments — with progress tracking and a
        certificate of completion for every course.
      </p>
      <div className="grid grid-3">
        {courses.length === 0 && (
          <div className="card">
            <p>No courses published yet — check back soon.</p>
          </div>
        )}
        {courses.map((c) => (
          <div className="card" key={String(c.id)}>
            {!!c.cover_path && (
              <Image
                src={`/api/file/${String(c.cover_path)}`}
                alt={String(c.title)}
                width={400}
                height={180}
                style={{ borderRadius: 8, objectFit: "cover", marginBottom: "0.8rem" }}
              />
            )}
            <span className="chip purple">{String(c.category)}</span>
            <h3 style={{ margin: "0.6rem 0 0.4rem" }}>{String(c.title)}</h3>
            <p>{String(c.description).slice(0, 130)}</p>
            <p style={{ color: "var(--muted)", fontSize: "0.78rem", marginTop: "0.6rem" }}>
              {lessonCount.get(Number(c.id)) ?? 0} lessons ·{" "}
              {studentCount.get(Number(c.id)) ?? 0} students · published {fmtDate(c.created_at)}
            </p>
            <div className="price-row">
              <span className="price">${String(c.price)}</span>
              <Link className="btn sm" href={`/courses/${c.id}`}>
                View course
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
