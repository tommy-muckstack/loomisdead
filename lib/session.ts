// Who is signed in: the shared IsDead Firebase session cookie, or (demo mode) the single signed demo cookie.
import { cookies } from "next/headers";
import { SESSION_COOKIE, DEMO_COOKIE, verifySessionCookie, verifyDemo, firebaseConfigured, signDemo } from "@/lib/isdead-auth/server";
export { firebaseConfigured, signDemo };
export type SessionUser = { id: string; name: string; email: string; demo: boolean };
export const DEMO_USER: SessionUser = { id: "demo", name: "Demo User", email: "demo@yourappisdead.com", demo: true };
export const demoEnabled = () => process.env.NODE_ENV !== "production" || process.env.DEMO_MODE === "1";
export async function currentUser(): Promise<SessionUser | null> {
  const jar = await cookies();
  if (demoEnabled() && verifyDemo(jar.get(DEMO_COOKIE)?.value) === DEMO_USER.id) return DEMO_USER;
  const id = await verifySessionCookie(jar.get(SESSION_COOKIE)?.value);
  if (!id) return null;
  return { id: id.uid, name: id.name ?? (id.email ?? "You").split("@")[0], email: id.email ?? "", demo: false };
}
