import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/session";
import { getVideo, removeVideo, updateTitle } from "@/lib/videos-server";
import { toPublic, validId } from "@/lib/video";
export const runtime = "nodejs"; export const dynamic = "force-dynamic";
const nostore = { "cache-control": "no-store" };
type Ctx = { params: Promise<{ id: string }> };
async function owned(id: string) { if (!validId(id)) return null; const v = await getVideo(id); const u = await currentUser(); return v && u && v.ownerId === u.id ? v : null; }
export async function GET(_: NextRequest, { params }: Ctx) { const { id } = await params; const v = validId(id) ? await getVideo(id) : null; return v ? NextResponse.json({ video: toPublic(v) }, { headers: nostore }) : NextResponse.json({ error: "Not found" }, { status: 404, headers: nostore }); }
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const { id } = await params; if (!(await owned(id))) return NextResponse.json({ error: "Not allowed" }, { status: 403, headers: nostore });
  const b = await req.json().catch(() => ({})) as { title?: unknown }; if (typeof b.title !== "string") return NextResponse.json({ error: "Title required" }, { status: 400 });
  const v = await updateTitle(id, b.title); return v ? NextResponse.json({ video: toPublic(v) }, { headers: nostore }) : NextResponse.json({ error: "Not found" }, { status: 404 });
}
export async function DELETE(_: NextRequest, { params }: Ctx) { const { id } = await params; if (!(await owned(id))) return NextResponse.json({ error: "Not allowed" }, { status: 403, headers: nostore }); await removeVideo(id); return NextResponse.json({ ok: true }, { headers: nostore }); }
