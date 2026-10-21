import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
const out = process.env.REVIEW_OUT || "artifacts/final-quality";
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
      errors = [],
      steps = [],
      started = Date.now();
    page.on("pageerror", (e) => errors.push(e.message));
    const mark = (label) => {
      steps.push({
        label,
        seconds: (Date.now() - started) / 1000,
        url: page.url(),
      });
      console.log(device, label);
    };
    await page.goto("http://127.0.0.1:4177/", { waitUntil: "networkidle" });
    mark("首页 · 静置观察");
    await page.waitForTimeout(12000);
    await page.getByRole("link", { name: "探索世界", exact: true }).click();
    await page.waitForTimeout(2400);
    mark("滚动穿门 · 创造者");
    await page.waitForTimeout(1800);
    await page.locator(".home-work .text-link").click();
    await page.waitForLoadState("networkidle");
    mark("计划作品 · 策划中");
    await page.waitForTimeout(1800);
    await page.locator(".work-facts").scrollIntoViewIfNeeded();
    await page.waitForTimeout(1800);
    for (const [name, label] of [
      ["创作理念", "创作理念"],
      ["关于弥洛生", "关于弥洛生"],
      ["创作记录", "创作记录 · 真实空状态"],
      ["联系", "联系 · GitHub"],
    ]) {
      if (await page.locator(".mobile-menu").isVisible()) {
        await page.locator(".mobile-menu summary").click();
        await page
          .getByRole("navigation", { name: "移动导航", exact: true })
          .getByRole("link", { name: new RegExp(name) })
          .click();
      } else
        await page
          .getByRole("navigation", { name: "主导航", exact: true })
          .getByRole("link", { name: new RegExp(name) })
          .click();
      await page.waitForLoadState("networkidle");
      mark(label);
      await page.waitForTimeout(2200);
      if (name === "创作理念") {
        await page.locator(".principles").scrollIntoViewIfNeeded();
        await page.waitForTimeout(1600);
      }
    }
    mark("结束");
    const video = page.video();
    await context.close();
    await video.saveAs(`${out}/tour-${device}.webm`);
    execFileSync("ffmpeg", [
      "-hide_banner",
      "-loglevel",
      "error",
      "-y",
      "-i",
      `${out}/tour-${device}.webm`,
      "-c:v",
      "libx264",
      "-threads",
      "1",
      "-crf",
      "18",
      "-preset",
      "fast",
      "-pix_fmt",
      "yuv420p",
      "-movflags",
      "+faststart",
      `${out}/tour-${device}.mp4`,
    ]);
    await writeFile(
      `${out}/tour-${device}.json`,
      JSON.stringify(
        {
          device,
          viewport,
          normalSpeed: true,
          mobileEmulation: device === "mobile",
          steps,
          errors,
        },
        null,
        2,
      ),
    );
  }
} finally {
  await browser.close();
}
