# MILOQEN V1.0 长期维护手册

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

只有 `.github/workflows/pages.yml` 负责网站部署：开发分支/PR 自动构建、测试并上传可下载静态产物。main 同样先检查；仅仓库变量 `MILOQEN_PAGES_APPROVED == true` 且事件来自 main 才上传 Pages 产物和部署。PR、开发分支、标签以及未批准状态均不部署。另有只读的 dependency-security.yml 每周检查依赖，不部署网站。

当前仓库已实际切换 Pages 来源为 GitHub Actions，MILOQEN_PAGES_APPROVED=false。旧 main 根目录 legacy 自动构建链路已停用，避免绕过首次发布门控。首次发布须你明确确认具体版本后，才进行以下操作：

1. 确认 PR 的实际 GitHub CI 成功，最终画面与内容已审核。
2. 核实 GitHub 仓库 Settings → Pages 的构建来源仍为 GitHub Actions；保留既有保护规则。
3. 设置仓库 Actions 变量 MILOQEN_PAGES_APPROVED=true；建议 github-pages 环境仅允许 main，并按需要设置审核人。
4. 你确认合并 PR。main 上的同一构建产物经过检查后由官方 Pages Actions 发布；随后检查正式 URL。若 main 已先合并，确认后从 main 手动运行同一工作流。

本轮只完成安全的构建来源配置，未开启发布变量、未合并或部署，也未修改分支保护。之后日常更新为“Codex 修改→CI→你确认合并→自动发布”。构建失败、测试失败或门控关闭不会发布。不需要手动上传 ZIP。首次 PR 合并使用 Merge commit 保留既有祖先历史；不要 squash 后删除唯一历史引用。

官方流程依据：[GitHub Pages 自定义工作流](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)。

## 身份认证和远程历史

origin 必须为 https://github.com/Loraine-Dev/Loraine-Dev.github.io.git。标准登录使用 `gh auth login --hostname github.com --git-protocol https --web`，按一次性设备码在浏览器授权；之后 `gh auth setup-git`。如 Git 单独配置了 HTTP 代理，CLI 进程也需复用同一有效代理，不能通过关闭 TLS 校验解决。不要在文档、终端输出或仓库中写明文令牌。

推送前 fetch，再检查 main 差异；远程有新改动时正常合并处理，不强制覆盖。f225703、8c4e474 必须可追溯。推送 codex/*，创建 PR，禁止自动合并。连接器能读仓库或报告 push=true，并不等于本机 Git 已完成认证或实际写入成功。

## 回滚

稳定参考分支 codex/stable-before-local-samples-20261021 → f225703；局部素材参考 8c4e474。先确保工作区干净，预览历史版本可另建 worktree，避免 reset 当前分支。维护脚本 `npm run test:rollback` 在临时工作树提取两个快照并检查原图与素材，然后移除临时工作树，保留所有正式分支。

线上回滚采用新的回滚分支，`git revert` 撤销对应整合提交或通过受审核 PR 恢复确认过的文件，测试通过后由你合并并自动发布。不 force push main，不删除历史。可先把 MILOQEN_PAGES_APPROVED 设为 false 暂停后续发布。

## 已知边界

## 安全检查与恢复

每次修改执行 `npm run check`、`npm run test:security` 和 `npm audit --audit-level=low`；脚本、样式或策略变化再执行 `npm run test:browser:ci`。签名扫描只报文件/数量，不输出匹配内容；可用 `node scripts/security-scan.mjs --history` 对本机可达历史做有限格式扫描，不能代替 GitHub Secret scanning 或证明从未泄露。新依赖审查来源、用途、维护情况和锁文件，不使用 audit fix --force。

生产 CSP 在 Vite 构建期插入所有 HTML，禁止第三方脚本、内联脚本、eval、外部网络连接、嵌入对象和表单提交；保留现有相机、云雾需要的内联样式。开发服务器不添加此策略，避免破坏 HMR 与诊断。meta CSP 不提供 frame-ancestors、X-Frame-Options、Permissions-Policy 等响应头；仓库中的 `_headers`/普通 HTML meta 不能替 GitHub Pages 任意配置这些头。需要完整响应头防护时另行审批代理或托管变更。

Dependabot 配置每周依赖与 Actions 更新 PR；Scheduled dependency audit 工作流需先合并到默认分支才会按计划运行。本轮没有开启远程 Dependabot 告警/安全更新开关，也没有修改账号、main 保护或首次发布规则；配置文件存在不代表远程设置已启用。Actions 固定官方 SHA，部署任务不 checkout 源码；只有部署任务拥有 pages/id-token 写权限。检查任务不能批准/合并 PR。

发现误发布时：先请求关闭发布变量（这是远程发布设置变更，需要授权），在开发分支用 `git revert <错误提交>`；合并提交用 `git revert -m 1 <合并提交>`，核实父提交后操作。执行完整检查和本地预览，由用户批准回滚 PR，再正常合并并发布。没有 force push。失败构建不替换已部署产物；资源缺失由发布路径检查拦截，确认缺失素材已在 Git 中后再构建。Actions 产物只保留14天，Git 中源文件和历史是长期恢复依据，不能把短期产物当备份。

离线备份可用 `git bundle create <仓库外安全路径>/miloqen.bundle --all`，然后 `git bundle verify <路径>`；包含公共源码与历史，不含忽略的素材工作文件、账号恢复码或私钥。复制到独立介质由所有者管理。账号安全每季度在 GitHub Settings 手动确认 2FA、恢复方式、PAT、SSH keys 与 Authorized OAuth Apps；不向 Codex 粘贴任何值。撤销或缩减权限前确认现有自动化不会被误伤。

自动化技术检查不等于艺术验收。自然度、边界和视觉收益需看正常速度预览。没有物理三维反射/云厚度；没有实体手机时，实际帧率、功耗、温升必须记为尚未验证。GitHub CI 与部署状态以远程实际结果为准，本地工作流校验不能冒充线上成功。
