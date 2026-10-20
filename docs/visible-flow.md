# 可辨认的云海流动与局部斜光 · 2026-10-20

本轮以用户实际观看认为“仍然静止”的反馈为准。上一轮启动和像素检查通过并不表示实现了设计目标。没有更换远景主视觉、门体或近岸，没有修改其他页面，也未部署。最终运动是否自然仍由用户验收。

## 这次改变了什么

旧纹理在整幅世界坐标中铺展，小遮罩内缺少能跟踪的云形轮廓，局部像素变化主要表现为亮度。新实现使用一张独立、具有透明 alpha 的原创云带，在两层原有软遮罩中分别放置两片局部云团。每层整体密度恒定，云形持续漂移，同时通过不同周期的位移、伸缩、微转产生缓慢形变；没有移动原画中的树、山或瀑布。

桌面原有云谷遮罩继续使用，手机遮罩扩大到可读的云谷范围，岩壁/建筑的明暗保护保留。云带有实际蓝灰阴影与银色受光面，使用普通 alpha 合成，而非全屏白色 screen 雾幕。两层方向、位移与形变相位不同。交替缓动避免素材硬重置，局部变形错开周期，非无限单向流体模拟。

世界树由整个叶冠的局部亮暗改为两条有方向的窄软光束。光束源头位于原画树干后方的暖光附近；通过枝叶和蓝色空气软遮罩扫过冠部，树形和树干稳定。旧叶片亮度门槛只允许在已接近白色的叶子上加光，新遮罩也接纳冠部蓝色空气以显示光路，仍保护深暗枝干。没有整冠同步曝光或新光粒子。

镜头保留原来的近门、中岸、远景受控透视。新增桌面首次指针移动时激活延迟空间镜头，解决软件 GPU 模式只等滚动的问题；没有扩大镜头幅度。移动端继续在首次探索/滚动时才创建 Three，闲置云雾不依赖 WebGL 持续渲染。

## 资源与参数

- 新素材：`art-source/world-tree/cloud-bank-v2.png`，OpenAI imagegen 于 2026-10-20 生成的独立透明云带；不是第三方图片，也不是重新生成主画。提示词、来源、输出 SHA256 在同名 JSON。
- 优化：`npm run assets:cloud`，仅裁除透明边和缩放压缩，输出 `public/art/world-tree/motion/cloud-bank-v2.webp`，107912 字节。原始 PNG 保留。
- 主参数：`src/data/environment.json`。远雾单程 28 秒、局部纹理位移 56%；中雾 34 秒、-42%。两者透明度恒定为 0.95/0.88，手机乘 0.85。位移百分比基于局部纹理，不是整张背景。
- 云团形变、两束光的角度/周期：`src/scenes/environment.ts` 的 `cloud-billow`、`canopy-shaft` 创建段；云团周期 27/19 秒、光束 14/19 秒。光束角度围绕各自方向缓慢变化 ±7°。
- 局部素材排布、颜色、软边：`src/styles/site.css` 的 `.cloud-billow`、`.canopy-shaft` 及手机覆盖。未使用运行时 blur、噪声滤镜或全屏 Canvas。
- 遮罩：`art-source/world-tree/motion-regions.json` 与 `scripts/prepare-motion-assets.cjs`；生成 `environment-regions.json` 和 alpha WebP，运行时不加载 JSON。

这些是 2.5D 合成层，不是新制作的完整独立云世界或体积流体。瀑布仍烘焙在远景内；本轮没有伪造水流。

## 实时验收

开发服务器 `npm run dev`，127.0.0.1:4176。所有开发预览左下角有“静态 / 动态”按钮：静态隐藏附加环境层并将镜头固定到初见，动态恢复环境与原镜头；可在相同位置立即比较。按钮只在 DEV 动态导入，生产包不包含该 UI。

