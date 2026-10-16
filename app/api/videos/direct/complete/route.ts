import { NextRequest, NextResponse } from "next/server";
import { head } from "@vercel/blob";
import { currentUser } from "@/lib/session";
import { createVideoFromBlob, rateLimited } from "@/lib/videos-server";
import { blobHostFromToken, checkBlobUrl, DIRECT } from "@/lib/direct-upload";
import { dataUrlJpeg, toPublic } from "@/lib/video";
export const runtime = "nodejs"; export const dynamic = "force-dynamic";
const nostore = { "cache-control": "no-store" };
// Step 3 of a Mac app upload: POST { url, title, duration, thumb? } → 201 { id, video }. Share link: <site>/v/<id>.
export async function POST(req: NextRequest) {
  const u = await currentUser(); if (!u) return NextResponse.json({ error: "Start a session first." }, { status: 401, headers: nostore });
  if (rateLimited("complete:" + u.id, 60)) return NextResponse.json({ error: "You're uploading too fast. Try again in a while." }, { status: 429, headers: nostore });
  const b = await req.json().catch(() => null) as { url?: unknown; title?: unknown; duration?: unknown; thumb?: unknown } | null;
  const url = checkBlobUrl(b?.url, blobHostFromToken(process.env.BLOB_READ_WRITE_TOKEN));
  if (!url) return NextResponse.json({ error: "That upload URL isn't one of ours." }, { status: 400, headers: nostore });
  let meta: { size: number; contentType: string };
  try { meta = await head(url.toString()); } catch { return NextResponse.json({ error: "We couldn't find that upload." }, { status: 404, headers: nostore }); }
  if (!DIRECT.types.includes(meta.contentType) || meta.size > DIRECT.maxBytes) return NextResponse.json({ error: "That file isn't a video we can play." }, { status: 400, headers: nostore });
  const r = await createVideoFromBlob({ id: u.id, name: u.name }, { url: url.toString(), size: meta.size, type: meta.contentType }, { title: typeof b?.title === "string" ? b.title : "", duration: b?.duration, thumb: dataUrlJpeg(b?.thumb) });
  if (!r.video) return NextResponse.json({ error: r.error }, { status: 400, headers: nostore });
  return NextResponse.json({ id: r.video.id, video: toPublic(r.video) }, { status: 201, headers: nostore });
}
