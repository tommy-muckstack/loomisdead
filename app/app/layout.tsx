import { redirect } from "next/navigation";
import Link from "next/link";
import { currentUser } from "@/lib/session";
import { AppHeader } from "@/components/AppHeader";
export const dynamic = "force-dynamic";
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  if (!user) redirect("/login?callbackUrl=" + encodeURIComponent("/app"));
  return <div className="app-root"><AppHeader user={user}><nav className="lm-nav"><Link href="/app">My videos</Link><Link href="/app/record">Record</Link></nav></AppHeader>{children}</div>;
}
