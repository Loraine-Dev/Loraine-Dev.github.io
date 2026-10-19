import { chromium, firefox } from "playwright";
import assert from "node:assert/strict";
import { mkdir, writeFile, access } from "node:fs/promises";
const base = process.env.SITE_URL || "http://127.0.0.1:4177/";
await mkdir("artifacts", { recursive: true });
const results = [],
  errors = [],
  badResponses = [];
async function watch(page) {
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("response", (r) => {
    if (r.status() >= 400) badResponses.push(`${r.status()} ${r.url()}`);
  });
}
async function ensureLive(page) {
  await page.waitForFunction(
    () =>
      document.querySelector("#scene")?.dataset.sceneState === "live" ||
      document
        .querySelector("#motion-toggle")
        ?.textContent.includes("开启实时形态"),
    null,
    { timeout: 60000 },
  );
  if (
    (await page.locator("#scene").getAttribute("data-scene-state")) !== "live"
  )
    await page.getByRole("button", { name: /开启实时形态/ }).click();
  await page.waitForFunction(
    () => document.querySelector("#scene")?.dataset.sceneState === "live",
    null,
    { timeout: 60000 },
  );
}
const chromiumBrowser = await chromium.launch({
  args: ["--enable-unsafe-swiftshader"],
});
try {
  for (const [width, height] of [
    [1920, 1080],
    [1440, 900],
    [1280, 800],
    [768, 1024],
    [390, 844],
    [320, 740],
  ]) {
    const page = await chromiumBrowser.newPage({
      viewport: { width, height },
      reducedMotion: "reduce",
    });
    await watch(page);
    await page.goto(base, { waitUntil: "networkidle" });
    await ensureLive(page);
    await page.waitForFunction(
      () => document.querySelector("#scene")?.dataset.sceneState === "live",
      null,
      { timeout: 60000 },
    );
    assert.equal(await page.locator("h1").count(), 1);
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    assert(
      await page.evaluate(() =>
        [...document.images].every((i) => i.complete && i.naturalWidth > 0),
      ),
    );
    const count = await page
      .locator("#scene")
      .getAttribute("data-render-count");
    await page.waitForTimeout(250);
    assert.equal(
      await page.locator("#scene").getAttribute("data-render-count"),
      count,
      "reduced motion has no continuous frames",
    );
    await page.screenshot({ path: `artifacts/viewport-${width}.png` });
    await page.evaluate(() => scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(100);
    assert(await page.locator("#studio").isVisible());
    results.push({
      engine: "Chrome for Testing",
      width,
      height,
      scene: "live still",
      overflow: false,
    });
    await page.close();
  }
  const page = await chromiumBrowser.newPage({
    viewport: { width: 1000, height: 760 },
  });
  await watch(page);
  await page.goto(base);
  await ensureLive(page);
  await page.waitForFunction(
    () => document.querySelector("#scene")?.dataset.sceneState === "live",
    null,
    { timeout: 60000 },
  );
  await page.locator("#motion-toggle").click();
  await page.waitForTimeout(200);
  let count = await page.locator("#scene").getAttribute("data-render-count");
  await page.waitForTimeout(300);
  assert.equal(
    await page.locator("#scene").getAttribute("data-render-count"),
    count,
    "pause stops continuous frames",
  );
  await page.locator("#motion-toggle").click();
  await page.waitForTimeout(500);
  assert(
    Number(await page.locator("#scene").getAttribute("data-render-count")) >
      Number(count),
    "resume renders",
  );
  await page.evaluate(() => scrollTo(0, innerHeight * 0.84));
  await page.waitForTimeout(600);
  assert(
    Number(await page.locator("#scene").getAttribute("data-progress")) > 0.8,
  );
  await page.screenshot({ path: "artifacts/threshold-live.png" });
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page.waitForTimeout(100);
  count = await page.locator("#scene").getAttribute("data-render-count");
  await page.waitForTimeout(250);
  assert.equal(
    await page.locator("#scene").getAttribute("data-render-count"),
    count,
    "hidden-state event simulation stops frames",
  );
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: false,
    });
    document.dispatchEvent(new Event("visibilitychange"));
    scrollTo(0, 0);
  });
  await page.waitForTimeout(300);
  await page.locator("#motion-toggle").click();
  const canLose = await page.evaluate(() => {
    const gl = document.querySelector("#scene canvas").getContext("webgl2");
    const ext = gl.getExtension("WEBGL_lose_context");
    if (ext) {
      window.testGlExt = ext;
      ext.loseContext();
      return true;
    }
    return false;
  });
  if (canLose) {
    await page.waitForFunction(
      () =>
        document.querySelector("#scene").dataset.sceneState === "context-lost",
    );
    assert.equal(
      await page
        .locator("#scene")
        .evaluate((el) => el.classList.contains("live")),
      false,
    );
    await page.waitForTimeout(350);
    await page.evaluate(() => window.testGlExt.restoreContext());
    await page.waitForFunction(
      () => document.querySelector("#scene").dataset.sceneState === "live",
      null,
      { timeout: 60000 },
    );
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await ensureLive(page);
  await page.waitForFunction(
    () =>
      document.querySelector("#scene").dataset.quality === "mobile" &&
      document.querySelector("#scene").dataset.sceneState === "live",
    null,
    { timeout: 60000 },
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.waitForTimeout(250);
  assert.equal(await page.locator("#motion-toggle").isDisabled(), true);
  await page.reload({ waitUntil: "networkidle" });
  await ensureLive(page);
  await page.waitForFunction(
    () => document.querySelector("#scene").dataset.sceneState === "live",
    null,
    { timeout: 60000 },
  );
  results.push({
    behaviors: [
      "pause/resume",
      "scroll camera",
      "injected visibility state",
      "context loss/restore",
      "breakpoint recreation",
      "preference change",
      "reload",
    ],
    passed: true,
  });
  await page.close();
  for (const mode of ["no-webgl", "low-memory", "save-data", "no-js"]) {
    const p = await chromiumBrowser.newPage({
      viewport: { width: 390, height: 844 },
      javaScriptEnabled: mode !== "no-js",
    });
    await watch(p);
    if (mode === "no-webgl")
      await p.addInitScript(() => {
        const original = HTMLCanvasElement.prototype.getContext;
        HTMLCanvasElement.prototype.getContext = function (type, ...args) {
          return type === "webgl2" ? null : original.call(this, type, ...args);
        };
      });
    if (mode === "low-memory")
      await p.addInitScript(() =>
        Object.defineProperty(navigator, "deviceMemory", { get: () => 2 }),
      );
    if (mode === "save-data")
      await p.addInitScript(() =>
        Object.defineProperty(navigator, "connection", {
          get: () => ({ saveData: true }),
        }),
      );
    await p.goto(base, { waitUntil: "networkidle" });
    await p.waitForTimeout(600);
    assert.equal(await p.locator("#scene canvas").count(), 0);
    assert(await p.locator("h1").isVisible());
    assert(
      await p.evaluate(
        () =>
          document.querySelector(".poster img").complete &&
          document.querySelector(".poster img").naturalWidth > 0,
      ),
    );
    assert(
      await p.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    if (mode !== "no-js") {
      await p.keyboard.press("Tab");
      assert.equal(
        await p.locator(":focus").getAttribute("href"),
        "#threshold",
      );
    }
    await p.screenshot({ path: `artifacts/fallback-${mode}.png` });
    results.push({ fallback: mode, passed: true });
    await p.close();
  }
  assert.deepEqual(errors, []);
  assert.deepEqual(badResponses, []);
} finally {
  await chromiumBrowser.close();
}
let firefoxBrowser;
try {
  firefoxBrowser = await firefox.launch();
} catch (e) {
  results.push({ engine: "Firefox", unavailable: e.message });
}
if (firefoxBrowser) {
  const browser = firefoxBrowser;
  const page = await browser.newPage({
    viewport: { width: 1280, height: 800 },
    reducedMotion: "reduce",
  });
  await watch(page);
  await page.goto(base, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  assert(await page.locator("h1").isVisible());
  assert(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await page.screenshot({ path: "artifacts/firefox.png" });
  results.push({
    engine: "Firefox",
    version: browser.version(),
    scene: await page.locator("#scene").getAttribute("data-scene-state"),
    layout: "passed",
  });
  await browser.close();
}
assert.deepEqual(errors, []);
assert.deepEqual(badResponses, []);
const report = {
  base,
  results,
  errors,
  badResponses,
  date: new Date().toISOString(),
};
await writeFile(
  "artifacts/browser-report.json",
  JSON.stringify(report, null, 2),
);
console.log(JSON.stringify(report, null, 2));
