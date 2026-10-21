// Functional safety checks only. These do not certify visual quality.
import { chromium } from "playwright";
import assert from "node:assert/strict";
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
    await page.goto("http://127.0.0.1:4176/?motionMode=all");
    const canvas = page.locator(".living-scene");
    await page.locator(".living-scene[data-state=ready]").waitFor();
    assert.equal(
      await canvas.getAttribute("data-renderer"),
      "worker",
      "supported Chromium must use the worker, not silently fall back",
    );
    for (const [label, mode, clouds] of [
      ["全部关闭", "off", false],
      ["仅丁达尔光", "rays", false],
      ["仅水面", "water", false],
      ["仅世界树", "tree", false],
      ["仅云雾", "clouds", true],
      ["正常动态", "all", true],
    ]) {
      await page.getByRole("button", { name: label, exact: true }).click();
      assert.equal(await canvas.getAttribute("data-mode"), mode);
      assert.equal((await page.locator(".cloud-billow").count()) > 0, clouds);
    }
    await page.locator("#motion-toggle").click();
    await page.waitForTimeout(180);
    const time = await canvas.getAttribute("data-time");
    await page.waitForTimeout(300);
    assert.equal(await canvas.getAttribute("data-time"), time);
    await page.locator("#motion-toggle").click();
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.waitForTimeout(100);
    assert.equal(
      await canvas.evaluate((c) => getComputedStyle(c).visibility),
      "hidden",
    );
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.waitForTimeout(100);
    assert.equal(
      await canvas.evaluate((c) => getComputedStyle(c).visibility),
      "visible",
    );
    assert.deepEqual(errors, []);
    await page.close();
  }
  const page = await browser.newPage();
  await page.goto("http://127.0.0.1:4177/");
  assert.equal(await page.locator("#motion-compare").count(), 0);
  await page.close();
  const fallback = await browser.newPage();
  await fallback.addInitScript(() =>
    Object.defineProperty(window, "Worker", { value: undefined }),
  );
  await fallback.goto("http://127.0.0.1:4177/");
  await fallback.locator(".living-scene[data-state=ready]").waitFor();
  assert.notEqual(
    await fallback.locator(".living-scene").getAttribute("data-renderer"),
    "worker",
  );
  assert(await fallback.locator("h1").isVisible());
  await fallback.close();
  console.log(
    "PASS desktop/mobile six-mode isolation, pause, reduced motion and production control exclusion. Visual acceptance remains user-owned.",
  );
} finally {
  await browser.close();
}
