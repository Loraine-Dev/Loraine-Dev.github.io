# MILOQEN 每周维护

## 执行位置与时间

GitHub-hosted runner每周一北京时间09:00（UTC01:00，`0 1 * * 1`）执行`Weekly MILOQEN maintenance`，不依赖本机开机。计划只能使用默认分支的工作流，当前开发分支未合并前为**待启用**。GitHub计划可能延迟、极端负载时丢弃；公开仓库60天无活动可能自动禁用。不是准点SLA。

Actions → Weekly MILOQEN maintenance → Run workflow可以手动巡检；首次合并前若GitHub拒绝dispatch，保留实际失败证据，不绕过main保护。开发验证分支codex/weekly-maintenance由所有者push时会试运行相同检查并执行安全演练；这不表示周计划已经启用。正常PR的即时检查继续运行，发布成功后另有即时公网状态检查，不等下一周。

2026-10-22真实验证：开发分支workflow_dispatch已被GitHub接受，运行39705677233成功；默认分支文件GET仍404，故每周计划仍待启用。正常维护记录为Issue #3；隔离演练Issue #4已验证失败/重复/恢复/重复的评论数量与关闭状态。首轮分支运行39705634005发现现有暂停测试的在途Worker帧采样竞争并发出真实告警，随后手动运行通过且同一Issue记录恢复；测试只增加队列稳定同步，仍严格断言暂停后时间不增长，没有调整动画参数或放宽运动阈值。

## 检查与报告

检查复用`npm run check`、`test:security`、`test:maintenance`和`test:browser:ci`，另做npm audit、GitHub只读状态、六页公网资源/内链、主图和动画生命周期、桌面/手机静态截图、三次浏览器LCP采样、Firefox/WebKit基本访问。兼容性是Linux引擎，不能冒充实体Safari或手机。

打开Actions运行的Summary可看中文报告；`weekly-evidence`保留结构化报告及截图90天。维护记录通过唯一机器人marker的“MILOQEN 每周维护记录”Issue长期追踪；相同故障只更新已有记录，新指纹或恢复才评论提及所有者。正常周次报告“本周检查正常”，没有创建新Issue。Issue即使恢复后关闭，下一次仍更新同一条。通知取决于你GitHub的关注/通知设置，不承诺直接发送到ChatGPT。

截图在减少动态、字体就绪、固定视口下截取并降采样比较；上一份报告保留图像签名/环境/性能基线。首次或浏览器版本/OS变化标首次基线，不能报“已比较正常”。明显差异保留旧基线供人工检查；只有审核新截图后手动运行并勾选accept_visual_baseline才接受更新。性能比较至少3次样本中位数同时超过50%和500ms才标风险；单次波动不构成故障。是runner本地生产构建的加载变化，非移动网络Lighthouse或真机认证。

尚未批准首次发布时，公网检查明确标待上线；后续发布变量为true才检查公网。GH_TOKEN只用运行时内置GitHub token，检查任务只读，报告任务只增加Issue写权限。没有contents/pages/id-token写权限，没有PR批准/合并、账号更改或部署能力。npm构建和测试步骤不获得GitHub API token。

Dependabot告警API与仓库管理员设置可能不向GITHUB_TOKEN开放；届时报告尚未验证，保留原生Dependabot通知，并用npm audit作为补充，不添加PAT、不扩大权限、不伪称已读取完整告警。Main保护和首次发布门禁由原安全验收流程维护。检查发现策略变化只告警，不自动修复设置。

## Codex修复流程

当前可用的本地项目Codex定时任务需要电脑和应用运行；本仓库没有已配置的云端Codex凭据/无人值守修复通道。采用：GitHub无人值守检查→Issue→你下次打开Codex说“处理维护Issue #编号”→读取最新远程→独立分支最小修复→测试→PR→你确认合并→原Pages工作流检查发布→公网验证。不自动改main、不自批高风险PR、不自动撤销授权。

OpenAI官方说明：[本地项目定时任务](https://learn.chatgpt.com/docs/automations?surface=app)；平台支持云端任务不等于当前账号/仓库已授权自动修复，本次没有创建此能力或承诺它可靠可用。

## 日常内容维护

- 新游戏：编辑src/data/works.json，使用真实资料和明确阶段，不编造实机、奖项、日期；保留现有作品策划中。
- 文章：content/journal/slug.md，JSON front matter，真实正文；先published:false，审核后发布。test:content在临时目录演练，不公开测试文章。
- 页面文字：src/data/editorial.json；品牌和联系：src/data/site.json；导航/共享模板：scripts/site；不手改生成HTML。
- 艺术素材/动态：只在明确任务范围调整，维护来源、手机配准、遮罩与静态回退，重新提供录屏；不要借维护重做网站。

## 暂停、恢复与确认

可经所有者指令设置仓库变量MILOQEN_MAINTENANCE_PAUSED=true暂停检查，false恢复；也可在Actions禁用/启用工作流。它与MILOQEN_PAGES_APPROVED独立，不打开发布开关。首次默认分支合并后应手动运行一次，再核实计划状态。不要自动用空提交保活60天禁用策略。

必须确认：main合并、首次发布、账号/分支/发布权限变更、维护暂停/恢复、不可逆操作、重大美术方向改变。常规诊断、独立分支修复、测试及创建PR已授权，无需每天手动打包上传。

## 备份和恢复

已保留稳定tag audit-baseline-20261022、f225703/8c4e474及冻结候选2e89c5f历史。GitHub源仓库是独立于工作电脑的远程副本；Git bundle是额外副本，两者不等同于已独立异机备份或对GitHub账号失控的完整防护。

输出目录现有miloqen-hardened-20261022.bundle及SHA256和设置快照已经验证/离线克隆。所有者需复制到独立硬盘或可信存储后再次比对SHA256；本次不公开上传备份、密钥或敏感日志，也未声称已复制异机。需要最新维护分支备份可在本地仓库外git bundle create ... --all并verify。

发布失败：保留旧已部署站点；检查失败不发布。误发布/资源缺失：开发分支普通git revert（合并提交核实父节点再-m 1），完整检查和预览后由你合并回滚PR，正常重新发布；禁止reset/force main。维护任务本身没有发布权限，故不会因巡检故障覆盖网站。

## 首次发布仍需批准

维护PR需完整CI与人工审核；候选网站及安全补丁均必须保留。2FA仍由你本人核实。发布顺序保持：批准具体版本→PR Ready→发布变量仍false时Merge commit合并→main检查成功→明确批准后设发布变量true→从main手动运行正式工作流→验证公网。单人审批人数0，不需要另一个人，也不绕过保护。

来源：[GitHub计划及手动触发限制](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows)、[Dependabot API权限](https://docs.github.com/en/rest/dependabot/alerts)。
