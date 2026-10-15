export type PlanLike = { perSeatMonth: number; flat?: boolean; oneTime?: number };
/** First-year cost in USD. `flat` plans don't scale with people (per-account); `oneTime` is a per-person license fee. */
export const yearlyCost = (pl: PlanLike | number, seats: number) => {
  const p: PlanLike = typeof pl === "number" ? { perSeatMonth: pl } : pl;
  if (p.oneTime != null) return Math.round(p.oneTime * seats);
  return Math.round(p.perSeatMonth * 12 * (p.flat ? 1 : seats));
};
export const fmtUsd = (n: number) => "$" + n.toLocaleString("en-US");
