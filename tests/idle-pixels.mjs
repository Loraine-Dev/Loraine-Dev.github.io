import fs from "node:fs/promises";
import assert from "node:assert/strict";
const report = JSON.parse(
  await fs.readFile("artifacts/idle-motion/after/report.json", "utf8"),
);
for (const sample of report) {
  assert(
    sample.samples.every((s) => s.state.scrollY === 0),
    "capture must contain no scroll",
  );
  assert(
    sample.samples.every(
      (s) => s.state.visibility === "visible" && !s.state.reduced,
    ),
    "visible normal-motion capture",
  );
  const threshold = sample.name === "mobile" ? 100 : 1000;
  for (const module of ["farFog", "treeLight"]) {
    const changes = sample.differences.flatMap((d) =>
      d.modules.filter((m) => m.name === module),
    );
    assert(
      changes.some((m) => m.channelsChangedBy8 >= threshold),
      `${sample.name} ${module}: timeline alone is insufficient; require a visible local pixel signal`,
    );
  }
  assert.equal(sample.errors.length, 0);
  assert.equal(sample.failures.length, 0);
}
console.log(
  "PASS separate checks: idle initialization, live timeline, actual local pixels; human visual acceptance remains pending",
);
