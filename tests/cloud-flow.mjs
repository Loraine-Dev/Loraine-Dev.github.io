import { chromium } from "playwright";
import assert from "node:assert/strict";
const browser = await chromium.launch();
try {
  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 390, height: 844 },
  ]) {
    const page = await browser.newPage({
      viewport,
      reducedMotion: "no-preference",
    });
    await page.goto("http://127.0.0.1:4176/?effects=farFog,midFog", {
      waitUntil: "networkidle",
    });
    const sample = () =>
      page
        .locator(".farFog")
        .evaluate((e) => ({
          opacity: getComputedStyle(e).opacity,
          transform: getComputedStyle(e.querySelector(".environment-drift"))
            .transform,
        }));
    const first = await sample();
    await page.waitForTimeout(5000);
    const last = await sample();
    assert.equal(
      last.opacity,
      first.opacity,
      "Cloud density is steady; cloud travel must be visible without opacity animation",
    );
    // Parse CSS matrix in Node without DOMMatrix.
    const translation = (s) =>
      s.startsWith("matrix3d")
        ? Number(s.slice(9, -1).split(",")[12])
        : Number(s.slice(7, -1).split(",")[4]);
    assert(
      Math.abs(translation(last.transform) - translation(first.transform)) >
        (viewport.width > 500 ? 10 : 3),
      "Cloud has measurable 5-second spatial travel at normal speed",
    );
    await page.close();
  }
  console.log(
    "PASS constant-density clouds travel without input; human visual review still required",
  );
} finally {
  await browser.close();
}
