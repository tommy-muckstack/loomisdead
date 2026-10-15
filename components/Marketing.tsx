import Link from "next/link";
import { Hero, Section, Footer, Pill } from "@isdead/design";
import { SiteNav } from "@/components/SiteNav";
import { PriceCompare } from "@/components/PriceCompare";
import { HeroSearch } from "@/components/HeroSearch";
import { site } from "@/site.config";
import { BP } from "@/lib/basepath";
// Section order follows templates/marketing-site.md: nav → hero → audience → steps → feature rows → stats → integrations → pricing → final CTA → footer.
const Shot = ({ src, alt }: { src: string; alt: string }) => <img className="mk-shot" src={`${BP}/home/${src}`} alt={alt} />;
export function Marketing() {
  const h = site.hero;
  const ctas = <><Link className="ids-btn ids-btn--primary" href={h.primary.href}>{h.primary.label}</Link>{h.secondary && <Link className="ids-btn ids-btn--outline" href={h.secondary.href}>{h.secondary.label}</Link>}</>;
  const title = <>{h.title.map((l, i) => <span key={i}>{l}{i < h.title.length - 1 && <br />}</span>)}</>;
  return <div className="mk" data-hero={h.variant}>
    <SiteNav />
    {h.variant === "split" ? <header className="mk-hero mk-hero--split"><div className="mk-hero__copy"><Pill>{h.eyebrow}</Pill><h1 className="ids-h1">{title}</h1><p className="ids-muted mk-lede">{h.subtitle}</p><div className="mk-actions">{ctas}</div></div><div className="mk-hero__art"><Shot src={h.shot} alt={h.shotAlt} /></div></header>
      : <Hero eyebrow={<Pill>{h.eyebrow}</Pill>} title={title} subtitle={h.subtitle} actions={h.variant === "search" ? undefined : ctas}>
          {h.variant === "search" && <HeroSearch placeholder={h.searchPlaceholder ?? "Search"} chips={h.chips ?? []} cta={h.primary.label} />}
          <div className="mk-hero__shot"><Shot src={h.shot} alt={h.shotAlt} /></div></Hero>}
    <p className="ids-muted mk-audience">{site.audience}</p>
    <Section id="solutions" title={site.stepsTitle}><div className="ids-grid" style={{ marginTop: 48 }}>{site.steps.map((s, i) =>
      <div key={s.t} className="ids-card mk-step"><span className="ids-pill">{i + 1}</span><h3 className="ids-h3" style={{ margin: "16px 0 8px" }}>{s.t}</h3><p className="ids-muted" style={{ margin: 0 }}>{s.d}</p></div>)}</div></Section>
    {site.rows.map((r, i) => <Section key={r.id} id={r.id} style={{ paddingTop: 48, paddingBottom: 48 }}>
      <div className={"mk-row" + (i % 2 ? " mk-row--flip" : "")}>
        <div><span className="ids-pill">{r.k}</span><h2 className="ids-h2 mk-row__h">{r.h}</h2><p className="ids-muted mk-lede">{r.p}</p><Link className="ids-btn ids-btn--outline" href="/login" style={{ marginTop: 12 }}>{r.cta}</Link></div>
        <div><Shot src={r.img} alt={r.alt} /></div></div></Section>)}
    <Section id="resources" title={site.statsTitle}><div className="mk-stats">{site.stats.map(s => <div key={s.b} className="ids-card"><b>{s.b}</b><span className="ids-muted">{s.s}</span></div>)}</div></Section>
    <Section title={site.integrations.title} subtitle={site.integrations.text} />
    <Section id="pricing" title={site.pricing.title}>
      <div style={{ marginTop: 32 }}><PriceCompare /></div>
      <p className="ids-muted" style={{ fontSize: 13 }}>{site.pricing.footnote} List prices as of {site.pricing.asOf}; check {site.pricing.vendor}'s pricing page for today's numbers.</p>
      <h3 className="ids-h2" style={{ textAlign: "center", margin: "56px 0 24px" }}>{site.pricing.featuresTitle}</h3>
      <div className="ids-card" style={{ padding: 8, overflowX: "auto" }}>
        <table className="mk-table" data-testid="feature-table"><thead><tr><th>Feature</th><th>{site.pricing.vendor} plan you'd need</th><th>{site.name}</th></tr></thead>
          <tbody>{site.pricing.features.map(f => <tr key={f.name}><td>{f.name}</td><td className="ids-muted">{f.plan}</td><td className="mk-yes">✓ Free</td></tr>)}</tbody></table></div>
    </Section>
    <section className="mk-final"><h2 className="ids-h1" style={{ fontSize: "var(--ids-type-3xl)" }}>{site.finalCta.title}</h2><p className="ids-muted mk-lede" style={{ margin: "12px auto 0" }}>{site.finalCta.sub}</p>
      <div className="mk-actions" style={{ justifyContent: "center", marginTop: 28 }}><Link className="ids-btn ids-btn--primary" href="/login">{site.cta}</Link><a className="ids-btn ids-btn--outline" href={site.repo}>View on GitHub</a></div></section>
    <Footer columns={site.footer} note={site.trademark} />
  </div>;
}
