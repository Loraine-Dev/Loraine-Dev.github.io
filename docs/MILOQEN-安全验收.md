# MILOQEN 上线前安全验收

审计日期：2026-10-22。修复提交：`3d1ec5c`（`codex/miloqen-security-audit`）。范围：本地 V1.0 源码、可达 Git 历史、生产构建、现有 GitHub API 可读配置和公开网址。结论：完成可回滚的代码加固，**仍有发布阻断项，不建议现在发布**。没有修改账号、仓库权限、分支保护或发布开关，没有部署。没有读取/保存/打印令牌或密钥值。

| 审计项 | 状态 | 具体证据与边界 |
|---|---|---|
| 1. 账号与权限 | **尚未验证**（部分已核实，权限存在风险） | API 认证成功，账号 Loraine-Dev，仓库 admin/push 权限；仅该账号为协作者。当前 OAuth scopes 为 repo/workflow/gist/read:org，后两项并非本项目必要，repo 也比单一公开仓库更宽。未擅自撤销或重授权。2FA 字段未返回，账号签名密钥/全部令牌与 OAuth App 清单无法读取；公开认证 SSH keys 数为0，不代表全部账号认证安全。仓库 deploy keys=0、仓库和 Pages 环境 secrets 各0。 |
| 2. 仓库与分支保护 | **存在风险** | main protection 返回404“Branch not protected”，rulesets=[]。公开仓库支持分支保护，并非套餐不支持。尚未改变远程规则；不能宣称已强制 PR/审核/CI 或禁止强推。 |
| 3. GitHub Actions | **已验证安全**（本轮检查范围；配置待审核合并） | 默认 contents:read；仓库默认 workflow 权限read，自动批准PR=false；部署独占pages/id-token写权限，needs:check、main且非PR、发布变量true三重限制。官方 Actions 固定完整SHA；checkout不保留凭据，部署任务不checkout、不执行站点代码。没有pull_request_target或向PR传secret。upload-pages-artifact固定版本内部的upload-artifact同样为完整SHA。仓库级allowed_actions=all、sha_pinning_required=false，属于尚未强制的全仓库策略。 |
| 4. 网站与依赖 | **已验证安全**（本地已审范围）；线上V1.0 **尚未验证** | npm audit总计217依赖、已知漏洞0；锁文件registry/integrity检查通过。Markdown转义原始HTML、不执行MDX；官方外链增加URL白名单与属性安全，所有现有新窗口链接noopener noreferrer。生产脚本/字体/图片均本地，无第三方运行脚本。7个HTML有构建期CSP；14组浏览器检查正常加载、素材运行，内联脚本和外部连接攻击探针被阻断；56组调试参数访问无开发UI。公开HTTPS返回404、HTTP301到HTTPS，TLS有效；GitHub错误页的CSP不属于本网站。 |
| 5. 恢复与备份 | **已验证安全**（本地恢复演练）；独立介质备份 **尚未验证** | 审计前c9ce1df已标记稳定分支和远程tag `audit-baseline-20261022`；f225703/8c4e474祖先和素材恢复检查通过。已在临时工作树用普通revert生成新提交，核实恢复后的完整Git树与c9ce1df完全一致，未重写远程历史。已生成仓库外Git bundle并verify；未声称已复制到独立介质。 |
| 6. 长期维护 | **已验证安全**（本地规则/检查）；远程启用 **尚未验证** | AGENTS明确安全门禁、最小权限、禁止凭据输出/强推/自批自合并；新增test:security、浏览器CSP检查、PR依赖审计、每周只读依赖审计与Dependabot配置。GitHub Dependabot alerts API返回403“disabled”，security updates=disabled；Secret scanning和push protection=enabled，当前open alert数0。新周计划和Dependabot配置须合并默认分支后才生效。 |

## 具体发现与修复

