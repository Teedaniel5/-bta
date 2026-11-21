import { createReadStream, existsSync, statSync } from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { UPLOAD_DIR } from "@/lib/files";
import { one } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { hasCourseAccess } from "@/lib/access";
import { NextResponse } from "next/server";

const MIME: Record<string, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  mp4: "video/mp4",
  webm: "video/webm",
  mp3: "audio/mpeg",
  m4a: "audio/mp4",
  wav: "audio/wav",
  txt: "text/plain",
  html: "text/html",
};

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
  const name = String(lesson.file_path);
  const ext = (name.split(".").pop() || "").toLowerCase();
  const filePath = path.join(UPLOAD_DIR, name);
  if (!filePath.startsWith(UPLOAD_DIR) || !existsSync(filePath)) {
    return NextResponse.json({ error: "File missing" }, { status: 404 });
  }
  const stat = statSync(filePath);
  const stream = Readable.toWeb(createReadStream(filePath)) as ReadableStream;
  const safeName = `${String(lesson.title).replace(/[^a-z0-9 ._-]/gi, "_")}_BTA.${ext}`;
  const mime = MIME[ext] || "application/octet-stream";
  const inline = mime !== "application/octet-stream";
  return new NextResponse(stream, {
    headers: {
      "Content-Type": mime,
      "Content-Length": String(stat.size),
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${safeName}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
