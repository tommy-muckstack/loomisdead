import { BP } from "@/lib/basepath";
import { demoEnabled } from "@/lib/session";
import { firebaseClientConfig, firebaseConfigured } from "@/lib/isdead-auth/config";
import { SiteNav } from "@/components/SiteNav";
import { LoginForm } from "@/components/LoginForm";
export const dynamic = "force-dynamic";
export default async function Login({ searchParams }: { searchParams: Promise<{ callbackUrl?: string }> }) {
  const { callbackUrl } = await searchParams;
  const rel = callbackUrl?.startsWith(BP + "/") ? callbackUrl.slice(BP.length) : callbackUrl;
  const to = BP + (rel && /^\/(?!\/)/.test(rel) ? rel : "/app");
  return <><SiteNav /><section className="ids-auth"><div className="ids-auth__card"><LoginForm config={firebaseConfigured() ? firebaseClientConfig() : null} demo={demoEnabled()} to={to} /></div></section></>;
}
