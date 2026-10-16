import { site } from "@/site.config";
/** The IsDead tombstone-with-X in LoomIsDead blue (same art as app/icon.svg and the Mac app icon). */
export function Mark({ size = 28 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden><rect width="32" height="32" rx="8" fill="#1868DB" /><g fill="#FFFFFF"><path d="M16 5.5a8 8 0 0 1 8 8V24H8V13.5a8 8 0 0 1 8-8z" /><rect x="5" y="23" width="22" height="4.5" rx="1.6" /></g><path d="M12.2 11.8l7.6 7.6M19.8 11.8l-7.6 7.6" stroke="#1868DB" strokeWidth="2.6" strokeLinecap="round" fill="none" /></svg>;
}
export function Logo({ size = 28 }: { size?: number }) {
  return <span style={{ display: "inline-flex", alignItems: "center", gap: 10, fontFamily: "var(--ids-font-display)", fontWeight: 700, fontSize: size * 0.72, letterSpacing: "var(--ids-type-tracking)" }}>
    <Mark size={size} />
    {site.name}
  </span>;
}
