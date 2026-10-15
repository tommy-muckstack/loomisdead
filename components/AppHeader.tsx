"use client";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { BP } from "@/lib/basepath";
export function AppHeader({ user, children }: { user: { name: string; email: string; demo: boolean }; children?: React.ReactNode }) {
  return <header className="app-hd"><Link href="/app" style={{ color: "inherit", textDecoration: "none" }}><Logo size={26} /></Link>
    <div className="app-hd__mid">{children}</div>
    <div className="app-hd__user"><span className="ids-muted" style={{ fontSize: 13 }}>{user.demo ? "Demo account" : user.email}</span>
      <form method="post" action={`${BP}/api/session/logout`}><button className="ids-btn ids-btn--ghost ids-btn--sm">Sign out</button></form></div></header>;
}
