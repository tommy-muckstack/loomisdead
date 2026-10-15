import Link from "next/link";
import "@/app/pricing-body.css";
import { PbCollapse } from "@/components/PbCollapse";
import matrix from "@/lib/loomMatrix.json";

export type Plan = { name: string; price: string; per?: string; desc: string; cta: string; feats: string[]; hot?: boolean; tag?: string; lead?: string };
export type PBCfg = {
  vars?: Record<string, string>;
  title: string; sub?: string; note?: string; toggle?: [string, string];
  plans: Plan[];
  extra?: { title: string; text: string; cta: string; bullets?: string[] };
  tableTitle: string; cols: string[]; groups: [string, string[]][];
  faqTitle: string; faqs: [string, string][];
  cta?: { title: string; btn: string };
  matrix?: boolean;
};
const Nw = (t: string) => t.endsWith(" NEW") ? <>{t.slice(0, -4)}<em className="pb-new">NEW</em></> : <>{t}</>;
const Mark = ({ on }: { on: boolean }) => on ? <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden><path d="M3 8.5l3.2 3L13 4.5" fill="none" stroke="currentColor" strokeWidth="2" /></svg> : <i aria-hidden>–</i>;

export function PricingBody({ cfg }: { cfg: PBCfg }) {
  const { plans } = cfg; const nc = cfg.cols.length;
  return <div className={"pb" + (cfg.matrix ? " pb--lm" : "")} style={cfg.vars as React.CSSProperties}>
    <section className="pb-hero"><h1>{cfg.title}</h1>{cfg.sub && <p>{cfg.sub}</p>}{cfg.note && <span className="pb-note">{cfg.note}</span>}
      {cfg.toggle && <div className="pb-toggle"><b>{cfg.toggle[0]}</b><span>{cfg.toggle[1]}</span></div>}
      {cfg.matrix && <div className="pb-ctl"><label><b>Team size:</b><input type="text" defaultValue="100" aria-label="Team size" /> users</label><div className="pb-ctl__bill"><b>Bill me:</b><label><i className="on" />Monthly</label><label><i />Annually</label><em>SAVE UP TO 17%</em></div></div>}</section>
    <section className="pb-plans" style={{ ["--n" as string]: plans.length } as React.CSSProperties}>
      {plans.map(p => <article key={p.name} className={"pb-plan" + (p.hot ? " pb-plan--hot" : "")}>
        {p.tag && <em>{p.tag}</em>}<h2>{p.name}</h2><p className="pb-plan__d">{p.desc}</p>
        <div className="pb-price"><b>{p.price}</b>{p.per && <small>{p.per}</small>}</div>
        <Link className="pb-btn" href="/login">{p.cta}</Link>
        {p.lead && <h4>{p.lead}</h4>}
        <ul>{p.feats.map(f => <li key={f}><Mark on /><span>{Nw(f)}</span></li>)}</ul></article>)}
    </section>
    {cfg.extra && <section className="pb-extra"><div><h2>{cfg.extra.title}</h2><p>{cfg.extra.text}</p>{cfg.extra.bullets && <ul>{cfg.extra.bullets.map(b => <li key={b}>{cfg.matrix && <Mark on />}<span>{Nw(b)}</span></li>)}</ul>}<Link className="pb-btn pb-btn--p" href="/login">{cfg.extra.cta}</Link></div><div className="pb-extra__art" aria-hidden><i /><i /><i /></div></section>}
    {cfg.matrix && <section className="pb-mx"><table><thead><tr><th />{cfg.cols.map((c, i) => <th key={c} className={i === 2 ? "hot" : ""}>{c}<Link href="/login">{plans[i]?.cta}</Link></th>)}</tr></thead><tbody>
      {(matrix as { g?: string; l?: string; n?: number; v?: string[] }[]).map((r, i) => r.g !== undefined
        ? <tr key={i} className="g"><th colSpan={5}>{r.g.startsWith("Try for free! ") ? <><Link href="/login">Try for free!</Link><h3>{r.g.slice(14)}</h3></> : <h3>{r.g}</h3>}</th></tr>
        : <tr key={i}><th>{r.l}{r.n ? <em>NEW</em> : null}</th>{r.v!.map((v, j) => <td key={j} className={v ? "" : "e"}>{v === "Included" ? <Mark on /> : v}</td>)}</tr>)}
    </tbody></table></section>}
    <section className={"pb-table" + (cfg.matrix ? " pb-table--m" : "")}><h2>{cfg.tableTitle}</h2>
      <div className="pb-tbl" style={{ ["--c" as string]: nc } as React.CSSProperties}>
        <div className="pb-tr pb-tr--h"><span />{cfg.cols.map(c => <b key={c}>{c}</b>)}</div>
        {cfg.groups.map(([g, rows]) => <details key={g} className="pb-grp" open><summary className="pb-tr pb-tr--g"><strong>{g}</strong></summary>
          {rows.map(r => { const off = r.startsWith("-"); return <div key={r} className="pb-tr"><span className={off ? "off" : ""}>{off ? r.slice(1) : r}</span>{cfg.cols.map(c => <div key={c}><Mark on={!off} /></div>)}</div>; })}</details>)}
        <PbCollapse keep={4} />
      </div></section>
    <section className="pb-faq"><h2>{cfg.faqTitle}</h2>{cfg.faqs.map(([q, a]) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}</section>
    {cfg.matrix && <section className="pb-logos"><h2>More than 25 million people across 400,000 companies choose Loom</h2><Link className="pb-btn pb-btn--p" href="/login">Get Loom for Free</Link><small>For Mac, Windows, iOS, and Android</small>
      <div className="pb-logos__row" aria-hidden>{["HubSpot", "ATLASSIAN", "Juniper", "LACOSTE", "LaunchDarkly", "Gartner"].map(n => <span key={n}>{n}</span>)}</div></section>}
    {cfg.cta && <section className="pb-cta"><div><h2>{cfg.cta.title}</h2><Link className="pb-btn pb-btn--p" href="/login">{cfg.cta.btn}</Link></div></section>}
  </div>;
}
