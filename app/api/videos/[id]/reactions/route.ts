import { NextRequest, NextResponse } from "next/server";
import { addReaction, rateLimited } from "@/lib/videos-server";
import { validId } from "@/lib/video";
export const runtime = "nodejs"; export const dynamic = "force-dynamic";
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; if (!validId(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const ip = (req.headers.get("x-forwarded-for") ?? "local").split(",")[0]!.trim(); if (rateLimited("r:" + ip, 120)) return NextResponse.json({ error: "Too many reactions." }, { status: 429 });
  const b = await req.json().catch(() => ({})) as { emoji?: unknown; at?: unknown }; const v = await addReaction(id, b.emoji, b.at);
  return v ? NextResponse.json({ reactions: v.reactions }) : NextResponse.json({ error: "Not found" }, { status: 404 });
}