- 正常原页：`/?v=v6-visible-flow.2`
- 桌面固定 1440×900：`/review/desktop.html?v=v6-visible-flow.2`
- 手机固定 390×844：`/review/mobile.html?v=v6-visible-flow.2`
- 诊断：`/?debugMotion=1&v=v6-visible-flow.2`；默认 1×，提供独立开关和临时加速。静态对照状态也会显示。
- 仅两层云：`/?effects=farFog,midFog`；仅光束：`/?effects=treeLight`。

系统减少动态、后台/离屏暂停、低内存/省流保护保留。静态/动态对照不会绕过减少动态设置。

## 实拍与验证

`artifacts/visible-flow/cloud-review/` 保留先单独处理云雾的 0/2.5/5 秒浏览器画面和原始 WebM；第一轮仍不突出时继续校准，之后才处理光束。`light-review/` 保留光束阶段检查。最终 `comparison/` 包含桌面和手机两组静态、动态原始实录、截图及 JSON。

最终分设备录制，避免同时运行多个测试浏览器干扰录屏。约 30 秒 MP4 正常 1 倍速度，前 15 秒没有任何输入，后半段两种模式使用相同原生指针/滚轮输入。WebM 包含加载前后余量；转码按记录的起始偏移裁出观察窗口，没有 setpts 加速、补帧或静态图拼动画。左右对照仅空间拼接，左静态、右动态；并排 MP4 实际 29.96 秒。手机为浏览器竖屏视口，不是物理手机硬件实测。

最终约五秒样本（具体采样时间见报告）：

| 视口 | 状态 | 远雾总透明度              | 远雾纹理 CSS 横移 | 全画面最大通道差 |
| ---- | ---- | ------------------------- | ----------------- | ---------------- |
| 桌面 | 静态 | 0.95→0.95，但整层隐藏     | 0                 | 0                |
| 桌面 | 动态 | 0.95→0.95                 | 约 136px          | 125/255          |
| 手机 | 静态 | 0.8075→0.8075，但整层隐藏 | 0                 | 0                |
| 手机 | 动态 | 0.8075→0.8075             | 约 51px           | 109/255          |

横移数值是局部纹理 CSS 坐标，不等于每朵云都整体移动该距离；遮罩固定，内部云团另有形变。静态原画零差，动态各样本 scrollY=0，说明不是滚动/鼠标或透明度伪装位移。像素数值仍不能替代用户观看视频判断自然程度。

滚动同进度对比：桌面动态 cameraZ 6→2.7288，静态保持 6；手机动态 6→3.1，静态保持 6。近门、岸、远景具有不同层深，未无限放大一张合成背景。录屏无 JS 异常。

已通过 build、9 项单测、既有 browser/environment/idle 检查及新 `test:flow`。覆盖触控探索、320–1920px、Edge/Firefox、无 JS/WebGL 回退、后台、减少动态、开关与生产包排除。原有 `idle-pixels.mjs` 阈值没有更改；新测试先记录旧实现失败，再验证云雾固定密度下仍有正常速度位移。比较测试增加等待媒体变更生效，未放宽行为要求。旧版 Lighthouse 83 分不代表本轮性能；未重新测得设备 FPS 或宣称 60fps。

复测（两个服务器分别运行）：

```powershell
npm run dev
npm run build
npm run preview -- --port 4177
npm run test:unit
npm run test:browser
npm run test:environment
npm run test:idle
npm run test:flow
npm run verify:idle
# 建议按设备分别录制，保留正常速度
$env:RECORD_DEVICE='desktop'; node scripts/record-visible-flow.mjs
$env:RECORD_DEVICE='mobile'; node scripts/record-visible-flow.mjs
node scripts/encode-visible-flow.mjs
node scripts/summarize-visible-flow.mjs
```

回滚分支 `codex/before-visible-clouds-20261020` 指向 `8076d5a`；本轮在 `codex/visible-clouds-20261020`，仅本地提交。原主画、门体与近岸文件经 Git 对比无修改。
