import { chromium } from "playwright";
import { mkdir, readFile, writeFile } from "node:fs/promises";
const out = "artifacts/final-quality/comparison";
await mkdir(out, { recursive: true });
const config = JSON.parse(await readFile("src/data/environment.json", "utf8"));
const browser = await chromium.launch({
  args: ["--enable-unsafe-swiftshader"],
});
const report = [];
try {
  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 768, height: 1024 },
    { width: 390, height: 844 },
  ])
    for (const [label, port] of [
      ["before", 4180],
      ["after", 4177],
    ]) {
      const page = await browser.newPage({
        viewport,
        reducedMotion: "no-preference",
      });
      await page.goto(`http://127.0.0.1:${port}/`, {
        waitUntil: "networkidle",
      });
      await page.waitForTimeout(1800);
      await page.evaluate((config) => {
        document.querySelector("#motion-toggle").click();
        for (const name of ["farFog", "midFog"]) {
          const e = config.effects[name],
            layer = document.querySelector("." + name),
            drift = layer.querySelector(".environment-drift");
          drift.getAnimations()[0].currentTime = e.duration * e.phase;
          layer
            .querySelectorAll(".cloud-billow")
            .forEach(
              (b, i) =>
                (b.getAnimations()[0].currentTime =
                  e.duration * (i ? 0.63 : 0.21)),
            );
        }
        document
          .querySelector(".godray-field")
          .getAnimations({ subtree: true })
          .forEach((a) => (a.currentTime = 28000 * 0.18));
      }, config);
      await page.waitForTimeout(100);
      const data = await page.evaluate(() =>
        Object.fromEntries(
          [".brand-copy", ".world-art", ".gate-art", ".shore-art"].map((s) => {
            const r = document.querySelector(s).getBoundingClientRect();
            return [s, { x: r.x, y: r.y, width: r.width, height: r.height }];
          }),
        ),
      );
      report.push({ label, viewport, boxes: data });
      await page.screenshot({ path: `${out}/${viewport.width}-${label}.png` });
      await page.close();
    }
} finally {
  await browser.close();
  await writeFile(`${out}/layout.json`, JSON.stringify(report, null, 2));
}
console.log(
  "Captured same viewport, same animation phase and camera for desktop/tablet/mobile before and after.",
);
