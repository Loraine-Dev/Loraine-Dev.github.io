import { chromium } from "playwright";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
const base = process.env.SITE_URL || "http://127.0.0.1:4176/";
const b = await chromium.launch({ args: ["--enable-unsafe-swiftshader"] });
const errors = [],
  checks = [];
await mkdir("artifacts/living", { recursive: true });
for (const size of [
  { width: 1440, height: 900 },
  { width: 390, height: 844 },
]) {
  const p = await b.newPage({ viewport: size });
  p.on("pageerror", (e) => errors.push(e.message));
  await p.goto(base, { waitUntil: "networkidle" });
  await p.mouse.move(size.width / 2, size.height / 2);
  await p.mouse.wheel(0, 1);
  await p.waitForFunction(
    () => document.querySelector("#world-canvas").dataset.state === "live",
  );
  const env = p.locator(".environment");
  assert.equal(await env.getAttribute("data-running"), "4");
  await p.waitForTimeout(700);
  const frames = await p.locator("#world-canvas").getAttribute("data-frames");
  const times = await env.evaluate((e) =>
    e.getAnimations({ subtree: true }).map((a) => a.currentTime),
  );
  await p.waitForTimeout(700);
  assert.equal(
    await p.locator("#world-canvas").getAttribute("data-frames"),
    frames,
    "idle ambient must not redraw WebGL",
  );
  assert(
    (await env.evaluate(
      (e) => e.getAnimations({ subtree: true })[0].currentTime,
    )) >
      times[0] + 500,
  );
  await p.locator("#motion-toggle").click();
  await p.waitForTimeout(150);
  const stopped = await env.evaluate((e) =>
    e.getAnimations({ subtree: true }).map((a) => a.currentTime),
  );
  await p.waitForTimeout(350);
  assert.deepEqual(
    await env.evaluate((e) =>
      e.getAnimations({ subtree: true }).map((a) => a.currentTime),
    ),
    stopped,
    "pause holds exact phases",
  );
  await p.locator("#motion-toggle").click();
  await p.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  assert.equal(await env.getAttribute("data-running"), "0");
  const hidden = await env.evaluate((e) =>
    e.getAnimations({ subtree: true }).map((a) => a.currentTime),
  );
  await p.waitForTimeout(300);
  assert.deepEqual(
    await env.evaluate((e) =>
      e.getAnimations({ subtree: true }).map((a) => a.currentTime),
    ),
    hidden,
  );
  await p.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: false,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await p.emulateMedia({ reducedMotion: "reduce" });
  await p.waitForFunction(
    () => document.querySelector(".environment").dataset.running === "0",
  );
  assert.equal(await env.getAttribute("data-running"), "0");
  assert.equal(
    await env.evaluate((e) => getComputedStyle(e).visibility),
    "hidden",
  );
  await p.emulateMedia({ reducedMotion: "no-preference" });
  await p.screenshot({ path: `artifacts/living/${size.width}-ambient.png` });
  for (const progress of [99999, 0, 99999, 0])
    await p.evaluate(
      (y) => scrollTo({ top: y, behavior: "instant" }),
      progress,
    );
  assert(
    await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  );
  checks.push({
    viewport: size,
    ambient: true,
    idleWebglFrames: "stable",
    pause: "phase preserved",
    hidden: "paused",
    reduced: "hidden and paused",
    fastScroll: "no overflow",
  });
  await p.close();
}
for (const effect of ["", "farFog", "midFog", "treeLight", "waterLight"]) {
  const p = await b.newPage();
  await p.goto(`${base}?effects=${effect}`, { waitUntil: "networkidle" });
  assert.equal(await p.locator(".environment-mask").count(), effect ? 1 : 0);
  checks.push({ only: effect || "none", independentSwitch: true });
  await p.close();
}
assert.equal(errors.length, 0);
await writeFile(
  "artifacts/living/browser-report.json",
  JSON.stringify({ checks, errors }, null, 2),
);
await b.close();
console.log(
  "PASS environment motion, independent switches, idle renderer, pause/background/reduced, desktop/mobile",
);
