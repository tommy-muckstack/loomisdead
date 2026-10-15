// Who is signed in: the shared IsDead Firebase session cookie, or (demo mode) the single signed demo cookie.
import { cookies } from "next/headers";
import { SESSION_COOKIE, DEMO_COOKIE, GUEST_COOKIE, verifySessionCookie, verifyDemo, verifyGuest, guestEnabled, firebaseConfigured, signDemo } from "@/lib/isdead-auth/server";
export { firebaseConfigured, signDemo, guestEnabled };
/** `guest`: no account yet; data is keyed by the guest id and adopted by the account on sign-in. Gate email features on `!guest`. */
export type SessionUser = { id: string; name: string; email: string; demo: boolean; guest: boolean };
export const DEMO_USER: SessionUser = { id: "demo", name: "Demo User", email: "demo@yourappisdead.com", demo: true, guest: false };
export const demoEnabled = () => process.env.NODE_ENV !== "production" || process.env.DEMO_MODE === "1";
export async function currentUser(): Promise<SessionUser | null> {
  const jar = await cookies();
  if (demoEnabled() && verifyDemo(jar.get(DEMO_COOKIE)?.value) === DEMO_USER.id) return DEMO_USER;
  const id = await verifySessionCookie(jar.get(SESSION_COOKIE)?.value);
  if (id) return { id: id.uid, name: id.name ?? (id.email ?? "You").split("@")[0], email: id.email ?? "", demo: false, guest: false };
  const g = guestEnabled() ? verifyGuest(jar.get(GUEST_COOKIE)?.value) : null;
  return g ? { id: g, name: "Guest", email: "", demo: false, guest: true } : null;
}
/** Where to send someone with no session: straight into the app as a guest (or to login when guests are off). */
export const entryRedirect = (next = "/app") => guestEnabled() ? `/api/session/guest?next=${encodeURIComponent(next)}` : `/login?callbackUrl=${encodeURIComponent(next)}`;
