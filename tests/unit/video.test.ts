import { describe, it, expect } from "vitest";
import { genId, validId, sniffVideo, cleanTitle, cleanDuration, validateUpload, formatBytes, formatTime, timeAgo, cleanComment, sortComments, reactionCounts, parseRange, dataUrlJpeg, isReaction, LIMITS, viewsLabel, toPublic, type VideoMeta } from "@/lib/video";
describe("video model", () => {
  it("makes valid ids", () => { const id = genId(); expect(id).toHaveLength(12); expect(validId(id)).toBe(true); expect(validId("../etc")).toBe(false); expect(validId(5)).toBe(false); expect(validId("ABCDEFGHIJKL")).toBe(false); });
  it("sniffs containers from magic bytes, not names", () => {
    expect(sniffVideo(new Uint8Array([0x1a, 0x45, 0xdf, 0xa3, 0, 0]))).toBe("video/webm"); expect(sniffVideo(new Uint8Array([0, 0, 0, 0x18, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d]))).toBe("video/mp4");
    expect(sniffVideo(new TextEncoder().encode("<html>nope</html>"))).toBeNull(); expect(sniffVideo(new Uint8Array(2))).toBeNull();
  });
  it("cleans titles and durations", () => {
    expect(cleanTitle("  Hello\n <b>world</b>  ")).toBe("Hello b world /b"); expect(cleanTitle("   ")).toBe("Untitled recording"); expect(cleanTitle("x".repeat(500))).toHaveLength(LIMITS.title);
    expect(cleanDuration("12.34")).toBe(12.3); expect(cleanDuration(-4)).toBe(0); expect(cleanDuration("abc")).toBe(0); expect(cleanDuration(1e9)).toBe(LIMITS.seconds);
  });
  it("validates uploads", () => { expect(validateUpload(0, 5)).toMatch(/empty/); expect(validateUpload(LIMITS.bytes + 1, 5)).toMatch(/larger/); expect(validateUpload(10, LIMITS.seconds + 1)).toMatch(/60 minutes/); expect(validateUpload(10, 5)).toBeNull(); });
  it("formats sizes, times and ages", () => {
    expect(formatBytes(900)).toBe("900 B"); expect(formatBytes(1536)).toBe("1.5 KB"); expect(formatBytes(5 * 1048576)).toBe("5.0 MB"); expect(formatTime(0)).toBe("0:00"); expect(formatTime(65.9)).toBe("1:05"); expect(formatTime(3725)).toBe("1:02:05");
    const now = Date.parse("2026-10-14T12:00:00Z"); expect(timeAgo("2026-10-14T11:59:30Z", now)).toBe("just now"); expect(timeAgo("2026-10-14T11:00:00Z", now)).toBe("1 hour ago"); expect(timeAgo("2026-10-12T12:00:00Z", now)).toBe("2 days ago"); expect(viewsLabel(1)).toBe("1 view"); expect(viewsLabel(3)).toBe("3 views");
  });
  it("cleans comments, clamps the timestamp to the video", () => {
    expect(cleanComment("  ", "a", 1, 10)).toBe("Write a comment first."); expect(cleanComment("x".repeat(600), "a", 1, 10)).toMatch(/500/);
    expect(cleanComment("Nice!", "", 99, 10)).toEqual({ name: "Guest", text: "Nice!", at: 10 }); expect(cleanComment("Hi", "<Bob>", -5, 10)).toEqual({ name: "Bob", text: "Hi", at: 0 }); expect(cleanComment("Hi", "Al", "nope", 10)).toEqual({ name: "Al", text: "Hi", at: 0 });
  });
  it("sorts comments by time and counts reactions", () => {
    const c = (id: string, at: number, createdAt: string) => ({ id, name: "n", text: "t", at, createdAt, userId: null });
    expect(sortComments([c("b", 5, "2026-01-02"), c("a", 2, "2026-01-03"), c("c", 5, "2026-01-01")]).map(x => x.id)).toEqual(["a", "c", "b"]);
    expect(reactionCounts([{ emoji: "👍", at: 1 }, { emoji: "👍", at: 2 }, { emoji: "🔥", at: 3 }])).toEqual({ "👍": 2, "🔥": 1 }); expect(isReaction("👍")).toBe(true); expect(isReaction("💩")).toBe(false);
  });
  it("parses Range headers per RFC 7233", () => {
    expect(parseRange(null, 100)).toBeNull(); expect(parseRange("bytes=0-9", 100)).toEqual({ start: 0, end: 9 }); expect(parseRange("bytes=90-", 100)).toEqual({ start: 90, end: 99 }); expect(parseRange("bytes=-10", 100)).toEqual({ start: 90, end: 99 });
    expect(parseRange("bytes=50-5000", 100)).toEqual({ start: 50, end: 99 }); expect(parseRange("bytes=100-", 100)).toBe("bad"); expect(parseRange("bytes=9-3", 100)).toBe("bad"); expect(parseRange("bytes=-0", 100)).toBe("bad"); expect(parseRange("items=1-2", 100)).toBe("bad"); expect(parseRange("bytes=-", 100)).toBe("bad");
  });
  it("accepts only real small JPEG data URLs as thumbnails", () => {
    const ok = "data:image/jpeg;base64," + Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]).toString("base64"); expect(dataUrlJpeg(ok)).toBeInstanceOf(Buffer);
    expect(dataUrlJpeg("data:image/png;base64,AAAA")).toBeNull(); expect(dataUrlJpeg("data:image/jpeg;base64," + Buffer.from("not a jpeg").toString("base64"))).toBeNull(); expect(dataUrlJpeg(5)).toBeNull();
    expect(dataUrlJpeg("data:image/jpeg;base64," + Buffer.concat([Buffer.from([0xff, 0xd8]), Buffer.alloc(LIMITS.thumb)]).toString("base64"))).toBeNull();
  });
  it("never leaks owner or delete key publicly", () => { const v = { id: "a", ownerId: "u", deleteKey: "k", title: "t" } as unknown as VideoMeta; const p = toPublic(v) as Record<string, unknown>; expect(p["ownerId"]).toBeUndefined(); expect(p["deleteKey"]).toBeUndefined(); expect(p["title"]).toBe("t"); });
});
