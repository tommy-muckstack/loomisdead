import { describe, it, expect } from "vitest";
import { EVENTS, EVENT_PREFIXES, APP, superProps } from "@/lib/analytics/taxonomy";
describe("analytics taxonomy", () => {
  it("uses the shared prefixes and snake_case", () => { for (const e of Object.values(EVENTS)) { expect(e, e).toMatch(/^[a-z]+(_[a-z]+)+$/); expect(EVENT_PREFIXES.some(p => e.startsWith(p)), e).toBe(true); } });
  it("never puts the product name in an event name", () => { for (const e of Object.values(EVENTS)) expect(e.includes(APP.replace(/isdead$/, ""))).toBe(false); });
  it("sends the hub's super properties", () => { expect(superProps("app")).toEqual({ product: APP, surface: "app", platform: "web" }); });
});
import { scrub } from "@/lib/analytics/posthog";
describe("analytics privacy", () => {
  it("strips query strings, hashes and titles", () => {
    const e = scrub({ event: "$pageview", properties: { $current_url: "https://yourappisdead.com/x/app?url=https://secret.example#frag", $referrer: "https://google.com/search?q=me", title: "My private doc" } });
    expect(e.properties.$current_url).toBe("https://yourappisdead.com/x/app"); expect(e.properties.$referrer).toBe("https://google.com/search"); expect("title" in e.properties).toBe(false);
  });
  it("masks private link ids", () => {
    const e = scrub({ event: "$pageview", properties: { $current_url: "https://yourappisdead.com/loomisdead/v/abc123?q=secret#h", title: "Someone's file", n: 1 } });
    expect(e.properties).toEqual({ $current_url: "https://yourappisdead.com/loomisdead/v/:id", n: 1 });
  });
  it("cleans every URL-like key, including nested $set / $set_once person properties", () => {
    const e = scrub({ event: "$pageview", properties: { $session_entry_url: "https://yourappisdead.com/loomisdead/v/abc123?ref=x#y", $session_entry_pathname: "/loomisdead/v/abc123", $set_once: { $initial_current_url: "https://yourappisdead.com/loomisdead/v/abc123?utm_source=x" } }, $set: { $current_url: "https://yourappisdead.com/loomisdead/?q=1" } });
    expect(e.properties.$session_entry_url).toBe("https://yourappisdead.com/loomisdead/v/:id"); expect(e.properties.$session_entry_pathname).toBe("/loomisdead/v/:id");
    expect(e.properties.$set_once.$initial_current_url).toBe("https://yourappisdead.com/loomisdead/v/:id"); expect(e.$set.$current_url).toBe("https://yourappisdead.com/loomisdead/");
  });
});
