# MILOQEN V1.0 长期维护手册

本手册与根目录 [AGENTS.md](../AGENTS.md) 共同承载跨对话上下文，不以旧聊天记录为前提。每周自动巡检、告警和暂停恢复见 [每周维护手册](./MILOQEN-每周维护.md)。历史审计/验收报告是当时快照，不是当前状态证明。

## 项目背景与已发布基线

弥洛生 / MILOQEN 是原创独立游戏品牌，宣言“让想象拥有生命。”。官网是 <https://loraine-dev.github.io/>，仓库为 <https://github.com/Loraine-Dev/Loraine-Dev.github.io>。《奇妙拍档》目前为策划与研究中的原创节奏游戏，尚未正式开发，计划手机与 PC。以后阶段变更只能依据用户确认的真实资料。

2026-10-22 已正式发布 [v1.0.0](https://github.com/Loraine-Dev/Loraine-Dev.github.io/releases/tag/v1.0.0)，稳定提交 `7ffe2f7`。PR #5 合并提交 `619a89b` 保留完整官网，PR #12 仅改善 CI 审计网络可靠性，未改网站源码。首次成功部署为 [39718774906](https://github.com/Loraine-Dev/Loraine-Dev.github.io/actions/runs/39718774906)。当时 Pages 来源为 GitHub Actions，`MILOQEN_PAGES_APPROVED=true`；每周维护在 main 中 active。新任务必须重新读取 GitHub，不能把这些快照当作永远正确。

### 新 Codex 对话如何开始

在 Codex 中打开或添加仓库根文件夹，当前电脑路径为 `D:\codex\work\miloqen-v6`，建议项目名 MILOQEN。以后选中该项目，直接新建对话并正常描述需求即可，例如“看看官网有没有问题”“把这段介绍改一下”或“处理维护 Issue #3”。示例不是固定格式，不需要复制整份背景。不要只打开父级 `D:\codex` 或把素材输出目录当作项目。

新电脑先克隆仓库，再打开克隆的根目录；路径可不同，不能硬编码旧电脑路径。GitHub CLI 若未登录，用 `gh auth login --hostname github.com --git-protocol https --web` 由本人完成网页授权，随后 `gh auth setup-git`。不要把令牌贴进聊天。

Codex 启动时先读 AGENTS.md 与本手册，再根据任务读取相关源码；涉及当前状态/修改时核对工作区、origin、fetch 后 main、PR、CI、Pages 和维护记录。已有未提交修改先保留。简单问答不强制跑这些网络/构建步骤；网络不可用只标未知，不声称检查通过。发现缺少具体事实时只问缺项，不要求重述背景。

官方依据：[OpenAI AGENTS.md 项目指令](https://learn.chatgpt.com/docs/agent-configuration/agents-md)。项目根目录会影响指令发现；若规则未加载，先核实工作目录与覆盖文件，再重开项目对话。中文手册由 AGENTS.md 明确要求读取，并非所有文档都会自动加入上下文。

## 设计与技术地图

保留《星门之外的世界树 / Beyond the Gate — A Living World》：星门框景、世界树焦点、前中后景与原画光源一致。原则是“艺术上大胆、设计上克制、技术上聪明”“更少运动，更大惊叹”。不靠粒子、强光或复杂3D制造完成感；改手机裁切、字体和留白时仍须保护主体与可读性。日常维护不擅自重做方向，重大美术变动先给可审查方案并取得确认。

工程为 Node.js 24 + npm、Vite + TypeScript 静态多页；Three.js 负责首页必要空间层次，局部材质在 Worker 中渲染。没有服务端、数据库、真实表单、Astro 或 React。`scripts/render.mjs` 调用 `scripts/site/` 从数据与模板生成 HTML；内页使用共享样式/导航，但不重复首页世界树背景、不加载首页动画。

| 内容区域 | 路由与目的 |
|---|---|
| Home | `/`，沉浸开场、创作理念与作品入口、余韵 |
| Works | `/works/`，真实作品策划资料，支持增加数据项 |
| Philosophy | `/philosophy/`，原创玩法、节奏、互动艺术与审美 |
| About | `/about/`，品牌定位与当前阶段，不虚构法律身份或团队 |
| Journal | `/journal/`，安全 Markdown 文章，无文章时诚实空状态 |
| Contact | `/contact/`，仅已确认 GitHub 链接，无假表单 |

`src/styles/tokens.css` 管字体、色彩、间距，`site.css`/`editorial.css` 管共享及内页布局；导航/页脚在 `scripts/site/components.mjs`。动态与内容入口见下文及 AGENTS.md 的修改入口表。404、robots、sitemap 由构建生成，用户站根路径为 `/`。

## 启动与日常修改

使用 Node.js 24、npm 锁文件；新电脑先 `npm ci` 和 `npx playwright install chromium`。`npm run dev` 为 http://127.0.0.1:4176/；`npm run build` 生成 dist；`npm run preview -- --port 4177` 为生产构建预览。

告诉 Codex 要修改的内容即可。Codex 应先建立开发分支、限制修改范围、执行检查，再提交 PR 供你确认。仅说“发布一篇日志”不会自动授权虚构内容、合并 main 或首次发布；事实不足时保留草稿并询问缺失内容。

| 常见需求 | 修改位置 | 验证 |
|---|---|---|
| 修改工作室介绍 | src/data/editorial.json | 内容构建、桌面/手机预览 |
| 品牌与联系渠道 | src/data/site.json | channels 与整站检查 |
| 添加原创游戏 | src/data/works.json 数组 | 阶段、平台真实；作品与首页检查 |
| 更新封面 | public 中本地素材、作品模板 | 来源记录、比例/裁切、替代文字与两端预览 |
| 发布创作日志 | content/journal/slug.md | 内容演练、链接/SEO/sitemap |
| 调整水面或光路 | src/data/materials.json | 动态录屏、边缘/暂停/降级、手机性能 |
| 改字体与留白 | src/styles/tokens.css | 六页四尺寸与可读性 |

目前没有真实游戏封面或实机图，作品页使用明确的非游戏画面图形概念。不要把首页世界树当作游戏截图。已确认外链只有 GitHub；TapTap 保持 url:null、confirmed:false，拿到公开厂商主页并确认后再加。

## 创作日志

文件名用小写字母、数字与连字符。例如 `content/journal/rhythm-research.md`。文件头：

```markdown
---
{"title":"用户确认的真实标题","date":"真实发布日期 YYYY-MM-DD","summary":"真实摘要","published":false}
---
## 正文
用户确认的内容。
```

支持有限、安全 Markdown，不运行 HTML 或 MDX。确认正文、日期后把 published 改为 true。npm run build 自动产生文章页面、索引和 sitemap；改回 false 可撤下文章。`.generated-journal.json` 跟踪生成页，只移除清单中的旧文件，不删除其他文件。没有文章时保留诚实的空状态。`npm run test:content` 在临时目录演练发布、品牌更新、撤稿，不产生公开假文章。

## 首页分层与动画

本轮集成来自 8c4e474 的桌面/手机局部独立素材，正式入口 src/entry.ts → src/scenes/materials/controller.ts。一个 Worker 管理水面、空气光两个局部 WebGL 画布；不再挂载旧全画幅 living-scene。历史代码留存，但不打入当前首页依赖。

- 原主图、独立岸边、星门、云雾保留。材质在 world-layer 中使用同一投影，处于岸石/星门后和云雾前。
- 水面：干净底图固定，正负反射差分重采样；mask 内替换旧倒影，避免两层反射。12px 向内羽化，位移向边缘收敛。湿石、建筑、门框不做波纹。距离/粗糙度数据是图像空间控制，不是真实深度扫描。
- 光路：分离固定源色光贡献；使用可见云纹理及其位置计算源到空气的遮挡。仅空气区域响应，不让建筑整体发光。仍为 2.5D 近似，云矩形不等于真实三维厚度。
- 集中配置 src/data/materials.json：enabled、各端裁切/光源、waterMotion、lightMotion、fps。改区域须更新遮罩；不能只提高亮度、速度或振幅。
- 原始生成修复图、输入裁切、PNG 母版、提示词、来源 SHA 在 art-source/material-samples；网站编码在 public/art/material-samples。`npm run assets:materials` 重建。
- 生成图没有逐像素几何一致性：水面只用安全内缩纹理；光路生成图只供低频空气色指导，不直接替换建筑或地形。
- 减少动态、低内存或 Save-Data 不加载局部渲染资源；无 Worker/WebGL 回退原画。后台/离屏/暂停不继续提交。真机发热和电池必须真机验证。
- 开发环境 `/?motionMode=all|off|water|rays|clouds` 提供分项开关。仅光路时可见云合成隐藏，云轨迹仍供遮挡采样；这是验收隔离模式。生产没有调试控件。
- `debugMotion=1`、`artStudy=light` 仅开发环境挂载面板；effects/camera/pointer也只在开发环境响应。生产构建不包含这些面板的代码或样式，不能用参数重新开启。正式“暂停动态”按钮与系统减少动态是用户体验功能，继续保留。

主图下载优先于局部素材；材质在 load 后启动，解码和着色器在 Worker。无损分层会增加加载/内存预算，不能把局部画布缩小直接宣称为更快。手机使用独立构图，帧率上限不是实际显示帧率。未新增独立瀑布或枝叶动画。

## 检查与 GitHub 工作流

`npm run check` 为纯构建和检查；`npm run test:browser:ci` 自动开启 4180/4181 隔离服务，逐页检查、截图，结束后关闭，不占用日常预览。`npm run test:release` 检查 dist 的六页、404、sitemap、资源路径与开发工具隔离。

`tests/production-ui.mjs` 在桌面/手机对7个路由、普通与3组调试参数执行56项生产访问检查，并验证减少动态及开发工具仍可在开发环境使用。发布检查同时扫描所有产物 HTML、JS、CSS，避免开发组件代码进入构建，而非仅检查是否可见。该检查已经纳入浏览器CI。

只有 `.github/workflows/pages.yml` 负责网站部署：开发分支/PR 自动构建、测试并上传可下载静态产物。main 同样先检查；仅仓库变量 `MILOQEN_PAGES_APPROVED == true` 且事件来自 main 才上传 Pages 产物和部署。PR、开发分支、标签以及未批准状态均不部署。唯一例行巡检是 `weekly-maintenance.yml`；旧 `dependency-security.yml` 已移除，不另建重复计划。

日常更新按以下顺序，Codex 自主完成前3步，合并/正式发布按当前用户授权执行：

1. 读取当前 main/工作区，在独立 `codex/*` 分支最小修改；正常保留远程历史及他人工作。
2. 做相关测试和预览，检查 diff，提交并推送，创建 PR；读取真实远程 `Build and test`，不能只凭本地绿灯。
3. 提供改动、验证、影响和 PR 给用户审核。内容/功能修改需用户确认合并；“修改页面”本身不等于批准正式发布。用户若已明确批准该 PR/本次限定改动保存到 main，不重复索要同一授权。
4. 确认 main 保护、PR 最新与检查成功；经授权正常 Merge commit 合并，不用管理员绕过或自己批准高风险 PR。合并会触发现有 main 构建和自动部署，审核时须说明这一点。
5. `MILOQEN_PAGES_APPROVED` 已在首次发布时开启，不需每次反复开关。不得为测试擅自变更；若为 false，取得发布授权后才恢复。人工重跑部署只能从经过审核的当前 main 执行，不能重跑旧提交导致旧站重新上线。
6. 确认 `Deploy reviewed main` 成功，再逐页检查公网资源、控制台、调试隔离、内容及必要动态/回退，记录成功提交与运行链接。失败则保留旧已部署站点并报告，不跳过审计。

`pages.yml` 的 npm audit 固定官方 registry，最多3次，请求超时60秒、进程限90秒、间隔10/30秒。有效报告发现漏洞立即失败；必须有效报告为零漏洞且命令退出0才通过。外部服务持续失败仍阻断发布，不用 continue-on-error 或非官方审计替代。连通诊断只报告代理是否配置、DNS、TLS/ping，不打印代理值或凭据。

文档-only 修改检查本地相对链接、过时状态和 diff；仍走完整远程 CI。代码、内容、素材、交互与安全策略按对应风险运行现有检查，不为每次维护增加重复测试。自动构建不代替用户的艺术与发布判断。

官方流程依据：[GitHub Pages 自定义工作流](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)。

## 身份认证和远程历史

origin 必须为 https://github.com/Loraine-Dev/Loraine-Dev.github.io.git。标准登录使用 `gh auth login --hostname github.com --git-protocol https --web`，按一次性设备码在浏览器授权；之后 `gh auth setup-git`。如 Git 单独配置了 HTTP 代理，CLI 进程也需复用同一有效代理，不能通过关闭 TLS 校验解决。不要在文档、终端输出或仓库中写明文令牌。

推送前 fetch，再检查 main 差异；远程有新改动时正常合并处理，不强制覆盖。f225703、8c4e474 必须可追溯。推送 codex/*，创建 PR，禁止自动合并。连接器能读仓库或报告 push=true，并不等于本机 Git 已完成认证或实际写入成功。

## 回滚

稳定参考分支 codex/stable-before-local-samples-20261021 → f225703；局部素材参考 8c4e474。先确保工作区干净，预览历史版本可另建 worktree，避免 reset 当前分支。维护脚本 `npm run test:rollback` 在临时工作树提取两个快照并检查原图与素材，然后移除临时工作树，保留所有正式分支。

线上回滚采用新的回滚分支，`git revert` 撤销对应整合提交或通过受审核 PR 恢复确认过的文件，测试通过后由你合并并自动发布。不 force push main，不删除历史。可先把 MILOQEN_PAGES_APPROVED 设为 false 暂停后续发布。

## 安全检查与恢复

2026-10-22 发布后核实的保护基线：main 要求 PR、Build and test（绑定 GitHub Actions app 15368）成功且分支最新、讨论解决、管理员受限、禁止强推删除；单人维护不要求另一审核人。Dependabot alerts/security updates 开启，仓库自动合并关闭。PR #5 与 #12 已合并，V1.0 完整官网及3d1ec5c安全补丁均保留；早期 PR #1/#2 与历史报告不是最新发布入口。每次涉及安全或发布仍应实际读取配置；普通维护不能擅自修改这些权限。

每次修改执行 `npm run check`、`npm run test:security` 和 `npm audit --audit-level=low`；脚本、样式或策略变化再执行 `npm run test:browser:ci`。签名扫描只报文件/数量，不输出匹配内容；可用 `node scripts/security-scan.mjs --history` 对本机可达历史做有限格式扫描，不能代替 GitHub Secret scanning 或证明从未泄露。新依赖审查来源、用途、维护情况和锁文件，不使用 audit fix --force。

生产 CSP 在 Vite 构建期插入所有 HTML，禁止第三方脚本、内联脚本、eval、外部网络连接、嵌入对象和表单提交；保留现有相机、云雾需要的内联样式。开发服务器不添加此策略，避免破坏 HMR 与诊断。meta CSP 不提供 frame-ancestors、X-Frame-Options、Permissions-Policy 等响应头；仓库中的 `_headers`/普通 HTML meta 不能替 GitHub Pages 任意配置这些头。需要完整响应头防护时另行审批代理或托管变更。

Dependabot 配置每周依赖与 Actions 更新 PR，仍需 CI 和人工合并，不自动批准。当前 main 已包含锁文件和每周巡检；无法读取告警 API 时记为尚未验证，不能以无输出冒充安全。Actions 固定官方 SHA，部署任务不 checkout 源码；只有部署任务拥有 pages/id-token 写权限。检查任务不能批准/合并 PR。

发现误发布时：先请求关闭发布变量（这是远程发布设置变更，需要授权），在开发分支用 `git revert <错误提交>`；合并提交用 `git revert -m 1 <合并提交>`，核实父提交后操作。执行完整检查和本地预览，由用户批准回滚 PR，再正常合并并发布。没有 force push。失败构建不替换已部署产物；资源缺失由发布路径检查拦截，确认缺失素材已在 Git 中后再构建。Actions 产物只保留14天，Git 中源文件和历史是长期恢复依据，不能把短期产物当备份。

离线备份可用 `git bundle create <仓库外安全路径>/miloqen.bundle --all`，然后 `git bundle verify <路径>`；包含公共源码与历史，不含忽略的素材工作文件、账号恢复码或私钥。复制到独立介质由所有者管理。账号安全每季度在 GitHub Settings 手动确认 2FA、恢复方式、PAT、SSH keys 与 Authorized OAuth Apps；不向 Codex 粘贴任何值。撤销或缩减权限前确认现有自动化不会被误伤。

V1.0恢复优先从远程 `v1.0.0` 稳定标签建立分支；本机另有 `D:\codex\output\miloqen-v1.0.0-7ffe2f7.bundle` 与 SHA256 旁文件，已验证 bundle。新电脑不能依赖此绝对路径或忽略目录的录屏/日志；源码与素材须从 Git 恢复，预览与测试证据可重新生成。异机备份复制、账号2FA人工确认仍未验证，勿将本地文件存在当作异地灾备完成。

自动化技术检查不等于艺术验收。自然度、边界和视觉收益需看正常速度预览。没有物理三维反射/云厚度；没有实体手机时，实际帧率、功耗、温升必须记为尚未验证。GitHub CI 与部署状态以远程实际结果为准，本地工作流校验不能冒充线上成功。
