import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import sharp from "sharp";
test("optimized art keeps source resolution, explicit crop provenance and WebP fallback", async () => {
  const records = JSON.parse(
    await readFile("art-source/world-tree/optimized-manifest.json", "utf8"),
  );
  assert.equal(records.length, 5);
  for (const r of records) {
    const meta = await sharp(r.output).metadata();
    assert.equal(meta.width, r.width);
    assert.equal(meta.height, r.height);
    if (!r.sourceRect) {
      const old = await sharp(r.fallback).metadata();
      assert.equal(meta.width, old.width);
      assert.equal(meta.height, old.height);
    }
  }
  const html = await readFile("index.html", "utf8");
  assert.match(html, /image\/avif/);
  assert.match(html, /world-mobile.webp/);
  assert.match(html, /shore-portrait.avif/);
});
