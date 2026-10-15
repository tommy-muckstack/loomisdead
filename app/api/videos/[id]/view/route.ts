import { NextRequest, NextResponse } from "next/server";
import { recordView, getVideo, rateLimited } from "@/lib/videos-server";
import { validId } from "@/lib/video";
export const runtime = "nodejs"; export const dynamic = "force-dynamic";
const BOT = /bot|crawl|spider|preview|slurp|facebookexternalhit|embed|curl|wget/i;
// The watch page calls this once per browser session after playback starts. Crawlers and link-preview bots are ignored.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; if (!validId(id) || !(await getVideo(id))) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const ua = req.headers.get("user-agent") ?? ""; if (BOT.test(ua)) return NextResponse.json({ counted: false });
  const ip = (req.headers.get("x-forwarded-for") ?? "local").split(",")[0]!.trim(); if (rateLimited(`view:${id}:${ip}`, 20)) return NextResponse.json({ counted: false });
  return NextResponse.json({ counted: true, views: await recordView(id) }, { headers: { "cache-control": "no-store" } });
}
