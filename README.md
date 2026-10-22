# 弥洛生 MILOQEN · 官网 V1.0

《星门之外的世界树》主视觉、云雾与双局部材质（水面 / 空气光）整合的静态多页官网。[正式网站](https://loraine-dev.github.io/)已于2026-10-22发布[v1.0.0](https://github.com/Loraine-Dev/Loraine-Dev.github.io/releases/tag/v1.0.0)，稳定点7ffe2f7；后续状态以GitHub实际运行和源码为准。

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

在Codex中打开本仓库根文件夹（当前电脑为 `D:\codex\work\miloqen-v6`），选择该项目后新建对话，直接说想做的事即可。新电脑可克隆后打开对应根目录。根目录AGENTS.md负责引导新对话读取维护文档、相关源码和GitHub最新状态，不依赖旧聊天或固定提示词。简单问题直接回答；明确需求在独立分支实施、测试并创建PR；合并、正式发布、重大美术与权限风险取得用户确认。

品牌、作品、理念与联系信息在 src/data，文章在 content/journal/*.md，动态参数在 src/data/materials.json。保留已有框架，没有新运行依赖。一个 Worker 管理两个局部画布，原云雾与镜头独立保留。没有新增独立瀑布或树叶动画。

GitHub Actions 在开发分支和 PR 自动检查并提供静态构建产物；main 检查通过且 MILOQEN_PAGES_APPROVED=true 时才部署。首次发布已获准并完成；后续为 Codex 修改 → 自动检查 → 用户确认合并/发布 → 自动发布，不自动批准或合并自己的PR。强制npm审计有限重试仍失败时阻断部署，不忽略失败。

[每周自动巡检](docs/MILOQEN-每周维护.md)已进入main，周一北京时间09:00（UTC `0 1 * * 1`）在GitHub独立运行；不依赖Codex对话或本机开机，GitHub调度可能延迟。[Issue #3](https://github.com/Loraine-Dev/Loraine-Dev.github.io/issues/3)记录去重的告警/恢复；发现问题后再让Codex处理为修复PR，没有已授权的无人值守自动修复/合并通道。

原画与素材历史保留 f225703、8c4e474；禁止强推或覆盖远程历史。GitHub CI 与写入状态以实际远程结果为准。美术自然度仍需看真实预览，实体手机帧率、耗电与发热未验证。
