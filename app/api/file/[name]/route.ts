import { createReadStream, existsSync, statSync } from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { UPLOAD_DIR } from "@/lib/files";
import { NextResponse } from "next/server";

const PUBLIC_MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name } = await params;
  if (!/^[a-z0-9-]+\.[a-z0-9]+$/i.test(name)) {
    return NextResponse.json({ error: "Invalid file name" }, { status: 400 });
  }
  const ext = (name.split(".").pop() || "").toLowerCase();
  if (!PUBLIC_MIME[ext]) {
    return NextResponse.json({ error: "Not a public file type" }, { status: 403 });
  }
  const filePath = path.join(UPLOAD_DIR, name);
  if (!filePath.startsWith(UPLOAD_DIR) || !existsSync(filePath)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const stat = statSync(filePath);
  const stream = Readable.toWeb(createReadStream(filePath)) as ReadableStream;
  return new NextResponse(stream, {
    headers: { "Content-Type": PUBLIC_MIME[ext], "Content-Length": String(stat.size), "Cache-Control": "public, max-age=3600" },
  });
}
