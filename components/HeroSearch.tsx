"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
export function HeroSearch({ placeholder, chips, cta }: { placeholder: string; chips: string[]; cta: string }) {
  const r = useRouter(); const [q, setQ] = useState("");
  const go = (term: string) => r.push(`/login?callbackUrl=${encodeURIComponent("/app" + (term ? `?q=${encodeURIComponent(term)}` : ""))}`);
  return <div className="mk-search"><form onSubmit={e => { e.preventDefault(); go(q); }}>
    <input className="ids-input" aria-label="Search" value={q} onChange={e => setQ(e.target.value)} placeholder={placeholder} /><button className="ids-btn ids-btn--primary">{cta}</button></form>
    <div className="mk-chips">{chips.map(c => <button key={c} type="button" className="mk-chip" onClick={() => go(c)}>{c}</button>)}</div></div>;
}
