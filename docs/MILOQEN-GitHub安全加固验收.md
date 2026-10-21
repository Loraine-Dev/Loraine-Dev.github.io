# MILOQEN GitHub 安全加固验收

日期：2026-10-22。实施依据：所有者明确批准 GitHub 安全设置变更，但未批准首次发布或合并 main。本次不改变网站画面、素材或动态参数，不读取或输出任何凭据，不撤销账号授权。

## 实际状态（写入后独立重新读取）

| 项目 | 验证结果 |
|---|---|
| main 保护 | branches/main 返回 protected=true；protection GET 返回下述完整规则 |
| PR 与检查 | required_pull_request_reviews 对象已启用，required_approving_review_count=0；Build and test 绑定 GitHub Actions app_id=15368，strict=true |
| 管理员与讨论 | enforce_admins=true；required_conversation_resolution=true |
| 防止历史破坏 | allow_force_pushes=false、allow_deletions=false |
| Dependabot alerts | 独立 GET /vulnerability-alerts 返回 HTTP 204（启用）；不是只检查 PUT 成功 |
| Dependabot security updates | 独立 GET /automated-security-fixes 返回 enabled=true、paused=false；仓库 security_and_analysis 也返回 enabled |
| 人工合并 | allow_auto_merge=false；Actions 默认权限read，can_approve_pull_request_reviews=false；没有设置强制另一位审核人，避免唯一维护者被锁死 |
| 未发布证明 | main 仍为9fe78d66a13942c87f4c4995612e000849568130；MILOQEN_PAGES_APPROVED=false；没有main合并或部署 |

没有试探性强推、删除或绕过规则；以GitHub实际持久化保护状态为证据。管理员仍可在设置中修改规则，这是账号所有者能力，不能承诺配置无法被所有者改掉。0个审批不等于自动合并授权；人类确认合并继续是维护规范，GitHub无法区分同一账号下的人与自动化。

## 版本与 PR 关系

- 安全修复3d1ec5c及证据提交aed7b71已在远程开发分支 codex/miloqen-security-audit；没有强推。
- 本地fetch后验证：原整站开发分支头c9ce1df、main及安全修复3d1ec5c均是最终分支祖先。因此整站文件与安全修复同时存在，未以旧站覆盖新站。
- [PR #2](https://github.com/Loraine-Dev/Loraine-Dev.github.io/pull/2)现以main为base，保留草稿，作为唯一完整V1.0审核入口。原[PR #1](https://github.com/Loraine-Dev/Loraine-Dev.github.io/pull/1)已关闭留档，mergedAt=null，分支和历史保留。没有把自己的安全补丁自动批准或合并。
- 新文档提交触发真实push及pull_request CI，包含构建、内容和资源检查、test:security、npm audit、浏览器测试。交付时给出实际run结果；开发分支/PR的部署任务必须为skipped。

## Actions 与依赖持续防护

当前工作流只有check任务读取源码；官方Actions均固定完整SHA，checkout persist-credentials=false。只有deploy任务拥有pages:write/id-token:write，且needs:check，必须main、非pull_request、发布变量true。部署任务不checkout或运行站点源码。仓库默认workflow token权限read，禁止Actions创建批准审核。

Dependabot更新经PR、自动检查、人工合并。配置文件和只读每周依赖审计已包含在PR #2；它们需要合并默认分支后才按计划运行。当前main无项目依赖清单，开启告警不等于已经扫描尚未合并的V1.0。仓库级Actions允许来源仍是all，SHA要求由当前工作流和检查落实；未额外修改全局允许名单。未来工作流变更仍需人工审查。

## 备份与恢复

- 基线远程tag：audit-baseline-20261022 → c9ce1df。f225703、8c4e474及原素材历史保留。
- `D:/codex/output/miloqen-security-20261022.bundle`已经再次通过git bundle verify，包含完整历史与安全修复。实际临时revert曾生成新提交，并验证完整树恢复为c9ce1df，无reset/force。
- 本次另生成更新后的`D:/codex/output/miloqen-hardened-20261022.bundle`，交付前验证；同目录保存安全设置快照JSON及SHA256校验文件。Git bundle不包含远程保护设置、账号密钥、GitHub服务器设置或忽略文件，因此设置快照单独保存。
- 将bundle、对应SHA256文件和设置快照通过文件管理器复制到你自己的独立U盘/移动硬盘或可信备份位置。目标路径由你选择，本次未擅自上传第三方存储。复制后用`Get-FileHash -Algorithm SHA256 <目标bundle路径>`与原文件校验值比较，再运行`git bundle verify <目标bundle路径>`。当前同机备份不算灾难恢复异机副本。
- 恢复时从bundle克隆到新目录，建立恢复分支，使用普通git revert（合并提交需核实主线父提交后使用-m 1）或以新提交恢复已确认文件；完整CI后由用户合并PR。错误构建不部署，丢失资源由release检查拦截。正式误发布后的回滚依旧走PR+测试+人工确认，不强推。

## 需要你私下核实的账号项目

- [Password and authentication / 2FA](https://github.com/settings/security)：确认已启用及备份恢复方式；[GitHub官方说明](https://docs.github.com/en/authentication/securing-your-account-with-two-factor-authentication-2fa/configuring-two-factor-authentication)。
- [Authorized OAuth Apps](https://github.com/settings/applications)：查看应用详情与scopes；[官方核实说明](https://docs.github.com/en/apps/oauth-apps/using-oauth-apps/reviewing-your-authorized-oauth-apps)。
- [Classic tokens](https://github.com/settings/tokens)、[Fine-grained tokens](https://github.com/settings/personal-access-tokens)、[SSH/GPG keys](https://github.com/settings/keys)：只由所有者核对用途与范围，不向Codex粘贴值。本轮没有撤销、扩大或重新授权。

## 剩余边界

2FA与完整账号授权清单仍尚未验证；异机备份需你实际复制；真机性能和最终艺术验收不属于本次已通过项。网站没有正式发布，线上V1.0的资源与响应头尚不能验收。main保护及Dependabot远程设置已生效，但首次发布仍须另行明确确认。没有承诺绝对安全。
