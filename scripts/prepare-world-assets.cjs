const fs = require("node:fs");
const sharp = require("sharp");
const crypto = require("node:crypto");
(async () => {
  const records = [];
  for (const name of [
    "world-desktop",
    "gate",
    "gate-mobile",
    "shore",
    "world-mobile",
  ]) {
    const source = `art-source/world-tree/${name}.png`;
    const production = `public/art/world-tree/${name}.webp`;
    const meta = await sharp(source).metadata();
    const result = await sharp(source)
      .resize({
        width: name.includes("mobile") ? 780 : name === "shore" ? 1280 : 1536,
        withoutEnlargement: true,
      })
      .webp({
        quality: name.startsWith("world") ? 85 : 82,
        alphaQuality: 100,
        effort: 6,
      })
      .toFile(production);
    let transparentPixels = null;
    if (meta.hasAlpha) {
      const { data, info } = await sharp(source)
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      let n = 0;
      for (let i = 3; i < data.length; i += 4) if (data[i] === 0) n++;
      transparentPixels = n / (info.width * info.height);
    }
    records.push({
      name,
      source,
      production,
      width: meta.width,
      height: meta.height,
      hasAlpha: meta.hasAlpha,
      transparentPixels,
      bytes: result.size,
      productionWidth: result.width,
      productionHeight: result.height,
      sha256: crypto
        .createHash("sha256")
        .update(fs.readFileSync(source))
        .digest("hex"),
      origin:
        "Built-in imagegen; original generation for MILOQEN, user concept used as art-direction reference",
    });
  }
  fs.writeFileSync(
    "art-source/world-tree/manifest.json",
    JSON.stringify(records, null, 2) + "\n",
  );
  console.log(JSON.stringify(records, null, 2));
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
