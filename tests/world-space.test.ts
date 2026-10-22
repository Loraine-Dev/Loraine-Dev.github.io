import { test } from "node:test";
import assert from "node:assert/strict";
import {
  cameraAt,
  projectedExpansion,
  fitLayer,
  clampProgress,
} from "../src/scenes/world-space.ts";
test("foreground travels more than shore and far world during a real camera dolly", () => {
  const from = cameraAt(0),
    to = cameraAt(1);
  const far = projectedExpansion(-28, from.z, to.z),
    shore = projectedExpansion(-11, from.z, to.z),
    gate = projectedExpansion(-2, from.z, to.z);
  assert(gate > shore && shore > far && far > 1);
  assert(gate > 1.8 && far < 1.2);
});
test("fast scroll and camera inputs remain bounded", () => {
  assert.equal(clampProgress(-10), 0);
  assert.equal(clampProgress(10), 1);
  assert.deepEqual(cameraAt(-2), cameraAt(0));
  assert.deepEqual(cameraAt(5), cameraAt(1));
});
test("layer fit covers viewport with bounded image aspect and no non-finite values", () => {
  for (const aspect of [320 / 740, 390 / 844, 768 / 1024, 1920 / 1080]) {
    const r = fitLayer(34, aspect, 16 / 9, 42);
    assert(r.width >= r.viewWidth);
    assert(r.height >= r.viewHeight);
    assert(Object.values(r).every(Number.isFinite));
  }
});
