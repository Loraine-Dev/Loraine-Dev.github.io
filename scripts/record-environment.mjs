import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
const base = process.env.SITE_URL || "http://127.0.0.1:4177/";
const out = "artifacts/living";
await mkdir(out, { recursive: true });
const browser = await chromium.launch({
  args: ["--enable-unsafe-swiftshader"],
});
const context = await browser.newContext({
  viewport: { width: 1280, height: 800 },
  recordVideo: { dir: out, size: { width: 1280, height: 800 } },
});
const page = await context.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.goto(base, { waitUntil: "networkidle" });
await page.mouse.move(700, 440);
await page.mouse.wheel(0, 1);
await page.waitForFunction(
  () => document.querySelector("#world-canvas").dataset.state === "live",
);
await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
await page.waitForTimeout(1000);
const cdp = await context.newCDPSession(page);
await cdp.send("Performance.enable");
const startMetrics = await cdp.send("Performance.getMetrics");
const stats = [];
const started = Date.now();
for (const second of [0, 10, 20, 30, 60, 96, 155, 192]) {
  const delay = started + second * 1000 - Date.now();
  if (delay > 0) await page.waitForTimeout(delay);
  await page.screenshot({ path: `${out}/desktop-${second}s.png` });
  stats.push({
    second,
    state: await page.locator(".environment").evaluate((e) => ({
      ...e.dataset,
      animations: e
        .getAnimations({ subtree: true })
        .map((a) => ({ state: a.playState, time: a.currentTime })),
    })),
    webglFrames: await page
      .locator("#world-canvas")
      .getAttribute("data-frames"),
  });
  console.log(`Recorded real time ${second}s`);
}
const endMetrics = await cdp.send("Performance.getMetrics");
const metric = (r, name) => r.metrics.find((m) => m.name === name)?.value || 0;
// Real native wheel input; no synthetic camera/timeline values in the recording.
for (let i = 0; i < 22; i++) {
  await page.mouse.wheel(0, 28);
  await page.waitForTimeout(100);
}
await page.waitForTimeout(1800);
await page.screenshot({ path: `${out}/entered.png` });
for (let i = 0; i < 22; i++) {
  await page.mouse.wheel(0, -28);
  await page.waitForTimeout(100);
}
await page.waitForTimeout(1400);
const video = page.video();
await context.close();
await video.saveAs(`${out}/desktop-real-time.webm`);
const report = {
  realTimeSeconds: 192,
  totalRecording:
    "192 seconds ambient followed by real scroll forward and back; no time acceleration",
  stats,
  errors,
  idleMainThread: {
    taskMs:
      (metric(endMetrics, "TaskDuration") -
        metric(startMetrics, "TaskDuration")) *
      1000,
    scriptMs:
      (metric(endMetrics, "ScriptDuration") -
        metric(startMetrics, "ScriptDuration")) *
      1000,
    layoutMs:
      (metric(endMetrics, "LayoutDuration") -
        metric(startMetrics, "LayoutDuration")) *
      1000,
  },
  note: "Headless Chromium software WebGL. Main-thread counters do not measure GPU power or physical-device frame rate.",
};
assert.equal(errors.length, 0);
assert.equal(
  new Set(stats.map((x) => x.webglFrames)).size,
  1,
  "ambient does not continuously redraw WebGL",
);
await writeFile(
  `${out}/recording-report.json`,
  JSON.stringify(report, null, 2),
);
await browser.close();
console.log(JSON.stringify(report.idleMainThread));
