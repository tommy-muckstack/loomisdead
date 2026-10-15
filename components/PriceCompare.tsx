"use client";
import { useState } from "react";
import { site } from "@/site.config";
import { yearlyCost, fmtUsd } from "@/lib/pricing";
export function PriceCompare() {
  const p = site.pricing; const [seats, setSeats] = useState(p.seats);
  return <div className="mk-price">
    {!p.plans.every(x => x.flat) && <div className="ids-card mk-price__seats"><label htmlFor="seats" className="ids-label" style={{ marginTop: 0 }}>How many people?</label>
      <div style={{ display: "flex", gap: 16, alignItems: "center" }}><input id="seats" type="range" min={1} max={100} value={seats} onChange={e => setSeats(+e.target.value)} style={{ flex: 1, accentColor: "var(--ids-color-accent)" }} /><b data-testid="seats" style={{ minWidth: 28, textAlign: "right" }}>{seats}</b></div></div>}
    <div className="mk-price__grid">
      {p.plans.map(pl => <div key={pl.name} className="ids-card mk-price__plan"><div className="ids-muted" style={{ fontWeight: 600 }}>{p.vendor} {pl.name}</div>
        <div className="mk-price__amt" data-testid={`cost-${pl.name}`}>{fmtUsd(yearlyCost(pl, seats))}<small>{pl.oneTime != null ? " first year" : "/year"}</small></div><div className="ids-muted" style={{ fontSize: 13 }}>{pl.oneTime != null ? `$${pl.oneTime} per person, one time` : pl.flat ? `$${pl.perSeatMonth}/mo per account` : `$${pl.perSeatMonth}/person/mo`} · {pl.note}</div></div>)}
      <div className="ids-card mk-price__plan mk-price__ours"><div style={{ fontWeight: 700 }}>{site.name}</div><div className="mk-price__amt" data-testid="cost-ours">$0<small>/year</small></div><div style={{ fontSize: 13 }}>Every feature, for everyone, forever. Open source (Apache-2.0).</div></div>
    </div>
  </div>;
}
