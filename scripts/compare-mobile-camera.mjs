import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
const out = "artifacts/targeted/camera-comparison";
await mkdir(out, { recursive: true });
const browser = await chromium.launch({
  args: ["--enable-unsafe-swiftshader"],
});
const layouts = [];
try {
  for (const [name, port] of [
    ["before", 4182],
    ["after", 4177],
  ]) {
    const page = await browser.newPage({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
    });
    await page.addInitScript(() =>
      document.addEventListener(
        "DOMContentLoaded",
        () => document.querySelector("#motion-toggle")?.click(),
        { once: true },
      ),
    );
    await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: "networkidle" });
    await page.mouse.wheel(0, 1);
    await page.locator("#world-canvas[data-state=live]").waitFor();
    await page.waitForTimeout(1000);
    for (const progress of [0, 0.25, 0.65, 0.95]) {
      await page.evaluate((p) => {
        const experience = document.querySelector(".world-experience"),
          stage = document.querySelector(".world-stage");
        window.scrollTo({
          top: p * (experience.offsetHeight - stage.clientHeight),
          behavior: "instant",
        });
        document.getAnimations().forEach((a) => {
          a.pause();
          a.currentTime = 5000;
        });
      }, progress);
      await page.waitForTimeout(350);
      await page.screenshot({ path: `${out}/${name}-${progress}.png` });
      layouts.push({
        version: name,
        progress,
        camera: await page
          .locator("#world-canvas")
          .getAttribute("data-camera-z"),
        renderer: await page
          .locator("#world-canvas")
          .getAttribute("data-renderer"),
        gate: await page.locator(".gate-art").boundingBox(),
      });
    }
    await page.close();
  }
} finally {
  await browser.close();
}
await writeFile(`${out}/layout.json`, JSON.stringify(layouts, null, 2));
console.log(
  layouts.map((x) => ({
    version: x.version,
    progress: x.progress,
    camera: x.camera,
    renderer: x.renderer,
  })),
);
