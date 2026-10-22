# 两个独立局部素材样片

基线 f225703；仅 `samples/` 引用本轮素材。稳定首页、内页、原主图、原云雾代码均未修改。未整合、未部署。此目录不在现有 Vite 正式多页入口中。

运行 `npm ci`、`npm run dev`，打开 `/samples/review.html`。验收外壳可切换水面/光路、桌面/手机、局部关闭/开启/完全静态。正常样片 `/samples/?effect=water` 或 `effect=light` 没有调试控件，沿用原品牌排版。样片不包含穿门镜头交互，避免把这次局部材质试验扩展成首页重构。

## 素材与重建

- 原始裁切：art-source/material-samples/inputs；裁切坐标 samples/assets.json。
- 原始 imagegen 输出：art-source/material-samples/*-generated.png。工具为内置 image_gen，非第三方素材。提示词见 PROMPTS.md。
- 可编辑无压缩分层母版：art-source/material-samples/desktop-water、mobile-water、desktop-light、mobile-light。
- 网站编码：public/art/material-samples/*。base 为局部修复底图，reflection-positive / negative 为有符号反射差分（水面）或主要光路贡献（光路）；control RGBA 为距离、密度/粗糙度、流向/可见性、边界；boundary.png 为独立边界查看图。
- 重建脚本：node scripts/prepare-sample-materials.mjs；注册、源哈希和逐文件体积见 manifest.json。

水面底图移除烘焙倒影，原图与底图的差分拆成正负两张。平直状态 `base + positive - negative = original`，逐字节一致。动态时仅对独立反射层重采样，底图留在原位。遮罩内部直接替换原水面，避免在旧倒影上再叠一层。边缘向内羽化，位移随遮罩收敛；门框和石岸仍在上层，未进行水波扭曲。

光路的 AI 图不具备精确几何配准，因此只取低频中性空气色彩指导。最终注册底图从原画分离一束固定方向的源色光贡献，原云、地形、建筑细节不被生成图替换。运行时读取正在显示的 `.cloud-billow` 的位置，使用同一透明云纹理沿光源到空气采样点的路径计算遮挡。没有独立的正弦明暗循环，也没有通过提高整图亮度制造运动。

## 正常录屏与性能

最终录屏脚本 node scripts/record-material-samples.mjs。正常片段初始化后连续 30 秒、无调试标签；完整原片和 WebM 保留。对比片段为局部关约 4 秒、开约 14 秒、关约 4 秒，仅对比片有状态标签，原云雾保持运行。

性能脚本 node scripts/measure-material-samples.mjs，稳定首页单项模式与样片单项模式分开测。原始数据 artifacts/material-samples/performance.json，解读见 PERFORMANCE.md。单轮软件图形实验，不是实体手机、不代表网页显示帧率或 GPU 温升。主页面 CDP 网络值未完整覆盖 Worker；声明响应体积含缓存与重复请求，两者都不能代表全站实际下载总量。尚未做整合后的整站 Lighthouse。

## 限制与验收边界

1. imagegen 输出不是逐像素几何修复图；水面只取内缩安全水域的纹理，光路只取低频色彩，不使用生成建筑或岩石。
2. 水面是独立反射层的二维法线重采样，不是三维环境反射；没有改变湖岸轮廓、没有移动湿石反光。前景大面积金色湿石反光保持静态。
3. 光路是带空气/遮挡图的 2.5D 局部光学合成，不是全场景体积光。云投影使用其屏幕矩形近似，未精确投影小角度旋转或真实三维云厚度。
4. 桌面/手机分别裁切和配准。手机使用水面 780×600、光路 624×312 的局部画布；原静态主图保持原清晰度。材质硬件提交上限桌面20/手机15，软件8，不声称达到这些实际可见帧率。
5. 减少动态、Save-Data、低内存策略、Worker/WebGL 不可用时回退原画；后台与暂停时停止局部绘制。没有新增树冠摆动、瀑布或粒子。
6. 是否在正常速度 5–10 秒内足够自然、边缘是否可信、是否值得整合，等待用户看实际样片；技术重建检查不代替美术验收。真实手机温升、耗电和流畅度尚未验证。

稳定回滚分支 codex/stable-before-local-samples-20261021 指向 f225703。未获用户确认前不要把样片 import 到 src/entry.ts，也不要修改正式构建入口或触发 Pages。
