import { test } from "node:test";
import assert from "node:assert/strict";
import {
  projectWorldLayer,
  motionEnabled,
  maskPlacement,
} from "../src/scenes/environment-space.ts";
test("cropped masks preserve the full-world texture coordinates and drift extent", () => {
  const b = { x: 0.2, y: 0.4, width: 0.5, height: 0.2 },
    p = maskPlacement(b);
  assert(Math.abs(b.x + (b.width * p.driftLeft) / 100 + 0.05) < 1e-8);
  assert(Math.abs(b.y + (b.height * p.driftTop) / 100 + 0.05) < 1e-8);
  assert(Math.abs((b.width * p.driftWidth) / 100 - 1.1) < 1e-8);
  assert.equal(p.width, 50);
});
test("DOM far plane matches perspective camera and remains bounded during fast scroll", () => {
  const before = projectWorldLayer(
    1440,
    900,
    1536 / 864,
    42,
    -28,
    { x: 0, y: 0, z: 6 },
    6,
  );
  const after = projectWorldLayer(
    1440,
    900,
    1536 / 864,
    42,
    -28,
    { x: 0.03, y: 0.06, z: 1.9 },
    6,
  );
  assert(Math.abs(after.scale - 34 / 29.9) < 1e-8);
  assert(before.width >= 1440 && before.height >= 900);
  assert(after.x < 0 && after.y > 0);
  assert(Object.values(after).every(Number.isFinite));
});
test("individual effect switches and accessibility/data policy override ambient motion", () => {
  assert.equal(
    motionEnabled(true, {
      reduced: false,
      paused: false,
      hidden: false,
      active: true,
      saveData: false,
    }),
    true,
  );
  for (const key of ["reduced", "paused", "hidden", "saveData"])
    assert.equal(
      motionEnabled(true, {
        reduced: false,
        paused: false,
        hidden: false,
        active: true,
        saveData: false,
        [key]: true,
      }),
      false,
    );
  assert.equal(
    motionEnabled(false, {
      reduced: false,
      paused: false,
      hidden: false,
      active: true,
      saveData: false,
    }),
    false,
  );
});
