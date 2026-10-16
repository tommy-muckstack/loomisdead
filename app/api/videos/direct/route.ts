import { NextRequest, NextResponse } from "next/server";
import { generateClientTokenFromReadWriteToken } from "@vercel/blob/client";
import { currentUser } from "@/lib/session";
import { rateLimited } from "@/lib/videos-server";
import { DIRECT, directPathname, validateDirectRequest } from "@/lib/direct-upload";
export const runtime = "nodejs"; export const dynamic = "force-dynamic";
const nostore = { "cache-control": "no-store" };
// Step 1 of a Mac app upload: POST { size, contentType } → { clientToken, pathname }.
// Step 2 (client): PUT https://blob.vercel-storage.com/<pathname> with authorization: Bearer <clientToken>, x-api-version: 7, x-content-type.
// Step 3: POST /api/videos/direct/complete. See README "Mac app uploads".
export async function POST(req: NextRequest) {
  const u = await currentUser(); if (!u) return NextResponse.json({ error: "Start a session first." }, { status: 401, headers: nostore });
  const token = process.env.BLOB_READ_WRITE_TOKEN; if (!token) return NextResponse.json({ error: "Uploads aren't configured on this server." }, { status: 503, headers: nostore });
  const body = await req.json().catch(() => null) as { size?: unknown; contentType?: string } | null;
  const bad = validateDirectRequest(body); if (bad) return NextResponse.json({ error: bad }, { status: 400, headers: nostore });
  if (rateLimited("direct:" + u.id, 30)) return NextResponse.json({ error: "You're uploading too fast. Try again in a while." }, { status: 429, headers: nostore });
  const pathname = directPathname(body!.contentType!);
  const clientToken = await generateClientTokenFromReadWriteToken({ token, pathname, maximumSizeInBytes: DIRECT.maxBytes, allowedContentTypes: DIRECT.types, addRandomSuffix: false, validUntil: Date.now() + DIRECT.tokenTtlMs });
  return NextResponse.json({ clientToken, pathname }, { headers: nostore });
}
