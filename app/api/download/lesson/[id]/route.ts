import { createReadStream, existsSync, statSync } from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { UPLOAD_DIR } from "@/lib/files";
import { one } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { hasCourseAccess } from "@/lib/access";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const lesson = await one(
    `SELECT l.file_path, m.course_id, l.title FROM lessons l JOIN modules m ON m.id = l.module_id WHERE l.id = ?`,
    [Number(id)]
  );
  if (!lesson?.file_path) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!(await hasCourseAccess(user, lesson.course_id as number))) {
    return NextResponse.json({ error: "Enroll first" }, { status: 403 });
  }
  const filePath = path.join(UPLOAD_DIR, lesson.file_path as string);
  if (!filePath.startsWith(UPLOAD_DIR) || !existsSync(filePath)) {
    return NextResponse.json({ error: "File missing" }, { status: 404 });
  }
  const stat = statSync(filePath);
  const stream = Readable.toWeb(createReadStream(filePath)) as ReadableStream;
  const safeName = String(lesson.title).replace(/[^a-z0-9 ._-]/gi, "_");
  return new NextResponse(stream, {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Length": String(stat.size),
      "Content-Disposition": `attachment; filename="${safeName}_BTA"`,
      "Cache-Control": "private, no-store",
    },
  });
}
