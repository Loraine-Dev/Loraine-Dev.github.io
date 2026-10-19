// Technical masks and a deterministic translucent fog sprite, never repainting source art.
const sharp = require("sharp");
const fs = require("node:fs/promises");
const crypto = require("node:crypto");
const regions = require("../art-source/world-tree/motion-regions.json");
const out = "public/art/world-tree/motion";
async function main() {
  await fs.mkdir(out, { recursive: true });
  const manifest = {
    generator: "scripts/prepare-motion-assets.cjs",
    source:
      "Existing unchanged original MILOQEN art; manually authored analytic masks; seeded mathematical fog, no third-party assets",
    assets: [],
  };
  const placements = { desktop: {}, mobile: {} };
  for (const orientation of ["desktop", "mobile"]) {
    const file = `art-source/world-tree/world-${orientation}.png`;
    const width = 1024,
      height = orientation === "desktop" ? 576 : 1819;
    const { data: source, info } = await sharp(file)
      .resize(width, height)
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    for (const [name, region] of Object.entries(regions[orientation])) {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 1000 1000" preserveAspectRatio="none"><defs><filter id="s" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="${region.blur}"/></filter></defs><g fill="white" filter="url(#s)">${region.ellipses.map(([cx, cy, rx, ry]) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}"/>`).join("")}</g></svg>`;
      const shape = await sharp(Buffer.from(svg))
        .ensureAlpha()
        .raw()
        .toBuffer();
      const pixels = Buffer.alloc(width * height * 4);
      for (let i = 0; i < width * height; i++) {
        const lum =
          (source[i * info.channels] * 0.2126 +
            source[i * info.channels + 1] * 0.7152 +
            source[i * info.channels + 2] * 0.0722) /
          255;
        // Suppress dark rock/branches. Soft luminance gating protects painted silhouettes.
        const protect = Math.max(
          0,
          Math.min(1, (lum - (name === "treeLight" ? 0.27 : 0.15)) / 0.25),
        );
        pixels[i * 4] = pixels[i * 4 + 1] = pixels[i * 4 + 2] = 255;
        pixels[i * 4 + 3] = Math.round(shape[i * 4 + 3] * protect);
      }
      const path = `${out}/${orientation}-${name}.webp`;
      let left = width,
        top = height,
        right = 0,
        bottom = 0;
      for (let i = 0; i < width * height; i++)
        if (pixels[i * 4 + 3] > 1) {
          const x = i % width,
            y = Math.floor(i / width);
          left = Math.min(left, x);
          top = Math.min(top, y);
          right = Math.max(right, x);
          bottom = Math.max(bottom, y);
        }
      left = Math.max(0, left - 8);
      top = Math.max(0, top - 8);
      right = Math.min(width, right + 9);
      bottom = Math.min(height, bottom + 9);
      const bounds = {
        x: left / width,
        y: top / height,
        width: (right - left) / width,
        height: (bottom - top) / height,
      };
      placements[orientation][name] = bounds;
      await sharp(pixels, { raw: { width, height, channels: 4 } })
        .extract({ left, top, width: right - left, height: bottom - top })
        .webp({ quality: 90, alphaQuality: 100, effort: 6 })
        .toFile(path);
      const bytes = await fs.readFile(path);
      manifest.assets.push({
        path,
        bytes: bytes.length,
        bounds,
        sha256: crypto.createHash("sha256").update(bytes).digest("hex"),
      });
    }
  }
  // Broad nonperiodic wisps; baked once. Runtime only transforms/opacity, no noise shader/filter.
  const w = 1024,
    h = 384,
    buf = Buffer.alloc(w * h * 4);
  const hash = (x, y) => {
    let n = Math.imul(x, 374761393) + Math.imul(y, 668265263);
    n = Math.imul(n ^ (n >>> 13), 1274126177);
    return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
  };
  const noise = (x, y) => {
    const ix = Math.floor(x),
      iy = Math.floor(y);
    let u = x - ix,
      v = y - iy;
    u = u * u * (3 - 2 * u);
    v = v * v * (3 - 2 * v);
    return (
      (hash(ix, iy) * (1 - u) + hash(ix + 1, iy) * u) * (1 - v) +
      (hash(ix, iy + 1) * (1 - u) + hash(ix + 1, iy + 1) * u) * v
    );
  };
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const n =
        noise(x / 180, y / 55) * 0.58 +
        noise(x / 45, y / 18) * 0.28 +
        noise(x / 16, y / 7) * 0.14;
      const edge = Math.pow(
        Math.sin((Math.PI * (x + 0.5)) / w) *
          Math.sin((Math.PI * (y + 0.5)) / h),
        0.6,
      );
      const i = (y * w + x) * 4;
      buf[i] = 174;
      buf[i + 1] = 190;
      buf[i + 2] = 207;
      buf[i + 3] = Math.round(
        Math.min(1, Math.max(0, n - 0.25) * edge * 2.8) * 255,
      );
    }
  await sharp(buf, { raw: { width: w, height: h, channels: 4 } })
    .blur(1.2)
    .webp({ quality: 90, alphaQuality: 100 })
    .toFile(`${out}/fog.webp`);
  const fog = await fs.readFile(`${out}/fog.webp`);
  manifest.assets.push({
    path: `${out}/fog.webp`,
    bytes: fog.length,
    sha256: crypto.createHash("sha256").update(fog).digest("hex"),
  });
  await fs.writeFile(
    "art-source/world-tree/motion-manifest.json",
    JSON.stringify(manifest, null, 2) + "\n",
  );
  await fs.writeFile(
    "src/data/environment-regions.json",
    JSON.stringify(placements, null, 2) + "\n",
  );
  console.log(manifest.assets);
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
