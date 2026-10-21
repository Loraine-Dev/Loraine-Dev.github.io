# 弥洛生 MILOQEN · 完整官网 V1.0 RC

保留《星门之外的世界树》与云雾的完整静态多页网站。当前版本 1.0.0-rc.1，本地验收中，未发布；构建成功不代表最终艺术验收通过。

六个真实路由：Home、Works、Philosophy、About、Journal、Contact，另有自定义 404、SEO 与站点地图。《奇妙拍档》为策划与研究中的原创节奏游戏，尚未正式开发，计划手机与 PC；没有实机、下载、发布日期或虚构文章。公开渠道仅使用 GitHub，TapTap 等待确认的公开 URL。

## 运行与检查

要求 Node.js 24，先运行 npm ci。两个终端分别运行 npm run dev（4176）和 npm run preview -- --port 4177（须先 npm run build）。

- npm run check：构建、单元、无损遮罩、整站、选源与动态生命周期检查；需要上述两个服务。
- npm run test:browser：Chromium 镜头与回退、Edge/Firefox 可用性和布局。
- npm run test:release：检查 dist 路径、资源、所有页面和静态部署要求。
- npm run review:v1：生成完整验收入口，位于 /review/v1.html?device=desktop 或 mobile，以及 /review/v1-gallery.html。
- 首页六模式：/review/living.html?device=desktop 或 mobile；仅开发环境有分项开关。

首次在新机器执行浏览器测试前，运行 npx playwright install chromium firefox；构建本身不需要测试浏览器。

## 维护

[中文维护手册](docs/维护手册.md) · [V1.0 整合记录](docs/V1.0整合记录.md) · [局部动态原理与限制](docs/首页动态整改-20261021.md)。历史文档保留，不代表当前候选的性能或艺术结论。

修改品牌 src/data/site.json，作品 src/data/works.json，文案 src/data/editorial.json，日志 content/journal/*.md，设计变量 src/styles/tokens.css；改后重新构建。不要手改生成 HTML。

## 发布边界

面向 https://loraine-dev.github.io/ 根站点，非项目子路径。Pages 工作流只手动触发，必须先获用户明确批准。未执行远端部署，不声称线上已更新。完整工程及 dist 包另行交付。

本轮回滚：codex/stable-before-v1-integration-20261021（de168d2）；整站基线 f4f6f8e 仍保留。使用独立检出或 revert，不强制重置用户工作目录。
