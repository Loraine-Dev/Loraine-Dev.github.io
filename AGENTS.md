# MILOQEN 官网维护规范

本文件只规定本仓库的维护，不修改用户全局记忆政策。当前用户请求优先。常规技术决策自主处理；正式发布、合并 main、重大品牌改向与不可逆操作须明确确认。

## 新对话先恢复项目上下文

本仓库是弥洛生官网的长期事实来源。用户无需保留旧对话、重述项目背景或使用固定提示词。自然语言提问、检查、修改、排障和维护均按当前意图处理；旧对话与个人记忆只能作辅助，不能覆盖仓库或 GitHub 事实。

1. 先读本文件、[长期维护手册](docs/MILOQEN-长期维护.md)及[每周维护](docs/MILOQEN-每周维护.md)，再按任务读取相关数据、源码和子目录指令。不要每次全量扫描无关文件。
2. 确认当前目录是本仓库根目录，读取 `git status`、当前分支、origin；先保留未提交修改，不自动 reset、stash 或切换有冲突的工作区。正常 origin 为 `https://github.com/Loraine-Dev/Loraine-Dev.github.io.git`，SSH 等价地址也可核实后使用。
3. 涉及当前网站、修改、排障或维护时，检查可用的 GitHub 认证状态并 fetch；读取最新 main、相关 PR/CI、最近 Pages 部署和维护 Issue #3。需要发布/安全判断时另读保护规则与相关 Actions 变量。只输出必要状态，绝不输出凭据。不要为一个纯概念小问题强制登录或跑全站测试。
4. 文档的日期/提交只是快照。以当前用户指令确定意图，以源码和 GitHub 实际状态确认实现/发布；发现不一致，先说明并核实，不能用旧报告宣布检查通过。GitHub 不可达则明确未知，继续不依赖网络的工作，不能假称已同步或发布。
5. 简单问题直接回答；明确修改需求在独立 `codex/*` 分支自主实施、做必要测试、提交 PR。常规技术取舍不反复询问。仅缺少真实内容或关键约束时询问缺项，不索要整份背景。重大美术改向、权限/安全风险、不可逆操作、main 合并和正式发布须取得对应授权；既有首次发布授权不自动授权未来所有 PR 合并。
6. 交付只说明相关改动、实际验证、预览/PR 与剩余问题；更新受影响的维护文档，把必要上下文写回仓库，而非只留在对话。不要替用户自动批准自己的 PR，也不要创建额外定时任务。

## 项目身份与架构

- 仓库：`Loraine-Dev/Loraine-Dev.github.io`；公网：<https://loraine-dev.github.io/>。默认分支 main；根域 GitHub Pages 静态站，无服务端表单或数据库。
- Node.js 24、npm 锁文件、Vite + TypeScript 静态多页。`scripts/render.mjs`/`scripts/site/` 把 JSON 内容、安全 Markdown 和共享模板生成页面；Three.js 仅用于必要的首页空间层次，内页不加载首页场景。没有 Astro/React/GSAP 架构，不为维护换框架。
- 路由：Home `/`、Works `/works/`、Philosophy `/philosophy/`、About `/about/`、Journal `/journal/`、Contact `/contact/`，另有 `404.html`、robots 和 sitemap。Journal 无真实文章时为空状态。
- 云雾和镜头独立运行；`src/scenes/materials/` 的一个 Worker 管理水面、空气光两个局部画布。参数/素材与内容分离；详见手册，不把旧实验代码当成生产入口。
- 已发布稳定点：`v1.0.0` → `7ffe2f7`（2026-10-22）；原批准网站 `619a89b`，PR #12 仅改 CI 网络重试。此为恢复参考，不是要求后续任务永远停在该提交。发布记录见 GitHub Releases。

## 内容与美术边界

