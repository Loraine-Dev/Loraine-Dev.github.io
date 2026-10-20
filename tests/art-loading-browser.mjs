import { chromium } from "playwright";
import assert from "node:assert/strict";
const browser = await chromium.launch({
  args: ["--enable-unsafe-swiftshader"],
});
try {
  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 768, height: 1024 },
    { width: 390, height: 844 },
  ]) {
    const page = await browser.newPage({ viewport });
    const urls = [];
    page.on("request", (r) => urls.push(r.url()));
    await page.goto("http://127.0.0.1:4177/", { waitUntil: "networkidle" });
    assert.match(
      await page.locator(".world-art img").evaluate((i) => i.currentSrc),
      /\.webp$/,
    );
    for (const selector of [".gate-art img", ".shore-art img"])
      assert.match(
        await page.locator(selector).evaluate((i) => i.currentSrc),
        /\.avif$/,
      );
    assert(
      !urls.some((u) => /\/(gate(-mobile)?|shore)\.webp/.test(u)),
      "no duplicate full WebP foreground requests",
    );
    if (viewport.width === 390) {
      await page.mouse.move(190, 400);
      await page.mouse.wheel(0, 1);
      await page.waitForFunction(
        () => document.querySelector("#world-canvas").dataset.state === "live",
      );
      assert.match(
        (await page
          .locator("#world-canvas")
          .getAttribute("data-shore-source")) || "",
        /shore-portrait.avif$/,
      );
      await page.setViewportSize({ width: 550, height: 844 });
      await page.waitForFunction(() =>
        document
          .querySelector("#world-canvas")
          .dataset.shoreSource?.endsWith("/shore.avif"),
      );
    }
    await page.close();
  }
  console.log(
    "PASS currentSrc matches preload, no unused codec requests, correct responsive shore texture through portrait boundary",
  );
} finally {
  await browser.close();
}
