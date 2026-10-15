import Link from "next/link";
import "@/app/pricing-body.css";

export type Plan = { name: string; price: string; per?: string; desc: string; cta: string; feats: string[]; hot?: boolean; tag?: string; lead?: string };
export type PBCfg = {
  vars?: Record<string, string>;
  title: string; sub?: string; note?: string; toggle?: [string, string];
  plans: Plan[];
  extra?: { title: string; text: string; cta: string; bullets?: string[] };
  tableTitle: string; cols: string[]; groups: [string, string[]][];
  faqTitle: string; faqs: [string, string][];
  cta?: { title: string; btn: string };
};
const Mark = ({ on }: { on: boolean }) => on ? <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden><path d="M3 8.5l3.2 3L13 4.5" fill="none" stroke="currentColor" strokeWidth="2" /></svg> : <i aria-hidden>–</i>;

export function PricingBody({ cfg }: { cfg: PBCfg }) {
  const { plans } = cfg; const nc = cfg.cols.length;
  return <div className="pb" style={cfg.vars as React.CSSProperties}>
    <section className="pb-hero"><h1>{cfg.title}</h1>{cfg.sub && <p>{cfg.sub}</p>}{cfg.note && <span className="pb-note">{cfg.note}</span>}
      {cfg.toggle && <div className="pb-toggle"><b>{cfg.toggle[0]}</b><span>{cfg.toggle[1]}</span></div>}</section>
    <section className="pb-plans" style={{ ["--n" as string]: plans.length } as React.CSSProperties}>
      {plans.map(p => <article key={p.name} className={"pb-plan" + (p.hot ? " pb-plan--hot" : "")}>
        {p.tag && <em>{p.tag}</em>}<h2>{p.name}</h2><p className="pb-plan__d">{p.desc}</p>
        <div className="pb-price"><b>{p.price}</b>{p.per && <small>{p.per}</small>}</div>
        <Link className="pb-btn" href="/login">{p.cta}</Link>
        {p.lead && <h4>{p.lead}</h4>}
        <ul>{p.feats.map(f => <li key={f}><Mark on />{f}</li>)}</ul></article>)}
    </section>
    {cfg.extra && <section className="pb-extra"><div><h2>{cfg.extra.title}</h2><p>{cfg.extra.text}</p>{cfg.extra.bullets && <ul>{cfg.extra.bullets.map(b => <li key={b}>{b}</li>)}</ul>}<Link className="pb-btn pb-btn--p" href="/login">{cfg.extra.cta}</Link></div><div className="pb-extra__art" aria-hidden><i /><i /><i /></div></section>}
    <section className="pb-table"><h2>{cfg.tableTitle}</h2>
      <div className="pb-tbl" style={{ ["--c" as string]: nc } as React.CSSProperties}>
        <div className="pb-tr pb-tr--h"><span />{cfg.cols.map(c => <b key={c}>{c}</b>)}</div>
        {cfg.groups.map(([g, rows]) => <div key={g} className="pb-grp"><div className="pb-tr pb-tr--g"><strong>{g}</strong></div>
          {rows.map(r => { const off = r.startsWith("-"); return <div key={r} className="pb-tr"><span className={off ? "off" : ""}>{off ? r.slice(1) : r}</span>{cfg.cols.map(c => <div key={c}><Mark on={!off} /></div>)}</div>; })}</div>)}
      </div></section>
    <section className="pb-faq"><h2>{cfg.faqTitle}</h2>{cfg.faqs.map(([q, a]) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}</section>
    {cfg.cta && <section className="pb-cta"><div><h2>{cfg.cta.title}</h2><Link className="pb-btn pb-btn--p" href="/login">{cfg.cta.btn}</Link></div></section>}
  </div>;
}