- 弥洛生 / MILOQEN；宣言“让想象拥有生命。”
- 《奇妙拍档》为策划与研究中的原创节奏游戏，计划手机与 PC，尚未正式开发。禁止虚构截图、角色、实机、下载、奖项、发布日期、团队规模、公司或法律资质。
- 已确认外部渠道只有 GitHub。TapTap 公开主页未确认，配置 null/false；不猜 URL、不使用开发者后台。
- 保留《星门之外的世界树》与既有云雾。范围外页面不要顺带重做。网站概念图不是游戏画面。
- 艺术上大胆、设计上克制、技术上聪明；少量精确变化优先。维持电影感、诗意、深度、协调的中英文字体与手机独立裁切。首页负责沉浸，内页采用清晰的画册排版；不要堆卡片、霓虹、粒子或重做抽象金属雕塑。视觉变量在 tokens.css，素材须保留来源与重建信息。
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

## 安全维护要求

- V1.0页面/美术基线为2e89c5f，首次发布标签为v1.0.0。例行巡检不修改页面；以后明确授权的新设计/功能任务可以在独立PR中推进，不把冻结误解成永久禁止维护。非任务范围内的艺术增强另开后续任务，不能夹带重构。
- 每周巡检为.github/workflows/weekly-maintenance.yml，cron 0 1 * * 1（周一北京时间09:00）。必须存在于默认分支才会定时运行；GitHub可延迟/丢弃，公开仓库60天无活动可能禁用。未合并不得声称已启用。
- 检查任务只读，报告任务仅issues:write，不得增加contents/pages/id-token写权限。报告在Actions Summary/weekly-evidence及固定机器人Issue；同一指纹不重复通知，恢复只记录一次。禁止输出凭据、上传原始敏感日志或读取私钥。
- 新维护代码运行npm run test:maintenance及既有check/security/browser检查；截图比较只是明显回归筛查，不能宣称艺术/真机通过。性能至少3次样本，中位数同时超过相对及绝对阈值才告警；环境改变重建基线须明确说明。
- 公网未首次发布时标待上线，不将404当正常；Dependabot/管理员设置API无权限则明确尚未验证，不索取新令牌或扩权。Codex无已验证云端执行通道时只采用GitHub Issue→用户下次打开Codex修复PR，不假称自动修复。
- 维护暂停通过仓库变量MILOQEN_MAINTENANCE_PAUSED=true；恢复设false，改变此维护开关需用户要求。与首次发布变量独立，不自动改变任何账号/分支保护/发布设置。

- 所有变更经开发分支、PR、必要测试、人类确认合并；自动化不得批准或合并自己的高风险修改。main/账号权限/保护规则变动及首次发布单独征得确认。
- 禁止读取、输出、复制或提交令牌、私钥、恢复码；只记录认证是否有效及最小权限元数据。不为审计扩大授权范围。
- GitHub Actions 固定官方完整提交 SHA；checkout 设置 persist-credentials:false；普通检查仅 contents:read，pages/id-token 写权限只给通过检查且发布门禁开启的部署任务。禁止 pull_request_target 执行不可信 PR 代码、传入 secrets、自动批准 PR 或合并。
- npm run check、npm run test:security、npm audit --audit-level=low；界面/脚本/策略变动还须 npm run test:browser:ci。发现漏洞须评估并修复，不能为了绿灯静默忽略；审计服务故障如实报告。
- pages.yml 的强制审计使用官方 registry，最多3次，请求60秒、进程90秒，等待10/30秒。有效报告发现漏洞立即失败；无有效结果或命令失败在重试耗尽后仍失败。不得删审计、用 continue-on-error 放行或擅换漏洞数据源。
- Markdown 不执行 HTML/MDX；新内容必须转义；外链验证协议、主机与官方确认状态。浏览器脚本和素材使用本地资源；不为方便加入 unsafe-eval 或放宽 script-src。
- 生产 CSP 是构建期 meta 策略，不是服务器响应头；不要伪称 frame-ancestors、X-Frame-Options 或 Permissions-Policy 已通过此方式启用。保持开发 HMR 不受生产策略影响。
- Dependabot 更新仅创建 PR，禁止自动合并；合并前重新测试。历史快照和回滚使用新提交/PR，不强推、不改写 main 历史。
