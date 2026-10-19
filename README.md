# MILOQEN「月汐之门」首页原型

本轮只制作首页，尚待用户美术验收，不部署正式站。

当前版本已加入两层雾、局部叶冠光、水面反射及受控镜头，原主视觉未替换。开关、素材来源与录屏方法见 [docs/living-scene.md](docs/living-scene.md)，本轮验证见 [docs/living-verification.md](docs/living-verification.md)。旧阶段记录保留作历史参考。

## 运行

```sh
npm ci
npm run dev
```

- 桌面：http://127.0.0.1:4176/
- 固定桌面视口验收：http://127.0.0.1:4176/review/desktop.html
- 手机固定视口验收：http://127.0.0.1:4176/review/mobile.html
- 手机真机模拟：浏览器开发者工具切换到手机尺寸，直接访问首页。

```sh
npm run build
npm run preview -- --port 4177
```

构建产物在 dist/，兼容静态托管。本轮不启用自动部署，且原型以 noindex 阻止索引。

## 修改内容与场景

- 文案：src/data/site.json。改完后重新运行 npm run dev 或 npm run build。
- 首页结构：src/page.html；只渲染一个首页艺术原型。
- 色彩/字体/间距：src/styles/site.css 中 :root 与响应式部分。
- 素材地址、层深、相机、质量和动画幅度：src/data/world.json。
- 透视场景：src/scenes/world-scene.ts。
- 相机数学：src/scenes/world-space.ts。
- 生命周期、降级与按钮：src/entry.ts。

调整层深或镜头距离后必须重新截图，因为边缘露底、文字位置、门体退出速度都会变化。此方案为受控 2.5D 镜头，不支持任意视角。

## 素材维护

源 PNG、提示词和来源在 art-source/world-tree/。替换源图后运行 `node scripts/prepare-world-assets.cjs` 生成 WebP 并更新清单。该命令需要开发依赖 sharp。需要保留前景/中景图透明 alpha，不能保存为 JPG。手机远景与门体为独立构图。

静态替代由同一组美术层组合：无 JS、无 WebGL2、低内存或节省流量时仍可读且不强迫开场等待。减少动态效果时关闭相机、局部环境层和入场动画。暂停按钮停止环境持续运动，用户主动滚动仍可探索空间。

手机与软件 GPU 首次探索/滚动后才初始化空间场景，避免静态首帧被 WebGL 编译阻塞。宽度小于 760px 或宽高比不超过 4:5 使用独立竖幅构图。review/ 下两页仅为本地验收工具，分别固定真实桌面和手机 iframe 视口并缩放展示。

## 检查与验收

```sh
npm run test:unit
npm run test:browser
```

浏览器截图和检查数据位于 artifacts/world-tree/。设计与路线比较见 docs/world-tree-design.md；实际测试结果单独记录在 docs/world-tree-verification.md。

## 历史与发布

工作分支 feature/miloqen-v6。9b1b8bd 保存被替代的雕塑探索，V4 在另一独立仓库和发布包中保留。远端 main 未修改。只有用户后续确认，才进入 PR/部署流程。
