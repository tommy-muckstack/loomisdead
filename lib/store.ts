// Server-side JSON document store shared by the IsDead apps.
// Production (FIREBASE_SERVICE_ACCOUNT_JSON set): Firestore, collection "<app>__<col>", one doc per id (JSON string,
// chunked above ~900 KB because Firestore docs are capped at 1 MiB). Dev/demo (no Firebase env): files under
// $ISDEAD_DATA_DIR (default .data/). Same API either way: getDoc / putDoc / listDocs / delDoc.
import fs from "node:fs/promises";
import path from "node:path";

const safe = (s: string) => s.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 80);
export const useFirestore = () => !!process.env["FIREBASE_SERVICE_ACCOUNT_JSON"];
const appName = () => safe((process.env["NEXT_PUBLIC_BASE_PATH"] ?? "/app").replace(/\//g, "")) || "app";
const CHUNK = 900_000;

// ---- Firestore ----
let dbP: Promise<import("firebase-admin/firestore").Firestore> | null = null;
function db() {
  if (!dbP) dbP = (async () => {
    const { initializeApp, getApps, cert } = await import("firebase-admin/app");
    const { getFirestore } = await import("firebase-admin/firestore");
    const sa = JSON.parse(process.env["FIREBASE_SERVICE_ACCOUNT_JSON"]!);
    const app = getApps().find(a => a.name === "isdead") ?? initializeApp({ credential: cert(sa), projectId: sa.project_id }, "isdead");
    return getFirestore(app);
  })().catch(e => { dbP = null; throw e; });
  return dbP;
}
const colName = (col: string) => `${appName()}__${safe(col)}`;

async function fsGet<T>(col: string, id: string): Promise<T | null> {
  const c = (await db()).collection(colName(col)); const snap = await c.doc(safe(id)).get();
  if (!snap.exists) return null;
  const m = snap.data() as { d?: string; n?: number };
  let json = m.d ?? "";
  for (let i = 1; i < (m.n ?? 1); i++) json += ((await c.doc(`${safe(id)}~c${i}`).get()).data() as { d?: string } | undefined)?.d ?? "";
  try { return JSON.parse(json) as T; } catch { return null; }
}
async function fsPut<T>(col: string, id: string, doc: T) {
  const c = (await db()).collection(colName(col)); const json = JSON.stringify(doc); const n = Math.max(1, Math.ceil(json.length / CHUNK));
  const old = (await c.doc(safe(id)).get()).data() as { n?: number } | undefined;
  for (let i = 1; i < n; i++) await c.doc(`${safe(id)}~c${i}`).set({ d: json.slice(i * CHUNK, (i + 1) * CHUNK), part: true });
  for (let i = n; i < (old?.n ?? 1); i++) await c.doc(`${safe(id)}~c${i}`).delete();
  await c.doc(safe(id)).set({ d: json.slice(0, CHUNK), n, main: true, updatedAt: Date.now() });
}
async function fsList<T>(col: string): Promise<T[]> {
  const c = (await db()).collection(colName(col)); const snaps = await c.where("main", "==", true).get(); const out: T[] = [];
  for (const s of snaps.docs) { const v = await fsGet<T>(col, s.id); if (v !== null) out.push(v); }
  return out;
}
async function fsDel(col: string, id: string) {
  const c = (await db()).collection(colName(col)); const m = (await c.doc(safe(id)).get()).data() as { n?: number } | undefined;
  for (let i = 1; i < (m?.n ?? 1); i++) await c.doc(`${safe(id)}~c${i}`).delete();
  await c.doc(safe(id)).delete();
}

// ---- local files (dev) ----
export const dataDir = () => process.env["ISDEAD_DATA_DIR"] ?? path.join(process.env["VERCEL"] ? "/tmp" : process.cwd(), ".data");
async function fileGet<T>(col: string, id: string): Promise<T | null> {
  try { return JSON.parse(await fs.readFile(path.join(dataDir(), safe(col), safe(id) + ".json"), "utf8")) as T; } catch { return null; }
}
async function filePut<T>(col: string, id: string, doc: T) {
  const d = path.join(dataDir(), safe(col)); await fs.mkdir(d, { recursive: true });
  await fs.writeFile(path.join(d, safe(id) + ".json"), JSON.stringify(doc));
}
async function fileList<T>(col: string): Promise<T[]> {
  const d = path.join(dataDir(), safe(col));
  let names: string[] = []; try { names = await fs.readdir(d); } catch { return []; }
  const out: T[] = []; for (const n of names) if (n.endsWith(".json")) { try { out.push(JSON.parse(await fs.readFile(path.join(d, n), "utf8"))); } catch { /* skip */ } }
  return out;
}
async function fileDel(col: string, id: string) { try { await fs.unlink(path.join(dataDir(), safe(col), safe(id) + ".json")); } catch { /* ok */ } }

export const getDoc = <T>(col: string, id: string): Promise<T | null> => (useFirestore() ? fsGet<T>(col, id) : fileGet<T>(col, id));
export const putDoc = <T>(col: string, id: string, doc: T): Promise<void> => (useFirestore() ? fsPut(col, id, doc) : filePut(col, id, doc));
export const listDocs = <T>(col: string): Promise<T[]> => (useFirestore() ? fsList<T>(col) : fileList<T>(col));
export const delDoc = (col: string, id: string): Promise<void> => (useFirestore() ? fsDel(col, id) : fileDel(col, id));

// ---- binary blobs (small files; Vercel request bodies cap at 4.5 MB, so apps limit uploads to ~4 MB in production) ----
// Firestore: docs "<id>~b<i>" of up to 900 KB each in collection "<app>__blob_<col>"; dev: files under dataDir()/blobs/<col>/<id>.
const BCHUNK = 900_000;
export async function putBlob(col: string, id: string, bytes: Uint8Array): Promise<void> {
  if (!useFirestore()) { const d = path.join(dataDir(), "blobs", safe(col)); await fs.mkdir(d, { recursive: true }); await fs.writeFile(path.join(d, safe(id)), bytes); return; }
  const c = (await db()).collection(colName("blob_" + col)); const n = Math.max(1, Math.ceil(bytes.length / BCHUNK));
  for (let i = 0; i < n; i++) await c.doc(`${safe(id)}~b${i}`).set({ b: Buffer.from(bytes.subarray(i * BCHUNK, (i + 1) * BCHUNK)), i, n, size: bytes.length });
}
export async function getBlob(col: string, id: string): Promise<Buffer | null> {
  if (!useFirestore()) { try { return await fs.readFile(path.join(dataDir(), "blobs", safe(col), safe(id))); } catch { return null; } }
  const c = (await db()).collection(colName("blob_" + col)); const first = await c.doc(`${safe(id)}~b0`).get(); if (!first.exists) return null;
  const n = (first.data() as { n: number }).n; const parts: Buffer[] = [Buffer.from((first.data() as { b: Buffer }).b)];
  for (let i = 1; i < n; i++) { const s = await c.doc(`${safe(id)}~b${i}`).get(); if (!s.exists) return null; parts.push(Buffer.from((s.data() as { b: Buffer }).b)); }
  return Buffer.concat(parts);
}
export async function delBlob(col: string, id: string): Promise<void> {
  if (!useFirestore()) { try { await fs.unlink(path.join(dataDir(), "blobs", safe(col), safe(id))); } catch { /* ok */ } return; }
  const c = (await db()).collection(colName("blob_" + col)); const first = await c.doc(`${safe(id)}~b0`).get(); const n = first.exists ? (first.data() as { n: number }).n : 0;
  for (let i = 0; i < n; i++) await c.doc(`${safe(id)}~b${i}`).delete();
}
