import { chromium, firefox, webkit } from "playwright";
import sharp from "sharp";
import { mkdir, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { median, visualDifference, performanceRegression } from "./model.mjs";
export async function probe(previous = {}, accept = false) {
  const out = "artifacts/maintenance";
  await mkdir(out, { recursive: true });
  await new Promise((resolve, reject) => {
    const socket = createServer();
    socket.once("error", reject);
    socket.listen(4183, "127.0.0.1", () => socket.close(resolve));
  });
  const server = spawn(
    process.execPath,
    [
      "node_modules/vite/bin/vite.js",
      "preview",
      "--host",
      "127.0.0.1",
      "--port",
      "4183",
      "--strictPort",
    ],
    { stdio: "ignore" },
  );
  let browser;
  const checks = [],
    unknown = [],
    visual = {},
    performance = {};
  try {
    let ready = false;
    for (let i = 0; i < 80; i++) {
      try {
        if ((await fetch("http://127.0.0.1:4183/")).ok) {
          ready = true;
          break;
        }
      } catch {}
      await new Promise((r) => setTimeout(r, 250));
    }
    if (!ready) throw Error("preview unavailable");
    browser = await chromium.launch({ args: ["--enable-unsafe-swiftshader"] });
    const environment = process.platform + "-chromium-" + browser.version();
    const comparable = previous.environment === environment;
    for (const [device, viewport] of [
      ["desktop", { width: 1440, height: 900 }],
      ["mobile", { width: 390, height: 844 }],
    ]) {
      const page = await browser.newPage({ viewport, reducedMotion: "reduce" });
      for (const route of ["", "works/", "contact/"]) {
        const name = (route.replace("/", "") || "home") + "-" + device;
        await page.goto("http://127.0.0.1:4183/" + route, {
          waitUntil: "networkidle",
        });
        await page.evaluate(() => document.fonts.ready);
        const screenshot = await page.screenshot({
          animations: "disabled",
          path: `${out}/${name}.png`,
        });
        const pixels = [
          ...(await sharp(screenshot)
            .resize(16, 16)
            .greyscale()
            .raw()
            .toBuffer()),
        ];
        visual[name] = pixels;
        const before = comparable ? previous.visual?.[name] : null;
        if (before && !accept) {
          const diff = visualDifference(pixels, before);
          checks.push({
            id: "visual-" + name,
            ok: diff < 0.06,
            detail: `降采样像素变化 ${(diff * 100).toFixed(2)}%`,
          });
        }
      }
      await page.close();
    }
    if (!comparable)
      unknown.push("截图/性能首次基线或运行环境变化，本次建立候选基线");
    for (const route of ["", "works/"]) {
      const name = route ? "works" : "home",
        samples = [];
      for (let n = 0; n < 3; n++) {
        const context = await browser.newContext({
            viewport: { width: 390, height: 844 },
            reducedMotion: "reduce",
          }),
          page = await context.newPage();
        await page.addInitScript(() => {
          window.__lcp = 0;
          new PerformanceObserver((list) => {
            window.__lcp = list.getEntries().at(-1)?.startTime || 0;
          }).observe({ type: "largest-contentful-paint", buffered: true });
        });
        await page.goto("http://127.0.0.1:4183/" + route, {
          waitUntil: "networkidle",
        });
        await page.evaluate(() => document.fonts.ready);
        samples.push(
          Math.round(
            await page.evaluate(
              () =>
                window.__lcp ||
                performance.getEntriesByType("navigation")[0]
                  .domContentLoadedEventEnd,
            ),
          ),
        );
        await context.close();
      }
      performance[name] = {
        samples,
        median: median(samples),
        min: Math.min(...samples),
        max: Math.max(...samples),
      };
      const before = comparable ? previous.performance?.[name]?.median : null;
      checks.push({
        id: "performance-" + name,
        ok: !performanceRegression(samples, before),
        detail: `runner本地LCP ${median(samples)}ms [${Math.min(...samples)},${Math.max(...samples)}]，3次；非真机`,
      });
    }
    await browser.close();
    browser = null;
    for (const [name, engine] of [
      ["Firefox", firefox],
      ["WebKit", webkit],
    ]) {
      let instance;
      try {
        instance = await engine.launch();
        const page = await instance.newPage({
          viewport: { width: 390, height: 844 },
          reducedMotion: "reduce",
        });
        for (const route of ["", "works/"]) {
          await page.goto("http://127.0.0.1:4183/" + route, {
            waitUntil: "networkidle",
          });
          if (!(await page.locator("h1").isVisible()))
            throw Error("heading missing");
          if (
            await page
              .locator("#motion-debug,#motion-compare,#art-study")
              .count()
          )
            throw Error("debug UI");
        }
        checks.push({
          id: "browser-" + name,
          ok: true,
          detail:
            "Linux桌面引擎手机尺寸基本访问/静态回退，不等于真实Safari或手机",
        });
      } catch {
        unknown.push(name + "基本兼容性未验证/启动或访问失败");
      } finally {
        await instance?.close();
      }
    }
    const visualFailed = checks.some(
      (c) => c.id.startsWith("visual-") && !c.ok,
    );
    const perfFailed = checks.some(
      (c) => c.id.startsWith("performance-") && !c.ok,
    );
    return {
      checks,
      unknown,
      environment,
      visual: visualFailed && !accept ? previous.visual : visual,
      performance: perfFailed ? previous.performance : performance,
    };
  } finally {
    await browser?.close();
    server.kill();
  }
}
