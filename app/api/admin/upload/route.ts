import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { ADMIN_EXTS, saveUpload } from "@/lib/files";

export const runtime = "nodejs";
export const maxDuration = 60;

const ALLOWED_ROLES = new Set(["admin", "super_admin", "instructor", "provider"]);

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user || !ALLOWED_ROLES.has(String(user.role))) {
    return NextResponse.json({ ok: false, error: "Not allowed." }, { status: 403 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Upload failed — the file may be too large. Maximum size is 100 MB." },
      { status: 413 }
    );
  }

  const file = form.get("file");
  if (!file || typeof file === "string") {
    return NextResponse.json({ ok: false, error: "No file received." }, { status: 400 });
  }

  const f = file as File;
  if (!f.size) {
    return NextResponse.json({ ok: false, error: "The selected file is empty." }, { status: 400 });
  }
  if (f.size > 100 * 1024 * 1024) {
    return NextResponse.json(
      { ok: false, error: `File too big (${(f.size / 1048576).toFixed(1)} MB). Maximum is 100 MB.` },
      { status: 413 }
    );
  }
  const ext = (f.name.split(".").pop() || "").toLowerCase();
  if (!ADMIN_EXTS.includes(ext)) {
    return NextResponse.json(
      {
        ok: false,
        error: `Wrong file type: .${ext} is not allowed. Allowed: ${ADMIN_EXTS.map((e) => "." + e).join(", ")}`,
      },
      { status: 415 }
    );
  }

  const name = await saveUpload(file, ADMIN_EXTS);
  if (!name) {
    return NextResponse.json(
      { ok: false, error: "Could not save the file. Please try again." },
      { status: 500 }
    );
  }
  return NextResponse.json({ ok: true, name });
}
