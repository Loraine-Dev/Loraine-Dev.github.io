import sharp from "sharp";
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
const records = [],
  sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
async function save(name, pipeline, source, fallback, quality, sourceRect) {
  const output = `public/art/world-tree/${name}.avif`;
  const result = await pipeline
    .avif({ quality, effort: 6, chromaSubsampling: "4:4:4" })
    .toFile(output);
  records.push({
    name,
    source,
    fallback,
    output,
    quality,
    chromaSubsampling: "4:4:4",
    width: result.width,
    height: result.height,
    sourceRect,
    bytes: result.size,
    sourceSha256: sha(await readFile(source)),
    sha256: sha(await readFile(output)),
  });
}
for (const name of ["gate", "gate-mobile", "shore"]) {
  const source = `art-source/world-tree/${name}.png`,
    fallback = `public/art/world-tree/${name}.webp`,
    meta = await sharp(fallback).metadata();
  await save(
    name,
    sharp(source).resize(meta.width, meta.height),
    source,
    fallback,
    70,
  );
}
const rect = {
  left: 437,
  top: 0,
  width: 406,
  height: 720,
  referenceWidth: 1280,
  referenceHeight: 720,
  maxAspect: "9/16",
};
const shore = await sharp("art-source/world-tree/shore.png")
  .resize(1280, 720)
  .png()
  .toBuffer();
await save(
  "shore-portrait",
  sharp(shore).extract({ left: 437, top: 0, width: 406, height: 720 }),
  "art-source/world-tree/shore.png",
  "public/art/world-tree/shore.webp",
  70,
  rect,
);
const source = "art-source/world-tree/cloud-bank-v2.png",
  { data, info } = await sharp(source)
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
await save(
  "cloud-bank-v2",
  sharp(source)
    .extract({ left, top, width: right - left + 1, height: bottom - top + 1 })
    .resize({ width: 1280 }),
  source,
  "public/art/world-tree/motion/cloud-bank-v2.webp",
  75,
);
await writeFile(
  "art-source/world-tree/optimized-manifest.json",
  JSON.stringify(records, null, 2) + "\n",
);
console.log(records.map((r) => ({ name: r.name, bytes: r.bytes })));
