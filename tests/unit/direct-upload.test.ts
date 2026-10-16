import { describe, it, expect } from "vitest";
import { validateDirectRequest, directPathname, blobHostFromToken, checkBlobUrl, DIRECT } from "@/lib/direct-upload";
import { toPublic, type VideoMeta } from "@/lib/video";

const HOST = "teststore.public.blob.vercel-storage.com";
describe("direct upload request", () => {
  it("accepts an MP4 up to 500 MB", () => {
    expect(validateDirectRequest({ size: 1024, contentType: "video/mp4" })).toBeNull();
    expect(validateDirectRequest({ size: DIRECT.maxBytes, contentType: "video/quicktime" })).toBeNull();
  });
  it("rejects missing, empty, oversized and non-video uploads", () => {
    expect(validateDirectRequest(null)).toMatch(/how big/);
    expect(validateDirectRequest({ size: 0, contentType: "video/mp4" })).toMatch(/how big/);
    expect(validateDirectRequest({ size: "abc", contentType: "video/mp4" })).toMatch(/how big/);
    expect(validateDirectRequest({ size: DIRECT.maxBytes + 1, contentType: "video/mp4" })).toMatch(/500 MB/);
    expect(validateDirectRequest({ size: 10, contentType: "text/html" })).toMatch(/MP4/);
  });
  it("issues random pathnames under videos/ with the right extension", () => {
    const a = directPathname("video/mp4"), b = directPathname("video/mp4");
    expect(a).toMatch(/^videos\/[a-z0-9]{20}\.mp4$/); expect(a).not.toBe(b);
    expect(directPathname("video/quicktime")).toMatch(/\.mov$/); expect(directPathname("video/webm")).toMatch(/\.webm$/);
  });
});

describe("blob URL check", () => {
  it("derives the public host from the read-write token", () => {
    expect(blobHostFromToken("vercel_blob_rw_TestStore_x")).toBe(HOST);
    expect(blobHostFromToken(undefined)).toBeNull(); expect(blobHostFromToken("nope")).toBeNull();
  });
  it("accepts only our store, https, under videos/, with an issued-looking name", () => {
    const ok = `https://${HOST}/videos/abcdefghijkmnpqrstuv.mp4`;
    expect(checkBlobUrl(ok, HOST)?.toString()).toBe(ok);
    expect(checkBlobUrl(ok, null)).toBeNull();
    expect(checkBlobUrl(`http://${HOST}/videos/abcdefghijkmnpqrstuv.mp4`, HOST)).toBeNull();
    expect(checkBlobUrl(`https://evil.public.blob.vercel-storage.com/videos/abcdefghijkmnpqrstuv.mp4`, HOST)).toBeNull();
    expect(checkBlobUrl(`https://${HOST}/other/abcdefghijkmnpqrstuv.mp4`, HOST)).toBeNull();
    expect(checkBlobUrl(`https://${HOST}/videos/../secret.mp4`, HOST)).toBeNull();
    expect(checkBlobUrl(`https://${HOST}/videos/abcdefghijkmnpqrstuv.html`, HOST)).toBeNull();
    expect(checkBlobUrl(`${ok}?download=1`, HOST)).toBeNull();
    expect(checkBlobUrl(42, HOST)).toBeNull(); expect(checkBlobUrl("not a url", HOST)).toBeNull();
  });
  it("never exposes the blob URL in the public video shape", () => {
    const v = { id: "abcdefgh", ownerId: "u", ownerName: "Guest", title: "t", duration: 1, size: 1, type: "video/mp4", hasThumb: false, createdAt: "", views: 0, comments: [], reactions: [], deleteKey: "k", blobUrl: "https://x" } as VideoMeta;
    expect(Object.keys(toPublic(v))).not.toContain("blobUrl");
  });
});
