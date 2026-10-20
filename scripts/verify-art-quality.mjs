import sharp from "sharp";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import assert from "node:assert/strict";
// Local 8x8 luminance SSIM on a dark matte. This is an objective guard, not an art approval.
function ssim(a, b, w, h) {
  let sum = 0,
    count = 0;
  for (let y = 0; y < h; y += 8)
    for (let x = 0; x < w; x += 8) {
      let sa = 0,
        sb = 0,
        saa = 0,
        sbb = 0,
        sab = 0,
        n = 0;
      for (let yy = y; yy < Math.min(y + 8, h); yy++)
        for (let xx = x; xx < Math.min(x + 8, w); xx++) {
          const i = (yy * w + xx) * 4;
          const lum = (p) =>
            ((0.2126 * p[i] + 0.7152 * p[i + 1] + 0.0722 * p[i + 2]) *
              p[i + 3]) /
            255;
          const va = lum(a),
            vb = lum(b);
          sa += va;
          sb += vb;
          saa += va * va;
          sbb += vb * vb;
          sab += va * vb;
          n++;
        }
      const ma = sa / n,
        mb = sb / n,
        va = saa / n - ma * ma,
        vb = sbb / n - mb * mb,
        cov = sab / n - ma * mb;
      sum +=
        ((2 * ma * mb + 6.5025) * (2 * cov + 58.5225)) /
        ((ma * ma + mb * mb + 6.5025) * (va + vb + 58.5225));
      count++;
    }
  return sum / count;
}
await mkdir("artifacts/final-quality/encoding", { recursive: true });
const records = JSON.parse(
    await readFile("art-source/world-tree/optimized-manifest.json", "utf8"),
  ),
  results = [];
for (const r of records) {
  let pipe = sharp(r.source),
    old = sharp(r.fallback);
  if (r.name === "shore-portrait") {
    pipe = pipe
      .resize(1280, 720)
      .extract({ left: 437, top: 0, width: 406, height: 720 });
    old = old.extract({ left: 437, top: 0, width: 406, height: 720 });
  } else if (r.name === "cloud-bank-v2") {
    const { data, info } = await sharp(r.source)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    let left = info.width,
      top = info.height,
      right = 0,
      bottom = 0;
    for (let y = 0; y < info.height; y++)
      for (let x = 0; x < info.width; x++)
        if (data[(y * info.width + x) * 4 + 3] > 8) {
          left = Math.min(left, x);
          top = Math.min(top, y);
          right = Math.max(right, x);
          bottom = Math.max(bottom, y);
        }
    pipe = pipe
      .extract({ left, top, width: right - left + 1, height: bottom - top + 1 })
      .resize({ width: 1280 });
  } else pipe = pipe.resize(r.width, r.height);
  const source = await pipe.ensureAlpha().raw().toBuffer(),
    baseline = await old.ensureAlpha().raw().toBuffer(),
    encoded = await sharp(r.output).ensureAlpha().raw().toBuffer();
  const a = ssim(source, baseline, r.width, r.height),
    b = ssim(source, encoded, r.width, r.height);
  results.push({
    name: r.name,
    width: r.width,
    height: r.height,
    baselineSSIM: a,
    optimizedSSIM: b,
  });
  assert(b >= a, `${r.name} loses measured structural detail`);
}
await writeFile(
  "artifacts/final-quality/encoding/final-quality.json",
  JSON.stringify(results, null, 2),
);
console.log(JSON.stringify(results, null, 2));
