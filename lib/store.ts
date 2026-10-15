// Tiny server-side JSON document store for features that need to work across browsers (shared links).
// Dev/demo: files under $ISDEAD_DATA_DIR (default: .data/ in the app dir). On Vercel the filesystem is
// ephemeral, so production must swap this for Firestore (same shape: collection/id → JSON). See README "Gaps".
import fs from "node:fs/promises";
import path from "node:path";
export const dataDir = () => process.env["ISDEAD_DATA_DIR"] ?? path.join(process.env["VERCEL"] ? "/tmp" : process.cwd(), ".data");
const safe = (s: string) => s.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 80);
export async function getDoc<T>(col: string, id: string): Promise<T | null> {
  try { return JSON.parse(await fs.readFile(path.join(dataDir(), safe(col), safe(id) + ".json"), "utf8")) as T; } catch { return null; }
}
export async function putDoc<T>(col: string, id: string, doc: T): Promise<void> {
  const d = path.join(dataDir(), safe(col)); await fs.mkdir(d, { recursive: true });
  await fs.writeFile(path.join(d, safe(id) + ".json"), JSON.stringify(doc));
}
export async function listDocs<T>(col: string): Promise<T[]> {
  const d = path.join(dataDir(), safe(col));
  let names: string[] = []; try { names = await fs.readdir(d); } catch { return []; }
  const out: T[] = []; for (const n of names) if (n.endsWith(".json")) { try { out.push(JSON.parse(await fs.readFile(path.join(d, n), "utf8"))); } catch { /* skip */ } }
  return out;
}
export async function delDoc(col: string, id: string) { try { await fs.unlink(path.join(dataDir(), safe(col), safe(id) + ".json")); } catch { /* ok */ } }
