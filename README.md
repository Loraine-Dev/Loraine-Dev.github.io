# 弥洛生 MILOQEN · 官网 V1.0

《星门之外的世界树》主视觉、云雾与双局部材质（水面 / 空气光）整合的静态多页官网。当前是待审核整合版本，不代表已正式发布。

Home、Works、Philosophy、About、Journal、Contact、404、SEO 和站点地图完整保留。《奇妙拍档》为策划与研究中的原创节奏游戏，尚未正式开发，计划手机与 PC。公开外部渠道只有已确认的 GitHub。

## 使用

Node.js 24；先 npm ci。npm run dev 为 http://127.0.0.1:4176/。npm run build 生成 dist，npm run preview -- --port 4177 打开生产构建。

- npm run check：构建、单元、素材、内容演练与静态部署完整性。
- npm run test:browser:ci：自动启动 4180/4181，检查六页×四尺寸、导航、材质、暂停、降级与选源；产出桌面/手机截图。
- npm run test:content：在临时目录演练文章发布、品牌内容修改、撤稿。
- npm run test:rollback：临时检出 f225703 和 8c4e474，检查干净历史与原图一致性，不重置当前分支。

浏览器测试首次需要 npx playwright install chromium。Linux CI 使用 npx playwright install --with-deps chromium。

首页正常模式没有诊断面板。开发环境 /?motionMode=all|off|water|rays|clouds 提供分项验收，生产不接受调试模式。

## 长期维护与发布

[中文维护手册](docs/MILOQEN-长期维护.md) · [Codex 开发规范](AGENTS.md) · [Journal 说明](content/journal/README.md)

品牌、作品、理念与联系信息在 src/data，文章在 content/journal/*.md，动态参数在 src/data/materials.json。保留已有框架，没有新运行依赖。一个 Worker 管理两个局部画布，原云雾与镜头独立保留。没有新增独立瀑布或树叶动画。

GitHub Actions 在开发分支和 PR 自动检查并提供静态构建产物；main 检查通过且 MILOQEN_PAGES_APPROVED=true 时才部署。首次发布必须获得明确确认，本轮不打开发布门控、不合并 main。后续为 Codex 修改 → 自动检查 → 用户确认合并 → 自动发布。

原画与素材历史保留 f225703、8c4e474；禁止强推或覆盖远程历史。GitHub CI 与写入状态以实际远程结果为准。美术自然度仍需看真实预览，实体手机帧率、耗电与发热未验证。
