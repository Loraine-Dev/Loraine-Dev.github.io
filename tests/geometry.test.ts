import assert from "node:assert/strict";
import { test } from "node:test";
import { buildPetalData, petals, samplePetal } from "../src/scenes/geometry.ts";
import { chooseQuality, cameraPose } from "../src/scenes/policy.ts";
test("sculpture has three distinct, stable surfaces with finite coordinates", () => {
  assert.equal(petals.length, 3);
  for (const petal of petals) {
    const d = buildPetalData(petal, 48, 24);
    assert.equal(d.positions.length, 49 * 25 * 3);
    assert.equal(d.indices.length, 48 * 24 * 6);
    assert([...d.positions].every(Number.isFinite));
    assert([...d.indices].every((i) => i >= 0 && i < d.positions.length / 3));
    for (const u of [0, 1]) {
      const a = samplePetal(petal, u, -1),
        b = samplePetal(petal, u, 1);
      assert(
        Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) < 0.0001,
        "ends taper to a point",
      );
    }
  }
});
test("quality policy honors data saving, memory and independent mobile budget", () => {
  assert.equal(
    chooseQuality({ width: 1440, cores: 8, memory: 8, saveData: true }).mode,
    "poster",
  );
  assert.equal(
    chooseQuality({ width: 1440, cores: 2, memory: 2, saveData: false }).mode,
    "poster",
  );
  assert.equal(
    chooseQuality({ width: 390, cores: 8, memory: 8, saveData: false }).mode,
    "mobile",
  );
  assert.equal(
    chooseQuality({ width: 1440, cores: 8, memory: 8, saveData: false }).mode,
    "desktop",
  );
});
test("scroll mapping clamps fast scrolling and camera remains finite", () => {
  assert.deepEqual(cameraPose(-5, false), cameraPose(0, false));
  assert.deepEqual(cameraPose(8, true), cameraPose(1, true));
  for (const p of [0, 0.5, 1])
    assert(Object.values(cameraPose(p, false)).every(Number.isFinite));
});
