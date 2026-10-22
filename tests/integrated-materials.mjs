import { chromium } from "playwright";
import assert from "node:assert/strict";
const base = process.env.SITE_URL || "http://127.0.0.1:4176/";
const browser = await chromium.launch({
  args: ["--enable-unsafe-swiftshader"],
});
try {
  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 390, height: 844 },
  ]) {
    const page = await browser.newPage({ viewport });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("response", (r) => {
      if (r.status() >= 400) errors.push(r.status() + " " + r.url());
    });
    await page.goto(base);
    await page
      .locator('.local-material[data-effect="water"][data-state="ready"]')
      .waitFor({ state: "attached", timeout: 15000 });
    await page
      .locator('.local-material[data-effect="light"][data-state="ready"]')
      .waitFor({ state: "attached", timeout: 15000 });
    assert.equal(
      await page.locator("#motion-compare").count(),
      0,
      "normal page must not show developer controls",
    );
    assert.equal(
      await page.locator(".living-scene").count(),
      0,
      "old full-frame material must not run alongside local layers",
    );
    const water = page.locator('.local-material[data-effect="water"]');
    assert.equal(
      await water.getAttribute("data-device"),
      viewport.width < 759 ? "mobile" : "desktop",
    );
    await page.waitForTimeout(600);
    assert(Number(await water.getAttribute("data-frames")) > 1);
    await page.locator("#motion-toggle").click();
    await page.waitForTimeout(250);
    const frames = await water.getAttribute("data-frames");
    await page.waitForTimeout(350);
    assert.equal(
      await water.getAttribute("data-frames"),
      frames,
      "pause must stop worker submissions",
    );
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.waitForTimeout(100);
    assert.equal(
      await water.evaluate((c) => getComputedStyle(c).visibility),
      "hidden",
    );
    assert.deepEqual(errors, []);
    await page.close();
  }
  const fallback = await browser.newPage();
  await fallback.addInitScript(() =>
    Object.defineProperty(window, "Worker", { value: undefined }),
  );
  await fallback.goto(base);
  await fallback.waitForTimeout(1200);
  assert.equal(
    await fallback.locator('.local-material[data-state="fallback"]').count(),
    2,
  );
  await fallback.close();
  const dev = await browser.newPage();
  await dev.goto(
    (process.env.DEV_URL || "http://127.0.0.1:4176/") + "?motionMode=all",
  );
  await dev
    .locator('.local-material[data-effect="light"][data-state="ready"]')
    .waitFor({ state: "attached" });
  for (const [label, effect] of [
    ["仅丁达尔光", "light"],
    ["仅水面", "water"],
  ]) {
    await dev.getByRole("button", { name: label, exact: true }).click();
    await dev.waitForTimeout(150);
    for (const name of ["light", "water"])
      assert.equal(
        await dev
          .locator(`.local-material[data-effect="${name}"]`)
          .getAttribute("data-running"),
        String(name === effect),
      );
  }
  await dev.getByRole("button", { name: "全部关闭", exact: true }).click();
  await dev.waitForTimeout(150);
  assert.equal(
    await dev.locator('.local-material[data-running="true"]').count(),
    0,
  );
  await dev.close();
  console.log(
    "PASS integrated local water/light: desktop/mobile load, pause, reduction, static fallback; no legacy material or normal debug UI. Art remains user reviewed.",
  );
} finally {
  await browser.close();
}
