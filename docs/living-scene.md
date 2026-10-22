# 首页环境生命化：维护与验收

> 历史阶段记录：下表幅度与手机等待交互策略已由 2026-10-20 故障修复替代。当前参数以 `src/data/environment.json` 和 [idle-motion-fix.md](idle-motion-fix.md) 为准；素材结构与相机原理仍适用。

本轮只修改首页场景动态，基线 797a3f9。没有替换主视觉、重新设计品牌、增加内容页或发布。原始五张 PNG 和生产主视觉 WebP 保持原样。

## 素材真实结构

已有独立远景绘景、透明近岸、透明门体；桌面/手机远景与门体分别制作。树、建筑、云海、瀑布、水面烘焙在远景中，不是独立可移动物体。本次没有裁出树或云后移动，没有背景修复，也不声称有完整三维树。

新增技术遮罩与透明雾纹理：`art-source/world-tree/motion-regions.json` 定义桌面/竖幅各四个软区域；`scripts/prepare-motion-assets.cjs` 结合原图亮度保护生成 alpha WebP，抑制深色枝干和岩石。固定数学噪声预烘焙雾纹理，运行时没有噪声滤镜或逐帧 Canvas。来源、大小、哈希在 `motion-manifest.json`。`npm run assets:motion` 可重建；无第三方素材。

## 独立运动层

| 层 | 原理 | 参数 |
| --- | --- | --- |
| 远处云海 `farFog` | 固定软遮罩内透明雾纹理缓慢横移/上浮，微弱散射叠加 | 单程 96 秒，水平 1.2%、垂直 0.16%；明暗周期 155.328 秒 |
| 山间雾 `midFog` | 独立区域、相反方向、不同速度和相位的雾带 | 单程 71 秒，水平 1.8%、垂直 0.24%；明暗周期 114.878 秒 |
| 叶冠局部光 `treeLight` | 叶冠亮度遮罩内低强度暖银色光，仅透明度改变 | 43 秒周期，最大 opacity 0.055；树形和树干不移动 |
| 水面反射 `waterLight` | 平静反射区内局部柔光，不滚动原图水纹 | 61 秒明暗周期，最大 opacity 0.022，水平总幅 0.35% |

上述 opacity 还乘以遮罩与纹理 alpha，不是全图曝光变化。手机再乘 0.65。两层雾的远近感来自不同画面区域、速度与遮罩，并非两张完整独立云层或任意可绕行的空间。

瀑布、水雾坠落和真实波面位移保持静态。进一步制作可信水流需要独立瀑布 alpha、连续流动序列或流向贴图、岩壁遮挡遮罩及无水底图。建筑与树若要独立产生更大位移，还需分离层和遮挡后修复背景；本轮没有强行伪造。

## 相机与绘制

远景以 DOM 原生图像呈现，环境层位于其内部；`environment-space.ts` 用与 Three 相同的透视数学计算投影。透明 WebGL 只绘制门体和近岸，位于环境层上方，因此雾不会盖住前景雕刻与地貌。不改变原图 UV、全图曝光或清晰度。

桌面相机 z=6→1.9，手机 z=6→3.1。门 z=-2、岸 z=-11、远景 z=-28，门体位移明显，岸层较小，树和建筑绘景相对稳定。原生滚动、有界进度，没有拦截滚轮或强制滚动。后续内容未制作，推进目前到“想象的另一侧”验收终点。

WebGL 只在输入、滚动、尺寸或状态变化时重绘。环境动画使用 Web Animations API 驱动 Transform／Opacity 合成，不唤醒 WebGL 循环。没有加入 GSAP、后处理、粒子或音频依赖。

遮罩裁到实际生效区域，并保留软边余量。`src/data/environment-regions.json` 由生成脚本自动输出；`maskPlacement` 保证裁切后纹理仍使用原来的世界坐标。四个合成区域的矩形面积合计从四个全画面缩减为桌面约 0.351 个画面、手机约 0.263 个画面（减少约 91%/93%）；这不是实测 GPU 时间降幅。

## 参数与开关

- `src/data/environment.json`：总开关 `enabled`，独立 `effects.*.enabled`，时长、透明度、幅度、相位及手机强度。
- `src/data/world.json`：`camera.enabled`、相机距离、手机推进、各层深度；`motion.pointerEnabled` 与指针幅度。
- `src/scenes/environment.ts`：遮罩和动画生命周期；`world-scene.ts`：前景相机与绘制。
- `src/styles/site.css`：局部光颜色、散射合成、图层顺序。无运行时 blur。
- QA 地址 `/?effects=farFog` 只开远雾；`/?effects=farFog,midFog` 只开两层雾；`/?effects=` 关闭全部环境层。
- `/?camera=off&pointer=off` 关闭镜头和指针，可与 effects 组合。
- “暂停动态”保留环境相位，主动滚动仍可探索；后台、离屏和 pagehide 暂停。减少动态偏好隐藏环境层并冻结相机；节省流量或低内存不创建环境素材层。
- 手机 `mobileStart: "interaction"`：首帧静态，首次探索、滚动或键盘下移后才加载环境层与空间镜头。桌面自动启动。此为实际发布行为，不是测试专用开关。

## 重现验证

```sh
npm run build
npm run test:unit
npm run test:browser
npm run test:environment
npm run record:environment
node scripts/record-mobile-environment.mjs
```

桌面录屏默认访问 4177 生产预览，记录 192 秒真实时间及前后滚动；手机访问 4176，记录 30 秒环境及触控探索。没有加速或用静态图合成视频。最慢雾层往返 192 秒，其他周期错开，没有短的全场同步循环。WebM 是原始录制，MP4 只作兼容转码。证据见交付包 verification/，结果见 living-verification.md。
