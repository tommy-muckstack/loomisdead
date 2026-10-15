// Screenshot helper: serves the production build on a free port and hands a Playwright browser to `fn`.
import { spawn } from "node:child_process"; import fs from "node:fs";
import { chromium } from "@playwright/test";
export async function withApp(slug, fn, { port = 3100 + Math.floor(Math.random() * 500), args = [] } = {}) {
  const env = { ...process.env, PORT: String(port), ISDEAD_DATA_DIR: `/tmp/${slug}-shots-data`, NODE_ENV: "production", DEMO_MODE: "1" };
  fs.rmSync(env.ISDEAD_DATA_DIR, { recursive: true, force: true });
  const srv = spawn("npx", ["next", "start", "-p", String(port)], { env, stdio: "ignore", detached: true });
  const base = `http://localhost:${port}/${slug}`;
  for (let i = 0; i < 60; i++) { try { if ((await fetch(base)).ok) break; } catch {} await new Promise(r => setTimeout(r, 500)); }
  const browser = await chromium.launch({ args });
  try { await fn({ base, browser }); } finally { await browser.close(); try { process.kill(-srv.pid, "SIGTERM"); } catch {}; }
}
export async function demoPage(browser, base, { w = 1440, h = 900, scale = 1 } = {}) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: scale, acceptDownloads: true });
  const page = await ctx.newPage();
  await page.goto(base + "/login"); await page.getByRole("button", { name: "Use the demo account" }).click(); await page.waitForURL(/\/app/);
  return { ctx, page };
}
export const out = (app) => { const d = `/workspace/isdead-shots/${app}`; fs.mkdirSync(d, { recursive: true }); return d; };
