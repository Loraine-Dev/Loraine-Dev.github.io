import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
const base = process.env.SITE_URL || "http://127.0.0.1:4176/";
await mkdir("artifacts/world-tree", { recursive: true });
const browser = await chromium.launch({
  args: ["--enable-unsafe-swiftshader"],
});
const records = [];
for (const [name, width, height] of [
  ["desktop", 1600, 1000],
  ["laptop", 1440, 900],
  ["mobile", 390, 844],
  ["small-mobile", 375, 667],
]) {
  const page = await browser.newPage({
    viewport: { width, height },
    deviceScaleFactor: 1,
    reducedMotion: "reduce",
  });
  page.on("pageerror", (e) => console.log("ERROR", e.message));
  page.on("console", (m) => {
    if (m.type() === "error") console.log("CONSOLE", m.text());
  });
  await page.goto(base, { waitUntil: "networkidle" });
  await page.waitForFunction(
    () => document.querySelector("#world-canvas")?.dataset.state === "live",
    null,
    { timeout: 30000 },
  );
  await page.waitForTimeout(500);
  await page.screenshot({ path: `artifacts/world-tree/${name}.png` });
  records.push({
    name,
    width,
    height,
    state: await page
      .locator("#world-canvas")
      .evaluate((el) => ({ ...el.dataset })),
    overflow: await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
  });
  if (name === "laptop") {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.evaluate(() => scrollTo(0, innerHeight * 0.78));
    await page.waitForTimeout(1200);
    await page.screenshot({ path: "artifacts/world-tree/entered.png" });
  }
  await page.close();
}
await browser.close();
await writeFile(
  "artifacts/world-tree/capture.json",
  JSON.stringify(records, null, 2),
);
console.log(JSON.stringify(records, null, 2));
