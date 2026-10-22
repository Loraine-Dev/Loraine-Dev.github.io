// Original technical scattering mattes. Source paintings are read, never changed.
const sharp = require("sharp");
const fs = require("node:fs/promises");
const crypto = require("node:crypto");
const config = require("../src/data/godrays.json");
const smooth = (a, b, x) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
function inside(x, y, polygon) {
  let hit = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i],
      [xj, yj] = polygon[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi)
      hit = !hit;
  }
  return hit;
}
function hash(x, y) {
  let n = Math.imul(x, 374761393) + Math.imul(y, 668265263);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
}
function noise(x, y) {
  const ix = Math.floor(x),
    iy = Math.floor(y),
    u = smooth(0, 1, x - ix),
    v = smooth(0, 1, y - iy);
  return (
    (hash(ix, iy) * (1 - u) + hash(ix + 1, iy) * u) * (1 - v) +
    (hash(ix, iy + 1) * (1 - u) + hash(ix + 1, iy + 1) * u) * v
  );
}
async function main() {
  const directory = "public/art/world-tree/godrays";
  await fs.mkdir(directory, { recursive: true });
  const manifest = {
    generator: "scripts/prepare-godrays.cjs",
    source:
      "Original analytical scattering field, manually placed source and terrain occlusion; seeded density baked once. No third-party assets, no real-time physical volume claim.",
    assets: [],
  };
  const placements = {};
  for (const orientation of ["desktop", "mobile"]) {
    const p = config[orientation],
      w = p.width,
      h = p.height,
      source = `art-source/world-tree/world-${orientation}.png`;
    const sourceBytes = await fs.readFile(source);
    const { data, info } = await sharp(sourceBytes)
      .resize(w, h, { fit: "fill" })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const buffers = [];
    let left = w,
      top = h,
      right = 0,
      bottom = 0;
    for (const pose of p.poses) {
      const rgba = Buffer.alloc(w * h * 4);
      for (let y = 0; y < h; y++)
        for (let x = 0; x < w; x++) {
          const nx = x / w,
            ny = y / h,
            dx = x - p.source[0] * w,
            dy = y - p.source[1] * h,
            d = Math.hypot(dx, dy),
            radius = d / (w * p.reach),
            theta = (Math.atan2(dy, dx) * 180) / Math.PI;
          const angular = p.beams.reduce(
            (sum, [angle, spread, gain]) =>
              sum +
              gain * Math.exp(-0.5 * ((theta - angle - pose) / spread) ** 2),
            0,
          );
          const radial =
            smooth(0.045, 0.22, radius) * (1 - smooth(0.6, 1, radius));
          const band =
            smooth(p.airBand[0], p.airBand[1], ny) *
            (1 - smooth(p.airBand[2], p.airBand[3], ny));
          const i = y * w + x,
            lum =
              (data[i * info.channels] * 0.2126 +
                data[i * info.channels + 1] * 0.7152 +
                data[i * info.channels + 2] * 0.0722) /
              255;
          const air =
            smooth(0.085, 0.28, lum) * (1 - 0.45 * smooth(0.65, 0.9, lum));
          const density =
            0.55 + 0.3 * noise(x / 105, y / 57) + 0.15 * noise(x / 23, y / 13);
          const alpha = inside(nx, ny, p.occluder)
            ? 0
            : Math.min(1, angular) * radial * band * air * density * p.alpha;
          const cool = Math.min(1, radius * 0.85);
          rgba[i * 4] = Math.round(235 - 60 * cool);
          rgba[i * 4 + 1] = Math.round(223 - 24 * cool);
          rgba[i * 4 + 2] = Math.round(193 + 17 * cool);
          rgba[i * 4 + 3] = Math.round(alpha * 255);
          if (rgba[i * 4 + 3] > 1) {
            left = Math.min(left, x);
            top = Math.min(top, y);
            right = Math.max(right, x);
            bottom = Math.max(bottom, y);
          }
        }
      buffers.push(rgba);
    }
    left = Math.max(0, left - 6);
    top = Math.max(0, top - 6);
    right = Math.min(w, right + 7);
    bottom = Math.min(h, bottom + 7);
    const bounds = {
      x: left / w,
      y: top / h,
      width: (right - left) / w,
      height: (bottom - top) / h,
    };
    const poses = [];
    for (let i = 0; i < buffers.length; i++) {
      const output = `${directory}/${orientation}-${i}.webp`;
      await sharp(buffers[i], { raw: { width: w, height: h, channels: 4 } })
        .blur(0.7)
        .extract({ left, top, width: right - left, height: bottom - top })
        .webp({ quality: 88, alphaQuality: 100, effort: 6 })
        .toFile(output);
      const bytes = await fs.readFile(output);
      poses.push(`./art/world-tree/godrays/${orientation}-${i}.webp`);
      manifest.assets.push({
        output,
        source,
        sourceSha256: crypto
          .createHash("sha256")
          .update(sourceBytes)
          .digest("hex"),
        sha256: crypto.createHash("sha256").update(bytes).digest("hex"),
        bytes: bytes.length,
        bounds,
        pose: p.poses[i],
      });
    }
    placements[orientation] = { bounds, poses };
  }
  await fs.writeFile(
    "src/data/godray-assets.json",
    JSON.stringify(placements, null, 2) + "\n",
  );
  await fs.writeFile(
    "art-source/world-tree/godray-manifest.json",
    JSON.stringify(manifest, null, 2) + "\n",
  );
  console.log(manifest.assets);
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
