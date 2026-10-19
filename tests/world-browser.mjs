import { chromium, firefox } from "playwright";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
const base = process.env.SITE_URL || "http://127.0.0.1:4177/";
await mkdir("artifacts/world-tree", { recursive: true });
const report = {
  base,
  checks: [],
  errors: [],
  resourceFailures: [],
  date: new Date().toISOString(),
};
function watch(page) {
  page.on("pageerror", (e) => report.errors.push(e.message));
  page.on("response", (r) => {
    if (r.status() >= 400)
      report.resourceFailures.push(`${r.status()} ${r.url()}`);
  });
}
async function live(page) {
  await page.waitForFunction(
    () =>
      document.querySelector("#world-canvas")?.dataset.state === "live" ||
      ["software-gpu", "mobile-interaction"].includes(
        document.querySelector("#world-canvas")?.dataset.reason,
      ),
  );
  if (
    (await page.locator("#world-canvas").getAttribute("data-state")) !== "live"
  ) {
    // A resize can leave the pointer outside the new viewport; wheel then
    // never reaches the page. Place it inside the actual mobile canvas first.
    const { width, height } = page.viewportSize();
    await page.mouse.move(width / 2, height / 2);
    await page.mouse.wheel(0, 1);
  }
  try {
    await page.waitForFunction(
      () => document.querySelector("#world-canvas")?.dataset.state === "live",
      null,
      { timeout: 30000 },
    );
  } catch (error) {
    console.error(
      "Scene startup diagnostics",
      await page.locator("#world-canvas").evaluate((el) => ({ ...el.dataset })),
      await page.locator("#world-canvas canvas").count(),
    );
    throw error;
  }
  await page.waitForTimeout(200);
}
const browser = await chromium.launch({
  args: ["--enable-unsafe-swiftshader"],
});
try {
  for (const [width, height] of [
    [1920, 1080],
    [1440, 900],
    [1280, 800],
    [768, 1024],
    [390, 844],
    [375, 667],
    [320, 568],
  ]) {
    const page = await browser.newPage({
      viewport: { width, height },
      reducedMotion: "reduce",
    });
    watch(page);
    const requested = [];
    page.on("request", (r) => {
      if (r.url().includes("/art/world-tree/"))
        requested.push(new URL(r.url()).pathname);
    });
    await page.goto(base, { waitUntil: "networkidle" });
    await live(page);
    assert.equal(await page.locator("h1").count(), 1);
    assert.equal(await page.locator("h1").innerText(), "弥洛生");
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      "horizontal overflow",
    );
    assert(
      await page.evaluate(() =>
        [...document.images].every(
          (img) => img.complete && img.naturalWidth > 0,
        ),
      ),
      "all visual assets load",
    );
    if (width < 760 || width / height <= 0.8)
      assert(
        !requested.some(
          (x) => x.includes("world-desktop") || x.endsWith("/gate.webp"),
        ),
        "mobile uses independent art",
      );
    else
      assert(
        !requested.some((x) => x.includes("mobile")),
        "desktop does not request mobile artwork",
      );
    const count = await page
      .locator("#world-canvas")
      .getAttribute("data-frames");
    await page.waitForTimeout(250);
    assert.equal(
      await page.locator("#world-canvas").getAttribute("data-frames"),
      count,
      "reduced motion stops continuous frames",
    );
    assert.equal(await page.locator("#motion-toggle").isDisabled(), true);
    await page.screenshot({
      path: `artifacts/world-tree/viewport-${width}.png`,
    });
    report.checks.push({
      width,
      height,
      scene: "real WebGL still",
      overflow: false,
      requested: [...new Set(requested)],
    });
    await page.close();
  }
  const page = await browser.newPage({
    viewport: { width: 1100, height: 760 },
  });
  watch(page);
  await page.goto(base, { waitUntil: "networkidle" });
  await live(page);
  await page.locator("#motion-toggle").click();
  await page.waitForTimeout(150);
  const count = await page.locator("#world-canvas").getAttribute("data-frames");
  await page.waitForTimeout(250);
  assert.equal(
    await page.locator("#world-canvas").getAttribute("data-frames"),
    count,
    "manual pause stops ambient frames",
  );
  await page.locator("#motion-toggle").click();
  await page.waitForTimeout(300);
  assert(
    Number(await page.locator("#world-canvas").getAttribute("data-frames")) >
      Number(count),
  );
  await page.evaluate(() => scrollTo(0, innerHeight * 0.77));
  await page.waitForTimeout(700);
  assert(
    Number(await page.locator("#world-canvas").getAttribute("data-camera-z")) <
      2.1,
    "camera actually advances",
  );
  await page.screenshot({ path: "artifacts/world-tree/entered-live.png" });
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page.waitForTimeout(80);
  const hiddenCount = await page
    .locator("#world-canvas")
    .getAttribute("data-frames");
  await page.waitForTimeout(220);
  assert.equal(
    await page.locator("#world-canvas").getAttribute("data-frames"),
    hiddenCount,
    "simulated visibility event pauses renderer",
  );
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: false,
    });
    document.dispatchEvent(new Event("visibilitychange"));
    scrollTo(0, 0);
  });
  await page.waitForTimeout(250);
  await page.locator("#motion-toggle").click();
  const canLose = await page.evaluate(() => {
    const gl = document
      .querySelector("#world-canvas canvas")
      .getContext("webgl2");
    const ext = gl.getExtension("WEBGL_lose_context");
    if (!ext) return false;
    window.testLoss = ext;
    ext.loseContext();
    return true;
  });
  assert(canLose, "context loss extension available");
  await page.waitForFunction(
    () =>
      document.querySelector("#world-canvas").dataset.state === "context-lost",
  );
  assert.equal(
    await page
      .locator("#world-canvas")
      .evaluate((el) => el.classList.contains("is-ready")),
    false,
  );
  await page.waitForTimeout(300);
  await page.evaluate(() => window.testLoss.restoreContext());
  await live(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await live(page);
  assert.equal(
    await page.locator("#world-canvas canvas").count(),
    1,
    "breakpoint has one scene",
  );
  await page.reload({ waitUntil: "networkidle" });
  await live(page);
  report.checks.push({
    behaviors: [
      "manual pause/resume",
      "camera dolly",
      "visibility event simulation",
      "genuine WebGL context loss/restore",
      "responsive scene recreation",
      "reload",
    ],
    passed: true,
  });
  await page.close();
  for (const mode of ["no-js", "no-webgl", "low-memory", "save-data"]) {
    const p = await browser.newPage({
      viewport: { width: 390, height: 844 },
      javaScriptEnabled: mode !== "no-js",
    });
    watch(p);
    if (mode === "no-webgl")
      await p.addInitScript(() => {
        const original = HTMLCanvasElement.prototype.getContext;
        HTMLCanvasElement.prototype.getContext = function (kind, ...args) {
          return kind === "webgl2" ? null : original.call(this, kind, ...args);
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
    await p.waitForTimeout(500);
    assert.equal(await p.locator("#world-canvas canvas").count(), 0);
    assert(await p.locator("h1").isVisible());
    assert(
      await p.evaluate(() =>
        [...document.images].every((i) => i.complete && i.naturalWidth > 0),
      ),
    );
    assert(
      await p.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    await p.screenshot({ path: `artifacts/world-tree/fallback-${mode}.png` });
    report.checks.push({ fallback: mode, passed: true });
    await p.close();
  }
  const touch = await browser.newPage({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  watch(touch);
  await touch.goto(base, { waitUntil: "networkidle" });
  await live(touch);
  await touch.locator(".explore").tap();
  await touch.waitForTimeout(850);
  assert(
    Number(await touch.locator("#world-canvas").getAttribute("data-progress")) >
      0.8,
  );
  report.checks.push({ touch: "explore tap and scroll", passed: true });
  await touch.close();
  const keyboard = await browser.newPage({ reducedMotion: "reduce" });
  watch(keyboard);
  await keyboard.goto(base);
  await keyboard.keyboard.press("Tab");
  assert.equal(
    await keyboard.locator(":focus").getAttribute("href"),
    "#beyond",
  );
  await keyboard.keyboard.press("Enter");
  assert.equal(await keyboard.locator(":focus").getAttribute("id"), "beyond");
  report.checks.push({
    keyboard: "skip link and focused destination",
    passed: true,
  });
  await keyboard.close();
} finally {
  await browser.close();
}
for (const engine of ["Edge", "Firefox"]) {
  let other;
  try {
    other =
      engine === "Edge"
        ? await chromium.launch({
            channel: "msedge",
            args: ["--enable-unsafe-swiftshader"],
          })
        : await firefox.launch();
  } catch (error) {
    report.checks.push({ engine, unavailable: error.message });
    continue;
  }
  try {
    const p = await other.newPage({
      viewport: { width: 1280, height: 800 },
      reducedMotion: "reduce",
    });
    watch(p);
    await p.goto(base, { waitUntil: "networkidle" });
    await p.waitForTimeout(1200);
    assert(await p.locator("h1").isVisible());
    assert(
      await p.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    assert(
      await p.evaluate(() =>
        [...document.images].every((i) => i.complete && i.naturalWidth > 0),
      ),
    );
    await p.screenshot({
      path: `artifacts/world-tree/${engine.toLowerCase()}.png`,
    });
    report.checks.push({
      engine,
      version: other.version(),
      scene: await p.locator("#world-canvas").getAttribute("data-state"),
      layout: "passed",
    });
  } finally {
    await other.close();
  }
}
assert.deepEqual(report.errors, [], "no browser runtime exceptions");
assert.deepEqual(report.resourceFailures, [], "no failed resources");
await writeFile(
  "artifacts/world-tree/browser-report.json",
  JSON.stringify(report, null, 2),
);
console.log(JSON.stringify(report, null, 2));
