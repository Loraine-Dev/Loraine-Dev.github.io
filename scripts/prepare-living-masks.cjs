// Technical masks only. Original paintings are never modified or moved.
const sharp = require("sharp");
const fs = require("node:fs/promises");
const crypto = require("node:crypto");
function inside(x, y, p) {
  let v = false;
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
    const a = p[i],
      b = p[j];
    if (
      a[1] > y != b[1] > y &&
      x < ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]) + a[0]
    )
      v = !v;
  }
  return v;
}
async function main() {
  const records = [];
  await fs.mkdir("public/art/world-tree/living", { recursive: true });
  for (const device of ["desktop", "mobile"]) {
    const mobile = device === "mobile",
      src = `public/art/world-tree/world-${device}.webp`,
      bytes = await fs.readFile(src);
    const { data, info } = await sharp(bytes)
      .resize({ width: mobile ? 576 : 1024 })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const water = mobile
      ? [
          [0.4, 0.505],
          [0.91, 0.505],
          [0.94, 0.6],
          [0.86, 0.72],
          [0.54, 0.73],
          [0.4, 0.65],
          [0.48, 0.59],
        ]
      : [
          [0.2, 0.705],
          [0.88, 0.705],
          [0.9, 0.76],
          [0.78, 0.84],
          [0.51, 0.845],
          [0.4, 0.78],
          [0.2, 0.77],
        ];
    const raw = Buffer.alloc(info.width * info.height * 3);
    for (let y = 0; y < info.height; y++)
      for (let x = 0; x < info.width; x++) {
        const nx = x / info.width,
          ny = y / info.height,
          i = y * info.width + x;
        raw[i * 3] = inside(nx, ny, water) ? 255 : 0;
        const cx = mobile ? 0.59 : 0.69,
          cy = mobile ? 0.247 : 0.265,
          rx = mobile ? 0.34 : 0.22,
          ry = mobile ? 0.115 : 0.18;
        const d = ((nx - cx) / rx) ** 2 + ((ny - cy) / ry) ** 2;
        const lum =
          (data[i * 3] * 0.2126 +
            data[i * 3 + 1] * 0.7152 +
            data[i * 3 + 2] * 0.0722) /
          255;
        // Bright foliage only, avoiding dark limbs and sky: blue moonlit leaves are
        // desaturated; the spatial envelope avoids sky beyond the canopy silhouette.
        const envelope = Math.max(0, Math.min(1, (1 - d) * 4));
        const leaf =
          Math.max(0, Math.min(1, (lum - 0.2) * 4)) *
          Math.max(0, Math.min(1, (0.86 - lum) * 6));
        raw[i * 3 + 1] = Math.round(255 * envelope * leaf);
      }
    const target = `public/art/world-tree/living/${device}-regions.png`;
    await sharp(raw, {
      raw: { width: info.width, height: info.height, channels: 3 },
    })
      .blur(2.5)
      .png({ palette: false, compressionLevel: 9 })
      .toFile(target);
    records.push({
      device,
      source: src,
      sourceSha256: crypto.createHash("sha256").update(bytes).digest("hex"),
      output: target,
      waterPolygon: water,
      channels: { red: "water refraction", green: "foliage local relighting" },
      bytes: (await fs.stat(target)).size,
    });
  }
  await fs.writeFile(
    "art-source/world-tree/living-manifest.json",
    JSON.stringify(
      { generator: "scripts/prepare-living-masks.cjs", records },
      null,
      2,
    ) + "\n",
  );
  console.log(records);
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
