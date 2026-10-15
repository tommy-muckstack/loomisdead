import Link from "next/link";
import { NavBar } from "@isdead/design";
import { Logo } from "@/components/Logo";
import { site } from "@/site.config";
import { BP } from "@/lib/basepath";
// Marketing nav shared by the homepage and /login (templates/marketing-site.md)
export function SiteNav() {
  return <NavBar brand={<Link href="/" style={{ color: "inherit", textDecoration: "none" }}><Logo /></Link>}
    links={site.nav.map(n => ({ href: `${BP}/#${n.id}`, label: n.label }))}
    actions={<><Link className="ids-btn ids-btn--ghost" href="/login">Log in</Link><Link className="ids-btn ids-btn--primary" href="/login">{site.cta}</Link></>} />;
}
