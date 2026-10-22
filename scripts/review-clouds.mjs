import { chromium } from "playwright";
import sharp from "sharp";
import fs from "node:fs/promises";
const out = `artifacts/visible-flow/${process.env.REVIEW_LABEL || "cloud-review"}`;
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch();
for (const [name, width, height] of [
  ["desktop", 1440, 900],
  ["mobile", 390, 844],
]) {
  const context = await browser.newContext({
    viewport: { width, height },
    recordVideo: { dir: out, size: { width, height } },
  });
  const page = await context.newPage();
  await page.goto(
    "http://127.0.0.1:4176/?effects=" +
      (process.env.REVIEW_EFFECTS || "farFog,midFog"),
    { waitUntil: "networkidle" },
  );
  await page.waitForTimeout(1200);
  const start = Date.now();
  for (const second of [0, 2.5, 5]) {
    const delay = start + second * 1000 - Date.now();
    if (delay > 0) await page.waitForTimeout(delay);
    await page.screenshot({ path: `${out}/${name}-${second}.png` });
  }
  const crop =
    process.env.REVIEW_EFFECTS === "treeLight"
      ? name === "desktop"
        ? { left: 600, top: 80, width: 700, height: 320 }
        : { left: 70, top: 140, width: 310, height: 165 }
      : name === "desktop"
        ? { left: 325, top: 405, width: 1050, height: 245 }
        : { left: 0, top: 270, width: 390, height: 180 };
  const strips = await Promise.all(
    [0, 2.5, 5].map((second) =>
      sharp(`${out}/${name}-${second}.png`).extract(crop).png().toBuffer(),
    ),
  );
  await sharp({
    create: {
      width: crop.width,
      height: crop.height * 3,
      channels: 3,
      background: "#07111a",
    },
  })
    .composite(
      strips.map((input, i) => ({ input, top: crop.height * i, left: 0 })),
    )
    .png()
    .toFile(`${out}/${name}-contact.png`);
  const video = page.video();
  await context.close();
  await video.saveAs(`${out}/${name}.webm`);
}
await browser.close();
