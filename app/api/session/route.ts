import { NextRequest, NextResponse } from "next/server";
import { createSessionFromIdToken, firebaseConfigured, SESSION_COOKIE, DEMO_COOKIE, GUEST_COOKIE, verifyGuest, cookieOptions } from "@/lib/isdead-auth/server";
import { adoptGuestDocs } from "@/lib/store";
export const runtime = "nodejs";
// POST { idToken } → verifies with firebase-admin and sets the shared session cookie (path "/", so one sign-in covers every IsDead app).
export async function POST(req: NextRequest) {
  if (!firebaseConfigured()) return NextResponse.json({ error: "Sign-in is not configured yet." }, { status: 503 });
  const { idToken } = await req.json().catch(() => ({}));
  if (typeof idToken !== "string" || !idToken) return NextResponse.json({ error: "idToken required" }, { status: 400 });
  let s; try { s = await createSessionFromIdToken(idToken); } catch { return NextResponse.json({ error: "Sign-in failed. Try again." }, { status: 401 }); }
  // A guest who signs in keeps their work: per-user docs move from the guest id to the account.
  const guest = verifyGuest(req.cookies.get(GUEST_COOKIE)?.value);
  if (guest) { try { await adoptGuestDocs(guest, s.identity.uid); } catch { /* best effort */ } }
  const res = new NextResponse(null, { status: 204 });
  res.cookies.set(SESSION_COOKIE, s.cookie, cookieOptions());
  res.cookies.set(DEMO_COOKIE, "", cookieOptions(0));
  res.cookies.set(GUEST_COOKIE, "", cookieOptions(0));
  return res;
}
