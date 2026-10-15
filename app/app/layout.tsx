import { redirect } from "next/navigation";
import Link from "next/link";
import { currentUser } from "@/lib/session";
import { AppShell } from "@/components/AppShell";
import { shellCfg } from "@/components/shellCfg";
export const dynamic = "force-dynamic";
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  if (!user) redirect("/login?callbackUrl=" + encodeURIComponent("/app"));
  return <AppShell user={user} cfg={shellCfg}>{children}</AppShell>;
}
