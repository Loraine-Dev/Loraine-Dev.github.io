import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
const out = "artifacts/final-quality/screens";
await mkdir(out, { recursive: true });
const browser = await chromium.launch({
  args: ["--enable-unsafe-swiftshader"],
});
try {
  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 768, height: 1024 },
    { width: 390, height: 844 },
  ]) {
    const page = await browser.newPage({
      viewport,
      reducedMotion: "no-preference",
    });
    for (const route of [
      "",
      "works/",
      "philosophy/",
      "about/",
      "journal/",
      "contact/",
    ]) {
      await page.goto("http://127.0.0.1:4177/" + route, {
        waitUntil: "networkidle",
      });
      await page.waitForTimeout(1800);
      const name = route.replace("/", "") || "home";
      await page.screenshot({
        path: `${out}/${name}-${viewport.width}-first.png`,
      });
      if (route)
        await page.screenshot({
          path: `${out}/${name}-${viewport.width}.png`,
          fullPage: true,
        });
      else
        for (const [key, selector] of [
          ["creator", ".home-creator"],
          ["work", ".home-work"],
          ["afterglow", ".home-afterglow"],
        ]) {
          await page
            .locator(selector)
            .evaluate((e) =>
              e.scrollIntoView({ behavior: "instant", block: "start" }),
            );
          await page.waitForTimeout(650);
          await page.screenshot({
            path: `${out}/home-${key}-${viewport.width}.png`,
          });
        }
    }
    await page.close();
  }
} finally {
  await browser.close();
}
const pages = [
  ["home", "首页"],
  ["works", "计划作品"],
  ["philosophy", "创作理念"],
  ["about", "关于弥洛生"],
  ["journal", "创作记录"],
  ["contact", "联系"],
];
const html = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>MILOQEN · 逐屏艺术验收</title><style>*{box-sizing:border-box}body{background:#10151d;color:#eee7da;font:14px/1.8 Arial,"Microsoft YaHei",sans-serif;margin:0;padding:32px}a{color:#d0b78d}h1{font-size:26px;font-weight:400}nav{display:flex;gap:24px;flex-wrap:wrap;margin:20px 0 40px}.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:32px}figure{margin:0}figure img{width:100%;height:auto;display:block}figcaption{margin:12px 0 30px}figure.mobile img{max-width:390px;margin:auto}h2{font-size:19px;font-weight:400;border-top:1px solid #b9c6cf40;padding-top:30px;margin-top:50px}p{color:#b9c6cf}.video{display:grid;grid-template-columns:2fr 1fr;gap:24px}video{width:100%;max-height:75vh}@media(max-width:800px){.grid{grid-template-columns:1fr}.video{grid-template-columns:1fr}body{padding:20px}}</style></head><body><h1>MILOQEN · 逐屏艺术验收</h1><p>这是验收工具，不是正式站点。以下均为当前生产构建的真实浏览器截图。点击图片查看原尺寸；首页按实际滚动位置分屏，避免长截图把 sticky 区域误呈现为空白。</p><nav><a href="./quality.html?device=desktop">桌面实时预览</a><a href="./quality.html?device=mobile">手机实时预览</a><a href="http://127.0.0.1:4177/" target="_blank">打开完整网站 ↗</a></nav><h2>桌面 · 1440 × 900</h2><div class="grid">${pages.map(([slug, label]) => `<figure><a href="../artifacts/final-quality/screens/${slug}-1440-first.png" target="_blank"><img src="../artifacts/final-quality/screens/${slug}-1440-first.png" alt="${label}桌面真实截图" loading="lazy"></a><figcaption>${label} · <a href="http://127.0.0.1:4177/${slug === "home" ? "" : slug + "/"}" target="_blank">操作页面 ↗</a>${slug === "home" ? "" : ` · <a href="../artifacts/final-quality/screens/${slug}-1440.png" target="_blank">完整长图</a>`}</figcaption></figure>`).join("")}</div><h2>首页后续叙事</h2><div class="grid">${[
  ["creator", "创造者"],
  ["work", "作品"],
  ["afterglow", "余韵"],
]
  .map(
    ([slug, label]) =>
      `<figure><a href="../artifacts/final-quality/screens/home-${slug}-1440.png" target="_blank"><img src="../artifacts/final-quality/screens/home-${slug}-1440.png" alt="首页${label}真实截图" loading="lazy"></a><figcaption>${label}</figcaption></figure>`,
  )
  .join(
    "",
  )}</div><h2>手机 · 390 × 844（浏览器视口模拟）</h2><div class="grid">${pages.map(([slug, label]) => `<figure class="mobile"><a href="../artifacts/final-quality/screens/${slug}-390${slug === "home" ? "-first" : ""}.png" target="_blank"><img src="../artifacts/final-quality/screens/${slug}-390-first.png" alt="${label}手机真实截图" loading="lazy"></a><figcaption>${label} · 点击查看${slug === "home" ? "原图" : "完整长图"}</figcaption></figure>`).join("")}</div><h2>完整网站 · 正常速度导览录像</h2><p>真实浏览器录制：首页静置、滚动穿门及主要内页。正常速度，无剪辑加速。手机为浏览器视口模拟。自动化通过不代表艺术验收通过。</p><div class="video"><video controls preload="metadata" src="../artifacts/final-quality/tour-desktop.mp4"></video><video controls preload="metadata" src="../artifacts/final-quality/tour-mobile.mp4"></video></div></body></html>`;
await writeFile("review/quality-gallery.html", html);
console.log(
  "Captured all pages and homepage narrative screens; review/gallery.html ready.",
);
