import { describe, it, expect } from "vitest";
import { yearlyCost, fmtUsd } from "@/lib/pricing";
describe("price comparison", () => {
  it("scales per seat", () => expect(yearlyCost({ perSeatMonth: 10 }, 5)).toBe(600));
  it("flat plans ignore seats", () => expect(yearlyCost({ perSeatMonth: 28, flat: true }, 40)).toBe(336));
  it("one-time licenses are per person", () => expect(yearlyCost({ perSeatMonth: 0, oneTime: 35 }, 3)).toBe(105));
  it("formats dollars", () => expect(fmtUsd(12345)).toBe("$12,345"));
});
