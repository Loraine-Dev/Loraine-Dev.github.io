# MILOQEN Weekly Maintenance Implementation Plan

**Goal:** 每周一北京时间09:00由GitHub执行无发布权限的巡检，中文报告、去重Issue和安全故障/恢复演练。

**Architecture:** 单一weekly-maintenance工作流：只读inspect任务构建/安全/浏览器/上线可用性/视觉/性能检查；独立report任务只获Issue写权限，更新固定marker的机器人Issue。检查结果为有界JSON，不上传密钥或原始日志。原站点2e89c5f冻结；维护代码独立PR，禁止main合并和开启首次发布。

**Tech Stack:** Node24、既有Vite/Playwright/sharp、GitHub官方SHA固定Actions。不新增运行时依赖。

## Tasks

- [x] 先写测试，覆盖UTC换算、报告判定、权限降级、去重/恢复状态、视觉与性能阈值。
- [x] 实现scripts/maintenance的小模块：逻辑与报告、GitHub只读快照、在线资源/链接、可重复截图及3次性能采样。
- [x] 单一周计划cron `0 1 * * 1`；普通PR检查即时保留，部署后追加可用性验证但不增加发布权限。原dependency-security周计划合并入此工作流，避免重复巡检。
- [x] 报告任务禁用站点构建代码与依赖安装，只读取审核过的报告程序；Issue只更新机器人marker记录，不改其他Issue，重复故障不重复评论，恢复只记录一次。
- [x] 开发分支push触发一次真实trial，正常检查后在隔离Issue安全模拟故障、重复、恢复、再次恢复。workflow_dispatch 39705677233实际成功，默认分支文件仍404，计划待启用。
- [ ] 真实远程CI、维护Issue、报告产物与恢复验证；更新AGENTS和中文维护说明；维护PR不自动合并。

## Acceptance / limits

- main保护与首次发布变量不变；巡检不能写contents/pages/id-token、不能自批自合并。
- 公网未首次发布时标待上线，不将预期404假报正常；无法读取Dependabot或管理员设置时标尚未验证，不申请新凭据。
- GitHub计划可能延迟/丢弃，公开仓库60天无活动可能自动禁用；手动触发/计划须工作流在默认分支。未合并只能待启用。
- 自动视觉对比只检测明显回归，动画自然度和真机功耗需人工。没有已授权稳定的云端Codex执行通道，不宣称无人值守修复。
