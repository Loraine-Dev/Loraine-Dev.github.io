const sharp = require("sharp");
const fs = require("node:fs/promises");
const crypto = require("node:crypto");
async function main() {
  const source = "art-source/world-tree/cloud-bank-v2.png";
  const { data, info } = await sharp(source)
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
  const output = "public/art/world-tree/motion/cloud-bank-v2.webp";
  await sharp(source)
    .extract({ left, top, width: right - left + 1, height: bottom - top + 1 })
    .resize({ width: 1280 })
    .webp({ quality: 88, alphaQuality: 95, effort: 6 })
    .toFile(output);
  const bytes = await fs.readFile(output);
  await fs.writeFile(
    "art-source/world-tree/cloud-bank-v2.json",
    JSON.stringify(
      {
        source,
        output,
        origin:
          "OpenAI imagegen, original transparent VFX cloud asset generated 2026-10-20. No third-party artwork. Main world painting unchanged.",
        prompt:
          "One isolated horizontal bank of moonlit mountain-valley clouds, transparent alpha, sculpted rolling billows and fine wispy edges; silver upper edges and slate-blue shadows, faint warm upper-right light. No landscape, objects, particles or text.",
        optimization:
          "Crop transparent margins and resize; preserve alpha and original colors. Rebuild with node scripts/prepare-cloud-bank.cjs.",
        sha256: crypto.createHash("sha256").update(bytes).digest("hex"),
        bytes: bytes.length,
      },
      null,
      2,
    ) + "\n",
  );
  console.log({
    output,
    bytes: bytes.length,
    alphaBounds: { left, top, right, bottom },
  });
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
