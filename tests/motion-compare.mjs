import { chromium } from "playwright";
import assert from "node:assert/strict";
const browser = await chromium.launch();
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
  });
  await page.goto("http://127.0.0.1:4176/", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "静态", exact: true }).click();
  assert.equal(
    await page
      .locator(".environment")
      .evaluate((e) => getComputedStyle(e).visibility),
    "hidden",
  );
  assert.equal(
    await page.locator(".environment").getAttribute("data-running"),
    "0",
  );
  await page.getByRole("button", { name: "动态", exact: true }).click();
  assert.equal(
    await page
      .locator(".environment")
      .evaluate((e) => getComputedStyle(e).visibility),
    "visible",
  );
  assert.equal(
    await page.locator(".environment").getAttribute("data-running"),
    "4",
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.waitForFunction(
    () =>
      getComputedStyle(document.querySelector(".environment")).visibility ===
      "hidden",
  );
  assert.equal(
    await page
      .locator(".environment")
      .evaluate((e) => getComputedStyle(e).visibility),
    "hidden",
  );
  const prod = await browser.newPage();
  await prod.goto("http://127.0.0.1:4177/");
  assert.equal(await prod.locator("#motion-compare").count(), 0);
  console.log(
    "PASS development static/dynamic comparison, reduced motion, production exclusion",
  );
} finally {
  await browser.close();
}