- **S01 / 高 / 尚未修复：main 未保护。** 任一具有写权限的客户端可绕开检查直接更新或强推。证据：GitHub分支保护API404、rulesets空。建议批准后要求PR、Build and test且分支最新、讨论已解决、管理员同样受限、禁止强推删除。当前仅一位维护者，强制另一审核人会阻塞本人PR；不擅自添加人员或绕过规则。人类确认合并仍是流程约束，GitHub无法区分同一账号下的人和自动化。
- **S02 / 中 / 已修复于开发分支：可变 Actions 标签与 checkout 凭据持久化。** 位置：`.github/workflows/pages.yml:19`起。改为官方API核实的40位SHA、persist-credentials:false；删除具有部署写权限任务的checkout。新增依赖审计不改变现有首次发布门禁。来源：[GitHub Secure use](https://docs.github.com/en/actions/reference/security/secure-use)。
- **S03 / 中（纵深防护）/ 已修复于开发分支：生产缺少站点CSP。** 位置：`vite.config.ts:33`起。只对生产构建添加早期meta CSP：禁止内联/第三方脚本和eval、外部连接、对象、表单；worker允许同源，动态内联样式为现有美术所需。**不是HTTP响应头**，不包含无效的meta frame-ancestors/report-uri，也未启用不存在的X-Frame-Options或Permissions-Policy。Pages无本仓库可设置的任意自定义响应头入口；完整头策略需另行批准边缘代理/托管变更。来源：[MDN CSP](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy)。
- **S04 / 低（内容维护边界）/ 已修复于开发分支：GitHub配置值曾直接进入href。** 位置：`scripts/site/components.mjs:22`、`scripts/site/pages.mjs:20`、`scripts/site/channels.mjs:3`。现仅接受确认的官方HTTPS主页，拒绝脚本scheme、仿冒主机、userinfo及属性注入；TapTap继续不展示，并拒绝带凭据/非标准端口地址。这是内容作者可编辑配置的加固，未发现公众可利用的动态输入通道。
- **S05 / 中 / 尚未验证：账号授权与2FA。** API权限不足没有扩大范围；当前CLI有项目不必要的gist/read:org范围。请在 GitHub Settings → Password and authentication、Developer settings → Personal access tokens、SSH and GPG keys、Applications 手动核对，删除不再使用的授权前确认用途。不要把令牌、私钥、2FA恢复码发给Codex。
- **S06 / 中 / 等待批准：远程依赖告警关闭。** 手动批准后再开启Dependency graph/Dependabot alerts/security updates。本轮本地及CI审计可以阻断已知漏洞，不能代替持续告警。

## 实际验证

- 红灯：补丁前新测试复现缺少CSP、未固定Actions、GitHub危险配置未拒绝；原Markdown转义测试通过。
- `npm run check`、`npm run test:security`、`npm run test:browser:ci`通过：24组路由/尺寸、素材生命周期/降级、图片选择、56组生产调试隔离、14组CSP/尺寸，正常访问无CSP错误。恶意探针的拦截日志属预期。
- `npm audit --json`：info/low/moderate/high/critical均0；只代表审计数据库当时的已知漏洞。
- 有限凭据签名扫描：修复前200个已跟踪文本文件和25个可达历史提交无匹配；新增文件暂存后206个文本文件再次扫描通过。没有记录任何匹配正文。该扫描不覆盖所有秘密格式、不可达对象、账号历史日志或外部备份。
- `npm run test:rollback`通过；本轮实际revert恢复c9ce1df整树比较通过。`D:/codex/output/miloqen-security-20261022.bundle`（34,181,457字节）已生成，`git bundle verify`通过；是同机仓库外备份，不能抵御整机丢失。GitHub CI结果以PR/提交检查为准，本地通过不能冒充远程通过。
- 真实手机发热/耗电尚未验证；本任务没有美术重做、素材替换或动画参数调整。

## 发布阻断与待批准动作

1. 高风险S01：main保护规则尚未启用，需用户明确批准变更；[官方文档确认公开仓库支持](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches)。
2. 2FA及不必要授权清单需所有者私下确认；未验证不能标安全。
3. 本轮安全补丁及原整站PR须审核、实际CI成功；首次正式发布另需明确同意。MILOQEN_PAGES_APPROVED保持false。
4. V1.0目前未公开部署，不能完成线上页面/资源/最终响应头验收。公开404不能作为成功上线证据。
5. Dependabot远程开关及可选的Actions全仓库SHA强制/允许名单、Pages人工环境审批均未擅改；需审批后验证，不能只凭配置文件宣称生效。

证据日志保存在本地忽略目录 `artifacts/production-ui/security-*.log/json` 和 `artifacts/security/browser.json`，不提交账号凭据。没有承诺绝对安全。
