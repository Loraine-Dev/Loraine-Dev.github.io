# 弥洛生 MILOQEN · 完整官网验收版

2026-10-21：已进入发布前质量候选，仍未部署。LCP 三轮中位数 4.216 → 3.759 秒，2.5 秒目标未达，冷启动存在待复核异常。完整数据和实验取舍见 [本轮记录](docs/发布前质量优化-20261021.md)。当前预览为 `/review/quality.html?device=desktop`、`?device=tablet`、`?device=mobile`；逐屏资料为 `/review/quality-gallery.html`。

保留《星门之外的世界树》主视觉的静态多页官网：Home、Works、Philosophy、About、Journal、Contact，含 404、SEO 和站点地图。当前只在本地验收，未发布。

《奇妙拍档》为策划与研究中的原创节奏游戏，尚未正式开发，计划平台手机与 PC。没有实机、角色、下载或发布日期。

## 运行

需要 Node.js 24。

```sh
npm ci
npm run dev
npm run build
npm run preview -- --port 4177
```

- 开发入口：http://127.0.0.1:4176/
- 完整生产构建：http://127.0.0.1:4177/
- 桌面验收：http://127.0.0.1:4176/review/complete.html?device=desktop
- 手机验收：http://127.0.0.1:4176/review/complete.html?device=mobile
- 开发专用光路 A/B：http://127.0.0.1:4176/?artStudy=godrays

## 维护与检查

完整中文说明：[维护手册](docs/维护手册.md)。品牌与文案在 src/data，作品为 works.json 数组，文章为 content/journal 的 Markdown。修改后运行构建，内页不加载场景代码。页面由 scripts/render.mjs 生成，勿手改生成 HTML。

```sh
npm run test:unit
npm run test:site
node tests/world-browser.mjs
node scripts/audit-site.mjs
```

浏览器检查需要先在 4177 启动生产预览。报告和逐页截图输出 artifacts/complete-site；不把自动测试通过视为艺术验收通过。

## 发布边界

仅手动触发的 GitHub Pages 工作流已准备，未运行。正式域名为用户根站点 https://loraine-dev.github.io/ 。验收与明确发布授权之前，不推送、不覆盖线上站点。

当前阶段设计与实施：[完整官网计划](docs/complete-site-plan.md)。上轮原型路线和旧 README 保留在 docs 中作为历史记录，其“仅首页、等待实施”等表述已被本轮授权取代。

本轮前回滚分支：codex/stable-before-complete-site-20261020（426c44e）。
