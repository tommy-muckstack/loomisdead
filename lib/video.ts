// Pure video model: ids, validation, formatting, comments, Range parsing. No I/O so it is unit-tested.
export const LIMITS = { bytes: (Number(process.env.NEXT_PUBLIC_MAX_UPLOAD_MB) || 150) * 1024 * 1024, seconds: 60 * 60, title: 120, comment: 500, thumb: 400_000, comments: 500 };
export const REACTIONS = ["👍", "❤️", "😂", "🎉", "👏", "🔥"] as const;
export type Reaction = (typeof REACTIONS)[number];
export type Comment = { id: string; name: string; text: string; at: number; createdAt: string; userId: string | null };
export type VideoMeta = { id: string; ownerId: string | null; ownerName: string; title: string; duration: number; size: number; type: string; hasThumb: boolean; createdAt: string; views: number; comments: Comment[]; reactions: { emoji: Reaction; at: number }[]; deleteKey: string };
export type PublicVideo = Omit<VideoMeta, "deleteKey" | "ownerId">;
export const toPublic = ({ deleteKey: _k, ownerId: _o, ...rest }: VideoMeta): PublicVideo => rest;

const ALPHA = "abcdefghijkmnpqrstuvwxyz23456789";
export function genId(rand: () => number = Math.random, len = 12): string { let s = ""; for (let i = 0; i < len; i++) s += ALPHA[Math.floor(rand() * ALPHA.length)]; return s; }
export const validId = (s: unknown): s is string => typeof s === "string" && /^[a-z0-9]{8,24}$/.test(s);

/** Containers a browser can play and that MediaRecorder / phones produce. Sniffed from magic bytes, not from the file name. */
export function sniffVideo(b: Uint8Array): "video/webm" | "video/mp4" | null {
  if (b.length >= 4 && b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3) return "video/webm";
  if (b.length >= 12 && String.fromCharCode(b[4]!, b[5]!, b[6]!, b[7]!) === "ftyp") return "video/mp4";
  return null;
}
export function cleanTitle(s: string, fallback = "Untitled recording"): string {
  const t = s.replace(/[\u0000-\u001f\u007f<>]/g, " ").replace(/\s+/g, " ").trim().slice(0, LIMITS.title); return t || fallback;
}
export function defaultTitle(d = new Date()): string { return "Recording " + d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) + " at " + d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }); }
export function cleanDuration(n: unknown): number { const x = Number(n); return Number.isFinite(x) && x > 0 ? Math.min(Math.round(x * 10) / 10, LIMITS.seconds) : 0; }
export function validateUpload(size: number, durationSec: number): string | null {
  if (size <= 0) return "That recording is empty."; if (size > LIMITS.bytes) return `That video is larger than ${formatBytes(LIMITS.bytes)}.`;
  if (durationSec > LIMITS.seconds) return "Videos can be up to 60 minutes long."; return null;
}
export function formatBytes(n: number): string { if (n < 1024) return n + " B"; if (n < 1048576) return (n / 1024).toFixed(n < 10240 ? 1 : 0) + " KB"; if (n < 1073741824) return (n / 1048576).toFixed(n < 10485760 ? 1 : 0) + " MB"; return (n / 1073741824).toFixed(1) + " GB"; }
export function formatTime(sec: number): string { const s = Math.max(0, Math.floor(sec)); const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60; return (h ? h + ":" + String(m).padStart(2, "0") : String(m)) + ":" + String(r).padStart(2, "0"); }
export function timeAgo(iso: string, now = Date.now()): string {
  const s = Math.max(0, (now - new Date(iso).getTime()) / 1000); if (s < 60) return "just now"; if (s < 3600) return Math.floor(s / 60) + " min ago";
  if (s < 86400) { const h = Math.floor(s / 3600); return h + (h === 1 ? " hour ago" : " hours ago"); } const d = Math.floor(s / 86400); if (d < 30) return d + (d === 1 ? " day ago" : " days ago");
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
export const viewsLabel = (n: number) => `${n} view${n === 1 ? "" : "s"}`;

export function cleanComment(text: unknown, name: unknown, at: unknown, duration: number): { name: string; text: string; at: number } | string {
  const t = String(text ?? "").replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, "").trim(); if (!t) return "Write a comment first."; if (t.length > LIMITS.comment) return `Comments can be up to ${LIMITS.comment} characters.`;
  const n = String(name ?? "").replace(/[\u0000-\u001f\u007f<>]/g, "").trim().slice(0, 40) || "Guest"; const a = Number(at); const pos = Number.isFinite(a) ? Math.min(Math.max(0, a), Math.max(0, duration)) : 0;
  return { name: n, text: t, at: Math.round(pos * 10) / 10 };
}
export const isReaction = (e: unknown): e is Reaction => (REACTIONS as readonly unknown[]).includes(e);
export const sortComments = (c: Comment[]) => [...c].sort((a, b) => a.at - b.at || a.createdAt.localeCompare(b.createdAt));
export function reactionCounts(r: VideoMeta["reactions"] | PublicVideo["reactions"]): Record<string, number> { const o: Record<string, number> = {}; for (const x of r) o[x.emoji] = (o[x.emoji] ?? 0) + 1; return o; }

/** RFC 7233 single-range parsing. null → serve whole file; "bad" → 416. */
export function parseRange(header: string | null, size: number): { start: number; end: number } | null | "bad" {
  if (!header) return null; const m = /^bytes=(\d*)-(\d*)$/.exec(header.trim()); if (!m || (m[1] === "" && m[2] === "")) return "bad";
  let start: number, end: number;
  if (m[1] === "") { const n = Number(m[2]); if (n === 0) return "bad"; start = Math.max(0, size - n); end = size - 1; } else { start = Number(m[1]); end = m[2] === "" ? size - 1 : Math.min(Number(m[2]), size - 1); }
  if (start >= size || start > end) return "bad"; return { start, end };
}
export function dataUrlJpeg(s: unknown): Buffer | null {
  if (typeof s !== "string") return null; const m = /^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/.exec(s); if (!m) return null;
  const b = Buffer.from(m[1]!, "base64"); if (b.length < 4 || b.length > LIMITS.thumb || b[0] !== 0xff || b[1] !== 0xd8) return null; return b;
}
