import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE, DEMO_COOKIE, cookieOptions, verifySessionCookie, revokeSessions } from "@/lib/isdead-auth/server";
import { BP } from "@/lib/basepath";
export const runtime = "nodejs";
export async function POST(req: NextRequest) {
  const jar = await cookies();
  const id = await verifySessionCookie(jar.get(SESSION_COOKIE)?.value);
  if (id) await revokeSessions(id.uid);
  // relative Location keeps the browser on whichever host it used (yourappisdead.com rewrite vs the deployment origin)
  const res = new NextResponse(null, { status: 303, headers: { Location: BP + "/" } });
  res.cookies.set(SESSION_COOKIE, "", cookieOptions(0));
  res.cookies.set(DEMO_COOKIE, "", cookieOptions(0));
  return res;
}
