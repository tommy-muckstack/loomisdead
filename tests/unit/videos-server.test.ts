import { describe, it, expect, beforeAll } from "vitest";
import os from "node:os"; import path from "node:path"; import fs from "node:fs";
let S: typeof import("@/lib/videos-server");
const WEBM = new Uint8Array([0x1a, 0x45, 0xdf, 0xa3, ...new Array(100).fill(7)]);
const owner = { id: "u1", name: "Ada" };
beforeAll(async () => { process.env["ISDEAD_DATA_DIR"] = fs.mkdtempSync(path.join(os.tmpdir(), "lm-")); S = await import("@/lib/videos-server"); });
describe("videos", () => {
  it("stores a video with its thumbnail and lists it for the owner only", async () => {
    const r = await S.createVideo(owner, WEBM, { title: "  Demo  ", duration: 12.34, thumb: Buffer.from([0xff, 0xd8, 0xff]) }); const v = r.video!;
    expect(v.title).toBe("Demo"); expect(v.duration).toBe(12.3); expect(v.type).toBe("video/webm"); expect(v.hasThumb).toBe(true); expect((await S.readMedia(v.id, "video"))?.length).toBe(WEBM.length); expect((await S.readMedia(v.id, "thumb.jpg"))?.length).toBe(3);
    expect((await S.listVideos("u1")).map(x => x.id)).toContain(v.id); expect(await S.listVideos("u2")).toEqual([]);
  });
  it("rejects non-video bytes and empty or over-long uploads", async () => {
    expect((await S.createVideo(owner, new TextEncoder().encode("<script>"), {})).error).toMatch(/WebM or MP4/); expect((await S.createVideo(owner, WEBM, { duration: 99999 })).video?.duration).toBe(3600);
  });
  it("renames, counts views atomically and removes files on delete", async () => {
    const v = (await S.createVideo(owner, WEBM, { title: "A", duration: 5 })).video!; expect((await S.updateTitle(v.id, "  New  "))!.title).toBe("New"); expect((await S.updateTitle(v.id, "   "))!.title).toBe("New");
    await Promise.all(Array.from({ length: 25 }, () => S.recordView(v.id))); expect((await S.getVideo(v.id))!.views).toBe(25);
    expect(await S.readMedia(v.id, "video")).not.toBeNull(); await S.removeVideo(v.id); expect(await S.getVideo(v.id)).toBeNull(); expect(await S.readMedia(v.id, "video")).toBeNull();
  });
  it("adds, validates and deletes comments; reactions stay valid", async () => {
    const v = (await S.createVideo(owner, WEBM, { duration: 10 })).video!;
    expect((await S.addComment(v.id, { id: null, name: null }, "  ", "x", 1)).error).toBeTruthy();
    const c = (await S.addComment(v.id, { id: null, name: null }, "Nice cut", "Guest Bob", 99)).comment!; expect(c.name).toBe("Guest Bob"); expect(c.at).toBe(10);
    const c2 = (await S.addComment(v.id, { id: "u9", name: "Signed In" }, "Hi", "ignored", 2)).comment!; expect(c2.name).toBe("Signed In"); expect(c2.userId).toBe("u9");
    expect(await S.deleteComment(v.id, c.id)).toBe(true); expect((await S.getVideo(v.id))!.comments).toHaveLength(1);
    expect(await S.addReaction(v.id, "💩", 1)).toBeNull(); expect((await S.addReaction(v.id, "🔥", 3))!.reactions).toEqual([{ emoji: "🔥", at: 3 }]); expect((await S.addComment("nope", { id: null, name: null }, "x", "", 0)).error).toBe("Video not found.");
  });
  it("registers a Blob-hosted upload without storing bytes", async () => {
    const r = await S.createVideoFromBlob(owner, { url: "https://h.public.blob.vercel-storage.com/videos/abcdefghijkmnpqrstuv.mp4", size: 5_000_000, type: "video/mp4" }, { title: "Mac", duration: 42, thumb: null }); const v = r.video!;
    expect(v.blobUrl).toMatch(/videos\/abcdefghijkmnpqrstuv\.mp4$/); expect(v.size).toBe(5_000_000); expect(v.duration).toBe(42); expect(await S.readMedia(v.id, "video")).toBeNull();
    expect((await S.createVideoFromBlob(owner, { url: "u", size: 0, type: "video/mp4" }, {})).error).toMatch(/empty/);
  });
  it("seeds the demo account once and rate-limits", async () => {
    const a = await S.listVideos("demo", true); expect(a.length).toBe(3); expect(a[0]!.hasThumb).toBe(true); expect(a.some(x => x.comments.length > 0)).toBe(true); expect((await S.listVideos("demo", true)).length).toBe(3);
    expect(S.rateLimited("k", 2, 1000, 0)).toBe(false); expect(S.rateLimited("k", 2, 1000, 1)).toBe(false); expect(S.rateLimited("k", 2, 1000, 2)).toBe(true); expect(S.rateLimited("k", 2, 1000, 5000)).toBe(false);
  });
});
