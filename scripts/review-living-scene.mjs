import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
const out = "artifacts/living-final";
await mkdir(out, { recursive: true });
const browser = await chromium.launch({
  args: ["--enable-unsafe-swiftshader"],
});
try {
  for (const [device, viewport] of [
    ["desktop", { width: 1440, height: 900 }],
    ["mobile", { width: 390, height: 844 }],
  ]) {
    const context = await browser.newContext({
      viewport,
      isMobile: device === "mobile",
      hasTouch: device === "mobile",
      reducedMotion: "no-preference",
      recordVideo: { dir: out, size: viewport },
    });
    const page = await context.newPage(),
      errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(m.text());
    });
    await page.goto("http://127.0.0.1:4176/?motionMode=all", {
      waitUntil: "networkidle",
    });
    await page.locator(".living-scene[data-state=ready]").waitFor();
    // Do not pause browser rendering with screenshot requests during the take.
    await page.waitForTimeout(30000);
    await page.screenshot({ path: `${out}/${device}-latest.png` });
    const status = await page.locator(".living-scene").evaluate((c) => ({
      state: c.dataset.state,
      time: c.dataset.time,
      mode: c.dataset.mode,
      canvas: [c.width, c.height],
    }));
    await page.mouse.wheel(0, 420);
    await page.waitForTimeout(2500);
    const video = page.video();
    await context.close();
    await video.saveAs(`${out}/${device}-normal.webm`);
    execFileSync("ffmpeg", [
      "-hide_banner",
      "-loglevel",
      "error",
      "-y",
      "-i",
      `${out}/${device}-normal.webm`,
      "-threads",
      "1",
      "-c:v",
      "libx264",
      "-crf",
      "18",
      "-pix_fmt",
      "yuv420p",
      "-movflags",
      "+faststart",
      `${out}/${device}-normal.mp4`,
    ]);
    await writeFile(
      `${out}/${device}.json`,
      JSON.stringify(
        {
          device,
          viewport,
          status,
          errors,
          notes:
            "Normal speed; first 30 seconds idle; then scroll. Browser viewport simulation, not physical device.",
        },
        null,
        2,
      ),
    );
    console.log(device, status, errors);
  }
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    recordVideo: { dir: out, size: { width: 1440, height: 900 } },
  });
  const page = await context.newPage();
  await page.goto("http://127.0.0.1:4176/?motionMode=off", {
    waitUntil: "networkidle",
  });
  for (const label of [
    "全部关闭",
    "仅丁达尔光",
    "仅水面",
    "仅世界树",
    "仅云雾",
    "正常动态",
  ]) {
    await page.getByRole("button", { name: label, exact: true }).click();
    await page.waitForTimeout(6500);
    await page.screenshot({ path: `${out}/isolated-${label}.png` });
  }
  const v = page.video();
  await context.close();
  await v.saveAs(`${out}/comparison.webm`);
  execFileSync("ffmpeg", [
    "-hide_banner",
    "-loglevel",
    "error",
    "-y",
    "-i",
    `${out}/comparison.webm`,
    "-threads",
    "1",
    "-c:v",
    "libx264",
    "-crf",
    "18",
    "-pix_fmt",
    "yuv420p",
    "-movflags",
    "+faststart",
    `${out}/comparison.mp4`,
  ]);
} finally {
  await browser.close();
}
