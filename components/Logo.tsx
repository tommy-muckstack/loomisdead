import { site } from "@/site.config";
export function Logo({ size = 28 }: { size?: number }) {
  return <span style={{ display: "inline-flex", alignItems: "center", gap: 10, fontFamily: "var(--ids-font-display)", fontWeight: 700, fontSize: size * 0.72, letterSpacing: "var(--ids-type-tracking)" }}>
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden><rect width="24" height="24" rx="7" fill="var(--ids-color-accent)" /><path d={site.glyph} fill="none" stroke="var(--ids-color-on-accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
    {site.name}
  </span>;
}
