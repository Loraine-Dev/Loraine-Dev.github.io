# 首页原型：实际验证记录

此为 797a3f9 阶段历史测试；当前生命化版本数据见 living-verification.md，不能将下面的旧分数作为本轮测试结果。

日期：2026-10-19。测试对象为“月汐之门”首页，非旧雕塑原型。艺术质量由用户验收，本报告不代表艺术通过。

## 工程与浏览器

- `npm run build`：静态 HTML 渲染、TypeScript 类型检查、Vite 生产构建通过。
- `npm run test:unit`：6 项通过，其中 3 项覆盖新场景的相机深度比例、快速滚动边界、图层覆盖计算；另外 3 项保留历史数学/降级检查。
- `npm run test:browser`：生产构建下通过。1920×1080、1440×900、1280×800、768×1024、390×844、375×667、320×568 实际渲染 WebGL；无横向溢出，图像载入成功。竖屏平板和手机请求独立竖幅美术。
- 检查通过：滚动推进、暂停/继续、模拟页面可见性事件、真实 WEBGL_lose_context 丢失/恢复、断点重建、刷新、触控模拟点击/滚动、键盘跳转、淡出链接退出焦点序列。
- 降级检查通过：禁用 JS、禁用 WebGL、低内存、节省流量均显示可读静态画面。
- Chromium、Edge 155.0.4283.62、Firefox 153.0 实际载入 live 场景。浏览器检查记录的 pageerror 和 HTTP 4xx/5xx 资源错误均为空。
- 修复过程中发现的“缩窄后刷新测试超时”来自测试指针仍在新视口之外，已让测试在视口内滚动；同时修复了真实用户早于加载延时滚动可能漏记的问题。

## 性能

一次本地 Lighthouse 移动模拟：Performance **92**、Accessibility **100**、Best Practices **100**；FCP 1.0 s、LCP 3.3 s、TBT 100 ms、CLS 0。报告在交付包 `verification/lighthouse-mobile.report.html` 和 JSON。此为开发机、生产构建、模拟移动网络/CPU的单次测量，不代表真实移动设备或公网结果。

手机首先呈现静态分层画面，首次探索/滚动后加载 Three.js。软件 GPU 使用按需绘制；硬件模式环境动效按桌面 30 fps、手机 24 fps 上限配置，以节制耗电为优先。没有声称达到实测 60 fps。`prefers-reduced-motion` 关闭相机与环境运动。

生产美术共五张 WebP，合计约 0.9 MB；单端只取对应方向的世界与门体以及共用岸层。原始 PNG、完整提示词、SHA-256、生产尺寸均在 `art-source/world-tree/`。Three.js 分包约 532 kB（gzip 133 kB），不会阻塞手机静态首帧。

## 证据与边界

实际截图：`verification/desktop.png`、`laptop.png`、`mobile.png`、`small-mobile.png`、`entered.png`，以及各分辨率 viewport 截图。测试数据：`verification/browser-report.json` 和 `capture.json`。

未在实体手机、Safari、真实低端 GPU 上测试；未做持续帧率与耗电基准。画面为受控透视 2.5D，树干/树冠属于远景绘景，不能自由绕行。手机和桌面静态替代使用同源图层，但无 JS 时没有空间推进。没有加入其他网站内容页，没有推送 GitHub，没有创建 PR 或部署，也没有修改正式站。
