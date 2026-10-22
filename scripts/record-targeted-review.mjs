import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
const out = "artifacts/targeted/media";
await mkdir(out, { recursive: true });
const browser = await chromium.launch({
  args: ["--enable-unsafe-swiftshader"],
});
function encode(input, output, args = []) {
  execFileSync("ffmpeg", [
    "-hide_banner",
    "-loglevel",
    "error",
    "-y",
    ...args,
    "-i",
    input,
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
    output,
  ]);
}
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
    const start = Date.now();
    await page.goto("http://127.0.0.1:4176/?motionMode=all", {
      waitUntil: "networkidle",
    });
    await page.locator(".living-scene[data-state=ready]").waitFor();
    const readySeconds = (Date.now() - start) / 1000;
    await page.waitForTimeout(31000);
    const status = await page
      .locator(".living-scene")
      .evaluate((c) => ({ ...c.dataset }));
    await page.screenshot({ path: `${out}/home-${device}.png` });
    await page.mouse.wheel(0, 380);
    await page.waitForTimeout(1800);
    const video = page.video();
    await context.close();
    await video.saveAs(`${out}/normal-${device}.webm`);
    encode(`${out}/normal-${device}.webm`, `${out}/normal-${device}-full.mp4`);
    // Continuous, unaccelerated excerpt after initialization; the complete take
    // including load and scroll is retained separately, so startup is not hidden.
    execFileSync("ffmpeg", [
      "-hide_banner",
      "-loglevel",
      "error",
      "-y",
      "-ss",
      String(readySeconds + 0.25),
      "-i",
      `${out}/normal-${device}.webm`,
      "-t",
      "30",
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
      `${out}/normal-${device}-30s.mp4`,
    ]);
    await writeFile(
      `${out}/normal-${device}.json`,
      JSON.stringify(
        {
          device,
          viewport,
          readySeconds,
          normalSpeed: true,
          initializationAndScrollRetained: true,
          status,
          errors,
          physicalDevice: false,
        },
        null,
        2,
      ),
    );
    console.log(device, "normal 30s and full take", errors);
    const pairContext = await browser.newContext({
      viewport,
      isMobile: device === "mobile",
      hasTouch: device === "mobile",
      reducedMotion: "no-preference",
      recordVideo: { dir: out, size: viewport },
    });
    const p = await pairContext.newPage(),
      pairErrors = [],
      marks = [],
      pairStart = Date.now();
    p.on("pageerror", (e) => pairErrors.push(e.message));
    await p.goto("http://127.0.0.1:4176/?motionMode=off", {
      waitUntil: "networkidle",
    });
    await p.locator(".living-scene[data-state=ready]").waitFor({ state: "attached" });
    for (const [id, label] of [
      ["clouds", "仅云雾"],
      ["rays", "仅丁达尔光"],
      ["water", "仅水面"],
      ["tree", "仅世界树"],
    ]) {
      await p.getByRole("button", { name: "全部关闭", exact: true }).click();
      marks.push({
        effect: id,
        state: "off",
        seconds: (Date.now() - pairStart) / 1000,
      });
      await p.waitForTimeout(3000);
      await p.screenshot({ path: `${out}/${device}-${id}-off.png` });
      await p.getByRole("button", { name: label, exact: true }).click();
      marks.push({
        effect: id,
        state: "on",
        seconds: (Date.now() - pairStart) / 1000,
      });
      await p.waitForTimeout(10000);
      await p.screenshot({ path: `${out}/${device}-${id}-on.png` });
      await p.getByRole("button", { name: "全部关闭", exact: true }).click();
      marks.push({
        effect: id,
        state: "off",
        seconds: (Date.now() - pairStart) / 1000,
      });
      await p.waitForTimeout(3000);
    }
    const pairVideo = p.video();
    await pairContext.close();
    await pairVideo.saveAs(`${out}/effects-${device}.webm`);
    encode(`${out}/effects-${device}.webm`, `${out}/effects-${device}.mp4`);
    await writeFile(
      `${out}/effects-${device}.json`,
      JSON.stringify(
        {
          device,
          viewport,
          normalSpeed: true,
          marks,
          errors: pairErrors,
          physicalDevice: false,
        },
        null,
        2,
      ),
    );
    console.log(device, "four separate off/on/off sequences", pairErrors);
  }
} finally {
  await browser.close();
}
