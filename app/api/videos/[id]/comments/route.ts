import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/session";
import { addComment, deleteComment, getVideo, rateLimited } from "@/lib/videos-server";
import { validId } from "@/lib/video";
export const runtime = "nodejs"; export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };
// POST {text, name?, at} adds a timestamped comment. Anyone with the link can comment; signed-in users comment under their own name.
export async function POST(req: NextRequest, { params }: Ctx) {
  const { id } = await params; if (!validId(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const ip = (req.headers.get("x-forwarded-for") ?? "local").split(",")[0]!.trim(); if (rateLimited("c:" + ip, 40)) return NextResponse.json({ error: "Too many comments. Slow down a little." }, { status: 429 });
  const b = await req.json().catch(() => ({})) as { text?: unknown; name?: unknown; at?: unknown }; const u = await currentUser();
  const r = await addComment(id, { id: u?.id ?? null, name: u?.name ?? null }, b.text, b.name, b.at); return r.comment ? NextResponse.json({ comment: r.comment }, { status: 201 }) : NextResponse.json({ error: r.error }, { status: r.error === "Video not found." ? 404 : 400 });
}
// DELETE ?cid= removes a comment. The video's owner or the comment's own author can do it.
export async function DELETE(req: NextRequest, { params }: Ctx) {
  const { id } = await params; const cid = req.nextUrl.searchParams.get("cid") ?? ""; const v = validId(id) ? await getVideo(id) : null; const u = await currentUser(); const c = v?.comments.find(x => x.id === cid);
  if (!v || !c || !u || (v.ownerId !== u.id && c.userId !== u.id)) return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  await deleteComment(id, cid); return NextResponse.json({ ok: true });
}
