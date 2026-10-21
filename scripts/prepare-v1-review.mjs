import { writeFile } from "node:fs/promises";
const routes = [
  ["", "首页"],
  ["works", "计划作品"],
  ["philosophy", "创作理念"],
  ["about", "关于弥洛生"],
  ["journal", "创作记录"],
  ["contact", "联系"],
];
const html = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>MILOQEN V1.0 · 完整网站验收</title><style>*{box-sizing:border-box}body{margin:0;background:#0c1119;color:#e9e2d6;font:15px/1.7 Arial,"Microsoft YaHei",sans-serif}main{max-width:1240px;margin:auto;padding:40px 24px}h1{font-size:32px;font-weight:400}h2{font-weight:400;margin-top:50px}p{color:#b8c3ce}a{color:#e1c99f}nav{display:flex;flex-wrap:wrap;gap:18px}.grid{display:grid;grid-template-columns:3fr 1fr;gap:24px}.grid img{width:100%;display:block}figure{margin:0}figcaption{margin:10px 0 25px}video{width:100%;max-height:75vh;background:#05090e}.videos{display:grid;grid-template-columns:2fr 1fr;gap:20px}@media(max-width:700px){.grid,.videos{grid-template-columns:1fr}.grid figure:last-child{max-width:390px}main{padding:24px 16px}}</style></head><body><main><p>MILOQEN / V1.0 RC · 未发布 · 待艺术验收</p><h1>越过星门，认识弥洛生。</h1><p>以下为当前构建的真实浏览器截图与正常速度导览。作品处于策划与研究中，日志为空状态。技术检查不代替视觉验收。</p><nav><a href="./v1.html?device=desktop">桌面实时全站</a><a href="./v1.html?device=mobile">手机实时全站</a><a href="./living.html?device=desktop">首页六模式对比</a><a href="http://127.0.0.1:4177/" target="_blank">原尺寸生产预览 ↗</a></nav>${routes.map(([slug, label]) => `<h2>${label} / ${slug.toUpperCase() || "HOME"}</h2><p><a href="http://127.0.0.1:4177/${slug ? slug + "/" : ""}" target="_blank">实际页面 ↗</a></p><div class="grid">${[1440, 390].map((width) => `<figure><a href="../artifacts/complete-site/${slug || "home"}-${width}.png" target="_blank"><img loading="lazy" src="../artifacts/complete-site/${slug || "home"}-${width}-first.png" alt="${label}${width === 1440 ? "桌面" : "手机"}实际截图"></a><figcaption>${width === 1440 ? "桌面 1440×900" : "手机视口 390×844"} · 点击查看长图</figcaption></figure>`).join("")}</div>`).join("")}<h2>完整网站 · 真实运行导览</h2><p>正常速度：首页静置、穿越星门、计划作品、理念、关于、创作记录和联系。手机为视口模拟，未代替实体手机测试。</p><div class="videos"><video controls preload="metadata" src="../artifacts/v1/tour-desktop.mp4"></video><video controls preload="metadata" src="../artifacts/v1/tour-mobile.mp4"></video></div><h2>首页动态 · 静态与分项对比</h2><p>六项开关仅开发预览可见。局部光路、倒影折射和树冠受光是 2.5D 处理；不声称实现了独立瀑布、枝叶或真实体积光。</p><video controls preload="metadata" src="../artifacts/living-final/comparison.mp4"></video></main></body></html>`;
await writeFile("review/v1-gallery.html", html);
// Share the fixed-viewport review shell. Navigation inside the iframe remains live.
const { readFile } = await import("node:fs/promises");
let shell = await readFile("review/living.html", "utf8");
shell = shell
  .replaceAll("首页动态最终整改验收", "V1.0 完整官网验收")
  .replaceAll("首页动态 · 待艺术验收", "V1.0 完整官网 · 待艺术验收")
  .replaceAll(
    "画面左下六项独立开关 · 正常速度 · 未发布",
    "可使用站内导航逐页操作 · 未发布",
  )
  .replaceAll('src="/?motionMode=all"', 'src="http://127.0.0.1:4177/"')
  .replaceAll('href="/?motionMode=all"', 'href="http://127.0.0.1:4177/"');
await writeFile("review/v1.html", shell);
console.log("Prepared V1 live review shell and gallery");
