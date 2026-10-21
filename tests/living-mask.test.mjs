import test from "node:test";
import assert from "node:assert/strict";
import { stat } from "node:fs/promises";
import sharp from "sharp";
for (const device of ["desktop", "mobile"])
  test(`${device} lossless mask preserves every region pixel`, async () => {
    const root = `public/art/world-tree/living/${device}-regions`;
    const old = await sharp(root + ".png")
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const current = await sharp(root + "-lossless.webp")
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    assert.deepEqual(current.info, old.info);
    assert.deepEqual(current.data, old.data);
    assert(
      (await stat(root + "-lossless.webp")).size <
        (await stat(root + ".png")).size,
    );
  });
