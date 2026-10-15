import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/session";
import { createVideo, listVideos, rateLimited } from "@/lib/videos-server";
import { LIMITS, dataUrlJpeg, toPublic } from "@/lib/video";
export const runtime = "nodejs"; export const dynamic = "force-dynamic";
const nostore = { "cache-control": "no-store" };
// POST multipart/form-data: video (webm/mp4), title, duration (seconds), thumb (data:image/jpeg;base64,…). Sign-in required.
export async function POST(req: NextRequest) {
  const u = await currentUser(); if (!u) return NextResponse.json({ error: "Sign in to save videos." }, { status: 401, headers: nostore });
  const len = Number(req.headers.get("content-length") ?? 0); if (len > LIMITS.bytes + 2_000_000) return NextResponse.json({ error: "That video is too large." }, { status: 413 });
  if (rateLimited("up:" + u.id, 60)) return NextResponse.json({ error: "You're uploading too fast. Try again in a while." }, { status: 429 });
  let form: FormData; try { form = await req.formData(); } catch { return NextResponse.json({ error: "Couldn't read the upload." }, { status: 400 }); }
  const f = form.get("video"); if (!f || typeof f === "string") return NextResponse.json({ error: "No video in the upload." }, { status: 400 });
  const r = await createVideo({ id: u.id, name: u.name }, new Uint8Array(await f.arrayBuffer()), { title: String(form.get("title") ?? ""), duration: form.get("duration"), thumb: dataUrlJpeg(form.get("thumb")) });
  if (!r.video) return NextResponse.json({ error: r.error }, { status: 400 });
  return NextResponse.json({ id: r.video.id, video: toPublic(r.video) }, { status: 201, headers: nostore });
}
export async function GET() { const u = await currentUser(); if (!u) return NextResponse.json({ error: "Sign in first" }, { status: 401, headers: nostore }); return NextResponse.json({ videos: (await listVideos(u.id, u.demo)).map(toPublic) }, { headers: nostore }); }
