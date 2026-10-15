// Drives the real app (production build): product shots AND smoke test of the core flow, including a real in-browser recording with fake media devices.
import fs from "node:fs";
import assert from "node:assert/strict";
import { withApp, demoPage, out } from "./shotlib.mjs";
const dir = out("loomisdead"); const pub = new URL("../public/home/", import.meta.url).pathname; fs.mkdirSync(pub, { recursive: true });
const save = async (target, name, opts = {}) => { await target.screenshot({ path: `${dir}/${name}.png`, ...opts }); fs.copyFileSync(`${dir}/${name}.png`, `${pub}${name}.png`); };
const seedFile = new URL("../seed/design-feedback.webm", import.meta.url).pathname;
const args = ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream", "--auto-select-desktop-capture-source=Entire screen", "--auto-accept-this-tab-capture", "--enable-usermedia-screen-capturing"];
await withApp("loomisdead", async ({ base, browser }) => {
  const { ctx, page } = await demoPage(browser, base, { w: 1440, h: 900 });
  // library with seeded demo videos
  await page.getByTestId("grid").waitFor(); assert.equal(await page.getByTestId("video-card").count(), 3); await page.waitForTimeout(400); await save(page, "library");
  // watch page: play, comment at a timestamp, react, jump from the comment
  await page.getByTestId("video-card").first().getByRole("link").first().click(); await page.waitForURL(/\/v\/[a-z0-9]+/); const watchUrl = page.url();
  await page.getByTestId("player").waitFor(); assert.equal(await page.getByTestId("ccount").innerText(), "2");
  const views0 = Number((await page.getByTestId("views").innerText()).split(" ")[0]);
  await page.getByRole("button", { name: "Play video" }).click(); await page.waitForFunction(() => { const v = document.querySelector("video"); return v && v.currentTime > 1; }, null, { timeout: 15000 });
  await page.getByTestId("video").evaluate(v => v.pause()); await page.waitForFunction(() => document.querySelector('[data-testid="views"]')?.textContent?.startsWith("15")); assert.equal(Number((await page.getByTestId("views").innerText()).split(" ")[0]), views0 + 1);
  await page.getByLabel("Add a comment").fill("Can we ship this on Thursday?"); await page.getByRole("button", { name: "Comment", exact: true }).click(); await page.waitForFunction(() => document.querySelector('[data-testid="ccount"]')?.textContent === "3");
  await page.getByRole("button", { name: "React 🎉" }).click(); await page.getByRole("button", { name: "React 🎉" }).click(); await page.waitForTimeout(2000);
  await page.getByTestId("video").evaluate(v => { v.currentTime = 0; }); await page.getByRole("button", { name: /Jump to 0:0[3-9]/ }).first().click(); await page.waitForFunction(() => document.querySelector("video").currentTime >= 2.5);
  await page.getByTestId("video").evaluate(v => v.pause()); await page.waitForTimeout(400); await save(page, "watch"); await save(page.locator(".lm-side"), "comments");
  // keyboard: space toggles, arrow seeks
  await page.locator(".lm-watch").focus(); await page.keyboard.press("Space"); await page.waitForTimeout(300); await page.keyboard.press("Space");
  // rename + owner-only controls
  await page.getByRole("button", { name: "Rename" }).click(); await page.getByLabel("Video title").fill("Design feedback: pricing page"); await page.getByRole("button", { name: "Save", exact: true }).click(); await page.getByTestId("title").filter({ hasText: "Design feedback: pricing page" }).waitFor();
  // anonymous viewer: no account needed to watch or comment, cannot manage; range requests work
  const anon = await (await browser.newContext()).newPage(); await anon.goto(watchUrl); await anon.getByTestId("player").waitFor(); assert.equal(await anon.getByRole("button", { name: "Rename" }).count(), 0); assert.equal(await anon.getByRole("button", { name: "Delete", exact: true }).count(), 0);
  await anon.getByLabel("Your name").fill("Guest Gwen"); await anon.getByLabel("Add a comment").fill("Looks great!"); await anon.getByRole("button", { name: "Comment", exact: true }).click(); await anon.getByText("Guest Gwen").waitFor();
  const id = watchUrl.split("/v/")[1].split("?")[0]; const root = base + "/api/videos/" + id;
  const r1 = await anon.request.get(root + "/media", { headers: { range: "bytes=0-9" } }); assert.equal(r1.status(), 206); assert.match(r1.headers()["content-range"], /^bytes 0-9\/\d+$/); assert.equal((await r1.body()).length, 10);
  assert.equal((await anon.request.get(root + "/media", { headers: { range: "bytes=99999999-" } })).status(), 416); assert.equal((await anon.request.get(root + "/media?thumb=1")).headers()["content-type"], "image/jpeg");
  assert.equal((await anon.request.delete(root)).status(), 403); assert.equal((await anon.request.patch(root, { data: { title: "x" } })).status(), 403); assert.equal((await anon.request.post(base + "/api/videos", { multipart: { video: { name: "a.webm", mimeType: "video/webm", buffer: fs.readFileSync(seedFile) } } })).status(), 401);
  assert.equal((await anon.request.get(base + "/api/videos/nope1234/media")).status(), 404); assert.equal((await anon.request.post(root + "/reactions", { data: { emoji: "💩" } })).status(), 404);
  await anon.goto(base + "/app"); await anon.waitForURL(/\/login/);
  // upload an existing file from the library
  await page.goto(base + "/app"); await page.getByTestId("grid").waitFor(); await page.setInputFiles('input[type="file"]', seedFile); await page.waitForFunction(() => document.querySelectorAll('[data-testid="video-card"]').length === 4); assert.equal(await page.locator(".ids-error").count(), 0);
  const bad = await page.request.post(base + "/api/videos", { multipart: { video: { name: "x.webm", mimeType: "video/webm", buffer: Buffer.from("<html>not a video</html>") } } }); assert.equal(bad.status(), 400);
  // search
  await page.getByLabel("Search videos").fill("bug report"); await page.waitForFunction(() => document.querySelectorAll('[data-testid="video-card"]').length === 1); await page.getByLabel("Search videos").fill("");
  // real recording with fake camera + microphone (camera only), then save, then watch
  await ctx.grantPermissions(["camera", "microphone"]);
  await page.goto(base + "/app/record"); await page.getByTestId("recorder").waitFor(); await page.waitForTimeout(300); await save(page, "recorder");
  for (const mode of ["Screen + camera", "Screen only"]) { // composited screen+camera bubble and plain screen, with pause/resume, then discard
    await page.goto(base + "/app/record"); await page.getByTestId("recorder").waitFor(); await page.getByText(mode, { exact: true }).click(); await page.getByTestId("start").click(); await page.getByTestId("timer").waitFor({ timeout: 9000 }); await page.waitForTimeout(1300);
    await page.getByRole("button", { name: "Pause" }).click(); await page.getByText("Paused").waitFor(); const t1 = await page.getByTestId("timer").innerText(); await page.waitForTimeout(1200); assert.equal(await page.getByTestId("timer").innerText(), t1, "timer must hold while paused");
    await page.getByRole("button", { name: "Resume" }).click(); await page.waitForTimeout(1200); await page.getByTestId("stop").click(); await page.getByTestId("review").waitFor({ timeout: 10000 });
    assert.ok(await page.getByTestId("review-video").evaluate(v => v.videoWidth > 100), mode + " produced no video"); await page.getByRole("button", { name: "Discard" }).click(); await page.getByTestId("recorder").waitFor(); }
  await page.goto(base + "/app/record"); await page.getByTestId("recorder").waitFor();
  await page.getByText("Camera only").click(); await page.getByTestId("start").click(); await page.getByTestId("countdown").waitFor(); await page.getByTestId("timer").waitFor({ timeout: 8000 }); await page.waitForTimeout(2600); await page.getByTestId("stop").click();
  await page.getByTestId("review").waitFor({ timeout: 10000 }); await page.getByLabel("Title").fill("Smoke recording"); await save(page, "review");
  await page.getByRole("button", { name: "Save and copy link" }).click(); await page.waitForURL(/\/v\/[a-z0-9]+\?new=1/, { timeout: 20000 }); await page.getByTestId("title").filter({ hasText: "Smoke recording" }).waitFor();
  const dur = await page.evaluate(() => document.querySelector('[data-testid="time"]').textContent); assert.match(dur, /\/ 0:0[2-9]/);
  await page.getByRole("button", { name: "Play video" }).click(); await page.waitForFunction(() => document.querySelector("video").currentTime > 0.5, null, { timeout: 15000 });
  // delete from the watch page
  page.once("dialog", d => d.accept()); await page.getByRole("button", { name: "Delete", exact: true }).click(); await page.waitForURL(/\/app$/); await page.getByTestId("grid").waitFor(); assert.equal(await page.getByTestId("video-card").count(), 4);
  // login page, marketing, mobile
  const p2 = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage(); await p2.goto(base + "/login"); await p2.waitForTimeout(300); await save(p2, "login");
  await p2.goto(base); await p2.waitForTimeout(500); await save(p2, "home-top"); await save(p2, "home-full", { fullPage: true }); await p2.locator("#pricing").scrollIntoViewIfNeeded(); await p2.waitForTimeout(300); await save(p2, "home-pricing");
  const mob = await (await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })).newPage();
  for (const [name, url] of [["mobile-home", base], ["mobile-watch", watchUrl]]) { await mob.goto(url); await mob.waitForTimeout(500); await mob.screenshot({ path: `${dir}/${name}.png` }); assert.ok(await mob.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), `${name}: horizontal overflow`); }
  const m2 = await demoPage(browser, base, { w: 390, h: 844, scale: 2 }); await m2.page.getByTestId("grid").waitFor(); await m2.page.screenshot({ path: `${dir}/mobile-library.png` }); assert.ok(await m2.page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), "library overflow");
  console.log("loomisdead smoke OK");
}, { args });
