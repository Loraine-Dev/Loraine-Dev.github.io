import { chromium } from "playwright";
import assert from "node:assert/strict";
const browser = await chromium.launch({
  args: ["--enable-unsafe-swiftshader"],
});
try {
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    reducedMotion: "no-preference",
  });
  await page.goto("http://127.0.0.1:4176/", { waitUntil: "networkidle" });
  await page.waitForTimeout(700);
  assert.equal(
    await page.locator(".environment").getAttribute("data-deferred"),
    "false",
    "mobile ambient must start without scroll/touch",
  );
  assert(
    Number(await page.locator(".environment").getAttribute("data-running")) >=
      2,
    "clouds and tree light must run at rest",
  );
  console.log("PASS ambient starts without input");
} finally {
  await browser.close();
}
