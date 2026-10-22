# 阶段 A — 审计与设计策略 / 2026-10-19

## 可核验现状
- 目标仓库：Loraine-Dev/Loraine-Dev.github.io。
- 远端 main 为 9fe78d6（Delete index.html），前一提交 1955d54 删除 README.md；当前远端树为空。保留这两次提交，V6 在其后独立分支 feature/miloqen-v6 开发，不覆盖 main。
- V4 在独立本地仓库 D:/codex/work/miloqen-v4，提交 f838427，发布包完整。可复用品牌文案、原创 M 符号、响应式/无障碍经验和测试方法。V4 位图不是实时 3D，不作为 V6 模型。
- GitHub CLI 未登录。此前连接器 blob/ref 写入都返回 403；本次不重复调用同一失败接口。
- 现有远端曾使用 main 根目录的 Pages 动态发布；新构建需切换为 dist artifact 工作流（阶段 E 才配置/启用）。
- codebase-memory-mcp 重建 V4 索引失败、旧图未返回相关符号，故按允许的回退直接检查了 V4 交互与测试源码。远端空树无可索引应用代码。

## 研究与适用原则
研究仅借鉴原则，不使用参考站资源。网页抓取结果不能证明完整动画品质。
- [Remedy](https://www.remedygames.com/)：品牌使命与作品入口直接相邻；控制首屏信息密度。
- [thatgamecompany](https://thatgamecompany.com/)：先表达情感目标，再以各作品自己的艺术身份展开。
- [Supergiant](https://www.supergiantgames.com/)：每个作品有清楚、独立的身份与事实信息。
- [PlayStation Studios](https://www.playstation.com/en-us/corporate/playstation-studios/)：品牌开场与作品发现形成明确层级。
- [Apple AirPods Pro](https://www.apple.com/airpods-pro/)：观察对象应始终是视觉主体，材料近景与文字节奏交替，不能以长滚动距离替代内容。
- [Awwwards WebGL 分类](https://www.awwwards.com/websites/webgl/)：用于检索交互案例；获奖标签不作为性能、可访问性或适用性的证明。
- [HoYoverse](https://www.hoyoverse.com/)：访问成功但文本抓取无正文，不能据此对具体交互下结论。

## 艺术决策
THE LIVING FORM / 生命形态。三个从共同起点生长的非对称折叠壳面，轮廓由纤细基部向开口展开；不使用星球、环、粒子或旋转 Logo。瓷银主表面保留细密纵向肌理；冰蓝内层强调厚度，金线只描绘少量结构边。环境是一间没有可见墙壁的暗色展厅。

镜头：桌面把雕塑放在右侧，左侧保留中文大标题；手机将雕塑上移，文案置于下部深色负空间。开场不锁滚动。滚动驱动镜头推进、壳面展开与主光位移；低幅有机形变不改变品牌轮廓。

## 六幕信息架构（后续阶段范围）
1. Encounter：生命形态、品牌与探索入口。
2. Threshold：同一雕塑在滚动中开启，强调“想象没有固定形状”。
3. Discovery：从暗色空间进入画册，呈现秩序与想象。
4. Selected Work：暖色节奏世界，数据文件驱动作品，概念图如实标注。
5. Studio：真实定位、开发方向与 GitHub。
6. Afterglow：同一形态收拢/静态回响，返回作品与联系方式。

## 技术选择
TypeScript + Vite + Three.js，静态 HTML 构建，CSS/IntersectionObserver 处理排版与基础动效。无需 Astro、GSAP、数据库或远程字体。JSON 配置、DOM 与场景隔离。Three.js 按需动态导入；程序化几何没有模型网络请求；程序生成环境贴图，不下载外部 HDR。

参考官方文档：
- https://threejs.org/docs/pages/MeshPhysicalMaterial.html （高级物理材质存在每像素成本，桌面选择性启用，移动关闭 transmission）
- https://threejs.org/docs/pages/WebGLRenderer.html （WebGL2 要求，WebGL1 不作为支持承诺）
- https://threejs.org/docs/pages/RoomEnvironment.html （预滤波环境生成）
- https://vite.dev/guide/static-deploy.html#github-pages （静态 dist 与 Pages）

## 风险与应对
- 实时艺术可能不及预渲染：先单独完成 B，导出真实渲染后逐张复核，不急于做六幕。
- 软件 GPU/低端设备：移动低几何与像素密度，离屏/隐藏暂停，慢帧自动降低密度；极低内存、saveData、无 WebGL2 使用静态。
- 光学效果成本：无后处理 bloom、无实时环境更新、无高分辨率阴影、无屏幕空间反射。
- 首图与场景轮廓不一致：备用图必须由程序化场景的稳定状态导出。
- 远端权限仍不可写：交付源代码、dist 与本地分支/历史；不伪称发布成功。

## 阶段 B 验收计划
- 真实 WebGL canvas，网格有限数值、索引合法，材质/灯光源代码可维护。
- 桌面/手机构图、滚动镜头与有机形变实际截图。
- 减少动态、无 JS、无 WebGL2、上下文丢失/恢复、页面隐藏/恢复、快速滚动/刷新。
- Chromium 与可用 Firefox/Edge；Safari 无环境时明确记录。
- 生产构建 Lighthouse 实测，报告实际值与局限。

当前阶段 A 已完成。本轮直接推进 B 的可运行艺术原型，C–E 不与首屏质量门槛混在一次最终验收中。
