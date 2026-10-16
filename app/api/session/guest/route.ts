import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/session";
import { BP } from "@/lib/basepath";
import { GUEST_COOKIE, GUEST_MAX_AGE_S, cookieOptions, guestEnabled, newGuestId, signGuest } from "@/lib/isdead-auth/server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Guest sessions (no account) back uploads from the LoomIsDead Mac app and owner actions on /v/<id>.
// POST → 200 { ok: true } and sets the guest cookie when there is no session yet (what the Mac app calls).
export async function POST() {
  if (!guestEnabled()) return NextResponse.json({ error: "Guest sessions are turned off." }, { status: 503, headers: { "cache-control": "no-store" } });
  const res = NextResponse.json({ ok: true }, { headers: { "cache-control": "no-store" } });
  if (!(await currentUser())) res.cookies.set(GUEST_COOKIE, signGuest(newGuestId()), cookieOptions(GUEST_MAX_AGE_S));
  return res;
}
// GET ?next=/ → same, then bounce back. Relative Location on purpose: behind the yourappisdead.com rewrite this
// function sees its own *.vercel.app origin, and an absolute redirect would carry the visitor off the public domain.
export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("next") || "/";
  const next = /^\/(?!\/)[\w\-./?=&%]*$/.test(raw) ? raw : "/";
  const go = (path: string) => new NextResponse(null, { status: 307, headers: { Location: BP + path } });
  if (!guestEnabled()) return go("/");
  const res = go(next);
  if (!(await currentUser())) res.cookies.set(GUEST_COOKIE, signGuest(newGuestId()), cookieOptions(GUEST_MAX_AGE_S));
  return res;
}
