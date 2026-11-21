import { createReadStream, existsSync, statSync } from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { UPLOAD_DIR } from "@/lib/files";
import { one } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const order = await one(
    `SELECT o.*, p.file_path, p.title FROM orders o LEFT JOIN products p ON p.id = o.item_id
     WHERE o.id = ? AND o.user_id = ? AND o.item_type = 'product' AND o.status = 'approved'`,
    [Number(id), user.id as number]
  );
  if (!order?.file_path) {
    return NextResponse.json({ error: "No access to this download" }, { status: 403 });
  }
  const filePath = path.join(UPLOAD_DIR, order.file_path as string);
  if (!filePath.startsWith(UPLOAD_DIR) || !existsSync(filePath)) {
    return NextResponse.json({ error: "File not available" }, { status: 404 });
  }
  const stat = statSync(filePath);
  const stream = Readable.toWeb(createReadStream(filePath)) as ReadableStream;
  const ext = (String(order.file_path).split(".").pop() || "bin").toLowerCase();
  const safeName = `${String(order.title || "BTA_product").replace(/[^a-z0-9 ._-]/gi, "_")}_BTA.${ext}`;
  return new NextResponse(stream, {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Length": String(stat.size),
      "Content-Disposition": `attachment; filename="${safeName}_BTA"`,
      "Cache-Control": "private, no-store",
    },
  });
}
