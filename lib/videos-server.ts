// Server-side videos: metadata and bytes via lib/store.ts (Firestore in production, files in dev).
// Vercel request bodies cap at 4.5 MB, so production sets NEXT_PUBLIC_MAX_UPLOAD_MB=4. Larger videos need object storage with signed uploads (README "Gaps").
import crypto from "node:crypto"; import fs from "node:fs/promises"; import path from "node:path";
import { getDoc, putDoc, delDoc, listDocs, putBlob, getBlob, delBlob } from "@/lib/store";
import { genId, cleanTitle, cleanDuration, cleanComment, isReaction, validateUpload, sniffVideo, LIMITS, type VideoMeta, type Comment, type Reaction } from "@/lib/video";
const COL = "videos";
const chain = new Map<string, Promise<unknown>>();
function locked<T>(k: string, fn: () => Promise<T>): Promise<T> { const prev = chain.get(k) ?? Promise.resolve(); const next = prev.then(fn, fn); chain.set(k, next.catch(() => {})); return next; }

export async function createVideo(owner: { id: string; name: string } | null, bytes: Uint8Array, o: { title?: string; duration?: unknown; thumb?: Buffer | null; createdAt?: string }): Promise<{ video?: VideoMeta; error?: string }> {
  const type = sniffVideo(bytes); if (!type) return { error: "That file isn't a WebM or MP4 video." };
  const duration = cleanDuration(o.duration); const bad = validateUpload(bytes.length, duration); if (bad) return { error: bad };
  let id = genId(); while (await getDoc(COL, id)) id = genId();
  await putBlob("video", id, bytes); if (o.thumb) await putBlob("thumb", id, o.thumb);
  const v: VideoMeta = { id, ownerId: owner?.id ?? null, ownerName: owner?.name ?? "Guest", title: cleanTitle(o.title ?? ""), duration, size: bytes.length, type, hasThumb: !!o.thumb, createdAt: o.createdAt ?? new Date().toISOString(), views: 0, comments: [], reactions: [], deleteKey: crypto.randomBytes(12).toString("base64url") };
  await putDoc(COL, id, v); return { video: v };
}
export const getVideo = (id: string) => getDoc<VideoMeta>(COL, id);
export async function removeVideo(id: string) { await delDoc(COL, id); await delBlob("video", id); await delBlob("thumb", id); }
export async function listVideos(ownerId: string, demo = false): Promise<VideoMeta[]> {
  if (demo && !(await getDoc("seeded", "videos-" + ownerId))) { await putDoc("seeded", "videos-" + ownerId, { at: Date.now() }); await seedDemo(ownerId); }
  return (await listDocs<VideoMeta>(COL)).filter(v => v.ownerId === ownerId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
export const updateTitle = (id: string, title: string) => locked(id, async () => { const v = await getVideo(id); if (!v) return null; v.title = cleanTitle(title, v.title); await putDoc(COL, id, v); return v; });
export const recordView = (id: string) => locked(id, async () => { const v = await getVideo(id); if (!v) return null; v.views++; await putDoc(COL, id, v); return v.views; });
export const addComment = (id: string, who: { id: string | null; name: string | null }, text: unknown, name: unknown, at: unknown) => locked(id, async (): Promise<{ comment?: Comment; error?: string }> => {
  const v = await getVideo(id); if (!v) return { error: "Video not found." }; if (v.comments.length >= LIMITS.comments) return { error: "This video has reached the comment limit." };
  const c = cleanComment(text, who.name ?? name, at, v.duration); if (typeof c === "string") return { error: c };
  const comment: Comment = { id: genId(Math.random, 10), ...c, createdAt: new Date().toISOString(), userId: who.id }; v.comments.push(comment); await putDoc(COL, id, v); return { comment };
});
export const deleteComment = (id: string, cid: string) => locked(id, async () => { const v = await getVideo(id); if (!v) return false; const n = v.comments.length; v.comments = v.comments.filter(c => c.id !== cid); await putDoc(COL, id, v); return v.comments.length < n; });
export const addReaction = (id: string, emoji: unknown, at: unknown) => locked(id, async () => {
  const v = await getVideo(id); if (!v || !isReaction(emoji)) return null; if (v.reactions.length >= 2000) return v;
  const a = Number(at); v.reactions.push({ emoji: emoji as Reaction, at: Number.isFinite(a) ? Math.min(Math.max(0, Math.round(a * 10) / 10), v.duration) : 0 }); await putDoc(COL, id, v); return v;
});
/** Whole media file (videos are capped at a few MB in production, see LIMITS.bytes). */
export const readMedia = (id: string, name: "video" | "thumb.jpg") => getBlob(name === "video" ? "video" : "thumb", id);

// crude per-process rate limit
const hits = new Map<string, number[]>();
export function rateLimited(key: string, max = 60, windowMs = 3600_000, now = Date.now()): boolean { const a = (hits.get(key) ?? []).filter(x => now - x < windowMs); if (a.length >= max) { hits.set(key, a); return true; } a.push(now); hits.set(key, a); return false; }

async function seedDemo(ownerId: string) {
  const seeds = [
    { f: "product-tour", title: "Weekly product update", ago: 2 * 3600e3, views: 14, comments: [{ name: "Maya Chen", text: "Love the new onboarding flow. Can we ship it Thursday?", at: 3 }, { name: "Dev Patel", text: "The empty state at 0:05 is great.", at: 5 }], reactions: ["👍", "🎉", "🔥", "👍"] },
    { f: "bug-walkthrough", title: "Bug report: checkout button unresponsive", ago: 30 * 3600e3, views: 6, comments: [{ name: "Sam Ortiz", text: "Reproduced on Safari 18 too.", at: 2.5 }], reactions: ["👏"] },
    { f: "design-feedback", title: "Design feedback on the pricing page", ago: 5 * 86400e3, views: 31, comments: [], reactions: ["❤️", "❤️"] },
  ];
  for (const s of seeds) {
    let bytes: Buffer, thumb: Buffer | null = null; const base = path.join(process.cwd(), "seed");
    try { bytes = await fs.readFile(path.join(base, s.f + ".webm")); } catch { continue; } try { thumb = await fs.readFile(path.join(base, s.f + ".jpg")); } catch { /* optional */ }
    const r = await createVideo({ id: ownerId, name: "Demo User" }, bytes, { title: s.title, duration: 6, thumb, createdAt: new Date(Date.now() - s.ago).toISOString() }); if (!r.video) continue;
    r.video.views = s.views; r.video.comments = s.comments.map((c, i) => ({ id: "seed" + i, name: c.name, text: c.text, at: c.at, createdAt: new Date(Date.now() - s.ago + 60e3 * (i + 1)).toISOString(), userId: null }));
    r.video.reactions = s.reactions.map((e, i) => ({ emoji: e as Reaction, at: 1 + i })); await putDoc(COL, r.video.id, r.video);
  }
}
