import { describe, it, expect } from "vitest";
import { GET } from "@/app/download/route";
import config from "@/next.config.mjs";

describe("/download", () => {
  it("307s to the latest GitHub release DMG", () => {
    const res = GET();
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("https://github.com/tommy-muckstack/loomisdead/releases/latest/download/LoomIsDead.dmg");
  });
});

describe("old web-app URLs", () => {
  it("permanently redirect to the homepage", async () => {
    const rules = await config.redirects();
    for (const source of ["/app", "/app/:path*", "/login", "/pricing", "/compare"]) expect(rules).toContainEqual({ source, destination: "/", permanent: true });
  });
  it("leave share links, video APIs and guest sessions alone", async () => {
    const sources = (await config.redirects()).map((r: { source: string }) => r.source);
    for (const s of sources) expect(s).not.toMatch(/^\/(v|api\/videos|api\/session\/guest|download)\b/);
  });
});
