// Direct-to-Blob uploads for the LoomIsDead Mac app. Vercel caps function request bodies at 4.5 MB, so big
// recordings skip the function: the app asks for a one-off client token, PUTs the file straight to Vercel Blob,
// then registers it. Pure helpers here (unit-tested); routes in app/api/videos/direct/.
import { genId } from "@/lib/video";

export const DIRECT = { maxBytes: 500 * 1024 * 1024, types: ["video/mp4", "video/quicktime", "video/webm"] as string[], tokenTtlMs: 3600_000, prefix: "videos/" };

/** Body of POST /api/videos/direct. Returns an error message, or null when it is fine. */
export function validateDirectRequest(b: unknown): string | null {
  const o = (b && typeof b === "object" ? b : {}) as { size?: unknown; contentType?: unknown };
  const size = Number(o.size);
  if (!Number.isFinite(size) || size <= 0) return "Tell us how big the video is.";
  if (size > DIRECT.maxBytes) return "Videos can be up to 500 MB.";
  if (typeof o.contentType !== "string" || !DIRECT.types.includes(o.contentType)) return "Only MP4, MOV or WebM videos can be uploaded.";
  return null;
}

const EXT: Record<string, string> = { "video/mp4": "mp4", "video/quicktime": "mov", "video/webm": "webm" };
/** Blob pathname for a new upload. The random id makes the public URL unguessable. */
export const directPathname = (contentType: string, rand: () => number = Math.random) => `${DIRECT.prefix}${genId(rand, 20)}.${EXT[contentType] ?? "mp4"}`;

/** Read-write tokens look like vercel_blob_rw_<storeId>_<secret>; public blobs live on <storeid>.public.blob.vercel-storage.com. */
export function blobHostFromToken(token: string | undefined): string | null {
  const m = /^vercel_blob_rw_([A-Za-z0-9]+)_/.exec(token ?? ""); return m ? `${m[1]!.toLowerCase()}.public.blob.vercel-storage.com` : null;
}

/** Accept only https URLs on our own store, under videos/, with a pathname we would have issued. */
export function checkBlobUrl(raw: unknown, host: string | null): URL | null {
  if (typeof raw !== "string" || !host) return null;
  let u: URL; try { u = new URL(raw); } catch { return null; }
  if (u.protocol !== "https:" || u.host !== host || u.username || u.password || u.search || u.hash) return null;
  return /^\/videos\/[a-z0-9]{8,40}\.(mp4|mov|webm)$/.test(u.pathname) ? u : null;
}
