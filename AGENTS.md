# MILOQEN 官网维护规范

本文件只规定本仓库的维护，不修改用户全局记忆政策。当前用户请求优先。常规技术决策自主处理；正式发布、合并 main、重大品牌改向与不可逆操作须明确确认。

## 内容与美术边界

- 弥洛生 / MILOQEN；宣言“让想象拥有生命。”
- 《奇妙拍档》为策划与研究中的原创节奏游戏，计划手机与 PC，尚未正式开发。禁止虚构截图、角色、实机、下载、奖项、发布日期、团队规模、公司或法律资质。
- 已确认外部渠道只有 GitHub。TapTap 公开主页未确认，配置 null/false；不猜 URL、不使用开发者后台。
- 保留《星门之外的世界树》与既有云雾。范围外页面不要顺带重做。网站概念图不是游戏画面。
- 动态、性能、真机与美术验收分开记录；不能用像素测试或运行成功代替视觉通过。

## 修改入口

优先 MCP 代码图发现：search_graph → trace_path → get_code_snippet；未索引先 index_repository。字符串/配置与图不足时再 rg。

| 需求 | 入口 |
|---|---|
| 品牌、已确认渠道 | src/data/site.json |
| 作品新增、封面与阶段 | src/data/works.json、scripts/site/pages.mjs |
| 理念/介绍/空状态 | src/data/editorial.json |
| 创作日志 | content/journal/*.md（JSON front matter） |
| 页面/共享导航/SEO | src/page.html、scripts/site/pages.mjs、components.mjs |
| 字体/配色/留白 | src/styles/tokens.css、site.css、editorial.css |
| 水面/光路位置、开关、参数 | src/data/materials.json |
| 水面/光路生命周期/渲染 | src/scenes/materials/ |
| 云雾/镜头 | src/data/environment.json、world.json 与 src/scenes/environment.ts |
| 分层素材来源和重建 | art-source/material-samples、scripts/prepare-sample-materials.mjs |

index.html、内页 HTML、public/sitemap.xml 等由 npm run build 生成，不直接手改。Markdown 不执行 HTML/MDX。新增文章必须来自用户提供或确认的真实内容；事实不足先留草稿，不编造成果。

## 日常工作流程

1. git status / fetch，核对 origin 为 Loraine-Dev/Loraine-Dev.github.io，保留别人修改；建立 codex/* 开发分支。
2. 限制变更范围。解释预期行为；涉及程序行为先建有意义的失败检查再修复。
3. npm ci；npm run check。交互、布局、资源或动画修改还须 npm run test:browser:ci，提供桌面和手机实际预览。
4. 内容更新演练 test:content 在临时目录执行，不把示例文章发布到公共站点。
5. 本地 commit，普通 push 开发分支，创建 PR。只在用户确认后合并 main。禁止 force push、重写既有历史、绕过分支保护或输出凭据。
6. 首次 Pages 发布另须明确确认。MILOQEN_PAGES_APPROVED 缺省/false 时不得部署；不为测试自动开启它。后续为 Codex 修改→CI→用户确认合并→自动发布。

## 必要验证与回滚

- npm run check：构建、几何/遮罩/内容/维护演练、部署路径检查。
- npm run test:browser:ci：自动启动隔离端口，检查六页×四尺寸、菜单/键盘/404、首页材质/暂停/降级和图片选源；退出时停止服务。
- 正常首页没有调试控件。开发环境 ?motionMode=all|off|water|rays|clouds 打开单项验收；生产不接受这组调试开关。
- 调试组件必须同时有入口和组件自身的构建环境守卫；禁止仅靠CSS隐藏。effects/camera/pointer等测试参数仅开发环境生效。release扫描所有产物HTML/JS/CSS中的调试组件标记；production-ui浏览器检查生产参数隔离，保持此检查纳入CI。
- 保留 f225703、8c4e474 可追溯祖先和稳定分支。回滚通过新分支+revert/恢复已确认快照的 PR，不 reset/force main。
- 源图变更后必须重新配准桌面/手机水域、遮挡、光源和边界。不要只扩大 Shader 参数或位移。
- Worker/WebGL 不支持时保留原画和轻量云雾，不重新启用旧全画幅材质。后台、离屏暂停，减少动态/低内存/省流回退。
- 没有真机则明确“真机性能、耗电、发热尚未验证”。部署前确认 CI 在 GitHub 实际成功；本地通过不等于线上执行通过。

当前维护手册：docs/MILOQEN-长期维护.md。历史报告保留，不作为当前性能数字或发布状态。
