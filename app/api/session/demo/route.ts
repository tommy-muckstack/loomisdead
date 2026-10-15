import { NextResponse } from "next/server";
import { demoEnabled, DEMO_USER, signDemo } from "@/lib/session";
import { DEMO_COOKIE, cookieOptions } from "@/lib/isdead-auth/server";
export const runtime = "nodejs";
// Demo mode only (no Firebase needed): one demo account.
export async function POST() {
  if (!demoEnabled()) return NextResponse.json({ error: "Demo mode is off" }, { status: 404 });
  const res = new NextResponse(null, { status: 204 });
  res.cookies.set(DEMO_COOKIE, signDemo(DEMO_USER.id), cookieOptions());
  return res;
}
