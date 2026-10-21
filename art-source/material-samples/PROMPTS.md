# 内置 image_gen 编辑提示词与来源

四次均使用 referenced_image_paths 指向同名 inputs PNG，transparent_background:false。原图为项目既有自有主视觉的局部裁切；没有第三方插画。

## desktop-water

EDIT TARGET: this exact horizontal MILOQEN water-region crop (1216 x 384). Produce a registered water CLEAN PLATE for a compositing/VFX material, not a new illustration. Preserve exact image framing, lens, island horizon, every rock shelf and shoreline, architecture and dark blue cinematic palette. Only in the open lake, remove the narrow warm golden vertical reflected-light streaks and the small bright baked specular ripple crests, reconstructing quietly textured dark midnight-blue water with the same broad soft ambient sky reflection and average tonal structure. Do not blur the entire crop; retain subtle fine water material. Do not modify wet rocks or their gold reflections. Do not add waves, objects, lights, particles or any extra scene. The original highlights will be supplied separately as a reflection pass in a shader, so the open-water clean plate should not contain a second copy of the bright vertical sun reflection. Pixel registration and faithful unchanged scene geometry are much more important than invention. Output only the repaired clean plate, same extremely wide crop, no labels.

## mobile-water

EDIT TARGET: exact supplied MILOQEN mobile lake crop, 780x600. Create a precisely registered clean WATER surface pass for VFX compositing, not a new scene. Keep this composition and camera crop. Preserve every shore rock, island, waterfall, and their boundaries unchanged. Only inside the open lake, remove the baked central vertical golden reflected-sun streak and its small bright horizontal glints; reconstruct dark midnight-blue water beneath it, matching surrounding broad ambient sky reflection and subtle water texture. Do not erase or change gold light on any wet rocks. Keep the deep blue values, soft distant lake, and the original scene lighting. Do not add any waves, objects, lights, structures, particles or overlays. Reflection will be composited separately later, so do not leave a second bright vertical reflection in the open water. Do not brighten, stylize or redesign. Return the clean plate only, no labels.

## desktop-light / mobile-light（分别使用对应裁切）

EDIT TARGET: this exact MILOQEN valley crop. Make a registered NEUTRAL AIR CLEAN PLATE for compositing one sun shaft back separately. Preserve the exact mountain silhouettes, cloud shapes as closely as possible, bridges, buildings, waterfall and tree positions, all detailed geometry and image framing. Only in the open valley air between the camera and the far mountains, gently remove the baked directional warm sunlight veil from upper-right toward lower-left. Keep the same deep blue cinematic ambient illumination and the existing soft white clouds. Preserve the actual sun and all direct light on buildings and rocks unchanged. Do not make the valley flat black, and do not brighten it. This is a local light-removal VFX plate, not a redesign, no new elements, no text, no new fog or light beams. Faithful composition and tonal structure matter more than invention. Output the repaired plate only.

## 输出检查

生成结果改变了部分几何和画幅，不满足整块回贴条件。全部原始输出保留。后续只使用安全水域纹理与空气低频色彩；原建筑、石岸、树和云的结构不由这些输出替换。这个限制不能被描述成“已经获得完美配准的独立原画层”。
