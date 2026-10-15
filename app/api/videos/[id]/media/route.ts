import { NextRequest, NextResponse } from "next/server";
import { getVideo, readMedia } from "@/lib/videos-server";
import { parseRange, validId } from "@/lib/video";
export const runtime = "nodejs"; export const dynamic = "force-dynamic";
// Serves the video with HTTP Range support (needed for seeking), or the thumbnail with ?thumb=1. Anyone with the link can watch.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const v = validId(id) ? await getVideo(id) : null; if (!v) return new NextResponse("Not found", { status: 404 });
  const thumb = req.nextUrl.searchParams.get("thumb") === "1"; const name = thumb ? "thumb.jpg" : "video"; const buf = await readMedia(id, name); if (!buf) return new NextResponse("Not found", { status: 404 }); const size = buf.length;
  const type = thumb ? "image/jpeg" : v.type; const base = { "content-type": type, "accept-ranges": "bytes", "x-content-type-options": "nosniff", "cache-control": thumb ? "public, max-age=300" : "private, no-cache", "content-security-policy": "sandbox" };
  const r = parseRange(req.headers.get("range"), size); if (r === "bad") return new NextResponse(null, { status: 416, headers: { "content-range": `bytes */${size}` } });
  const start = r ? r.start : 0, end = r ? r.end : size - 1;
  const body = new Uint8Array(buf.subarray(start, end + 1));
  return new NextResponse(body, { status: r ? 206 : 200, headers: { ...base, "content-length": String(end - start + 1), ...(r ? { "content-range": `bytes ${start}-${end}/${size}` } : {}) } });
}
