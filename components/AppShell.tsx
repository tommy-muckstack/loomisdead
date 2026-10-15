"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/Logo";
import { BP } from "@/lib/basepath";
import "@/app/appshell.css";

export type ShellItem = { label: string; href: string; icon: string; badge?: string };
export type ShellCfg = {
  mode: "side" | "top";
  vars?: Record<string, string>;
  items: ShellItem[]; foot?: ShellItem[];
  cta?: { label: string; href: string; icon?: string };
  search?: string; right?: { label: string; href: string; solid?: boolean }[];
  title?: string; logoSize?: number;
};
const P: Record<string, string> = {
  home: "M3 11l9-8 9 8v9a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1z", video: "M3 6h12a2 2 0 012 2v8a2 2 0 01-2 2H3zM17 10l5-3v10l-5-3z", record: "M12 4a8 8 0 100 16 8 8 0 000-16zm0 4a4 4 0 110 8 4 4 0 010-8z",
  library: "M4 4h4v16H4zM10 4h4v16h-4zM16 6l4-1 3 14-4 1z", link: "M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1", qr: "M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h3v3h-3zM19 14h2v2h-2zM14 19h2v2h-2zM18 18h3v3h-3z",
  chart: "M4 20V10M10 20V4M16 20v-8M22 20H2", doc: "M6 3h9l5 5v13H6zM14 3v6h6", inbox: "M3 13l3-8h12l3 8v6H3zM3 13h5l1 3h6l1-3h5", users: "M9 11a4 4 0 100-8 4 4 0 000 8zM2 21a7 7 0 0114 0M17 11a3 3 0 100-6M18 14a6 6 0 014 7",
  settings: "M12 8a4 4 0 100 8 4 4 0 000-8zM12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2", plus: "M12 5v14M5 12h14", search: "M11 4a7 7 0 100 14 7 7 0 000-14zM21 21l-5-5", star: "M12 3l3 6 6 1-4.5 4.5 1 6.5L12 18l-5.5 3 1-6.5L3 10l6-1z",
  grid: "M3 3h8v8H3zM13 3h8v8h-8zM3 13h8v8H3zM13 13h8v8h-8z", template: "M4 4h16v6H4zM4 14h7v6H4zM15 14h5v6h-5z", mic: "M12 3a3 3 0 013 3v6a3 3 0 01-6 0V6a3 3 0 013-3zM6 11a6 6 0 0012 0M12 17v4", shield: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z", key: "M14 10a5 5 0 11-4 4l-7 7v-3h3v-3h3l1-1",
  bell: "M6 17V11a6 6 0 0112 0v6l2 2H4zM10 21h4", send: "M3 11l18-8-8 18-2-8z", folder: "M3 6h7l2 2h9v11H3z",
};
export const Ic = ({ n, s = 20 }: { n: string; s?: number }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d={P[n] || P.grid} /></svg>;

export function AppShell({ user, cfg, children }: { user: { name: string; email: string; demo: boolean; guest?: boolean }; cfg: ShellCfg; children: React.ReactNode }) {
  const path = usePathname() || "";
  const rel = path.startsWith(BP) ? path.slice(BP.length) || "/" : path;
  const on = (h: string) => h === "/app" ? rel === "/app" : rel.startsWith(h);
  const initial = (user.name || user.email || "?").trim()[0]?.toUpperCase();
  const nav = (it: ShellItem) => <Link key={it.label} href={it.href} className={"as-it" + (on(it.href) ? " on" : "")}><Ic n={it.icon} /><span>{it.label}</span>{it.badge && <em>{it.badge}</em>}</Link>;
  return <div className={"as as--" + cfg.mode} style={cfg.vars as React.CSSProperties}>
    {cfg.mode === "side" && <aside className="as-side">
      <Link href="/app" className="as-logo"><Logo size={cfg.logoSize ?? 28} /></Link>
      {cfg.cta && <Link href={cfg.cta.href} className="as-cta">{cfg.cta.icon && <Ic n={cfg.cta.icon} s={18} />}{cfg.cta.label}</Link>}
      <nav className="as-nav">{cfg.items.map(nav)}</nav>
      <div className="as-foot">{cfg.foot?.map(nav)}</div>
    </aside>}
    <div className="as-main">
      <header className="as-top">
        {cfg.mode === "top" && <><Link href="/app" className="as-logo"><Logo size={cfg.logoSize ?? 26} /></Link><nav className="as-tnav">{cfg.items.map(it => <Link key={it.label} href={it.href} className={on(it.href) ? "on" : ""}>{it.label}</Link>)}</nav></>}
        {cfg.title && cfg.mode === "side" && <b className="as-title">{cfg.title}</b>}
        {cfg.search && <label className="as-search"><Ic n="search" s={16} /><input placeholder={cfg.search} aria-label="Search" /></label>}
        <div className="as-right">
          {cfg.right?.map(r => <Link key={r.label} href={r.href} className={"as-btn" + (r.solid ? " solid" : "")}>{r.label}</Link>)}
          <span className="as-me" title={user.guest ? "Guest · sign in to keep your work" : user.demo ? "Demo account" : user.email}>{initial}</span>
          <form method="post" action={`${BP}/api/session/logout`}><button className="as-out">Sign out</button></form>
        </div>
      </header>
      <div className="as-body">{children}</div>
    </div>
  </div>;
}
