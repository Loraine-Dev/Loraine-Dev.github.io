import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  summarize,
  transition,
  visualDifference,
  performanceRegression,
} from "../scripts/maintenance/model.mjs";

test("unreleased/unknown never becomes a clean online certification", () => {
  const report = summarize({
    unreleased: true,
    checks: [],
    unknown: ["Dependabot未读取"],
  });
  assert.equal(report.status, "pending");
  assert.match(report.text, /待上线|尚未验证/);
  assert.equal(summarize({ checks: [], unknown: [] }).text, "本周检查正常");
});
test("one issue updates by fingerprint; repeated fault and recovery do not spam", () => {
  const bad = summarize({
    checks: [{ id: "fixture", ok: false, detail: "安全演练" }],
  });
  const a = transition(null, bad);
  assert.equal(a.notify, true);
  const b = transition({ fingerprint: bad.fingerprint, status: "alert" }, bad);
  assert.equal(b.notify, false);
  const good = summarize({ checks: [] });
  assert.equal(
    transition({ fingerprint: bad.fingerprint, status: "alert" }, good).notify,
    true,
  );
  assert.equal(
    transition({ fingerprint: good.fingerprint, status: "ok" }, good).notify,
    false,
  );
});
test("large visual drift flags, tiny raster variation does not", () => {
  assert.equal(
    visualDifference([100, 100, 100], [101, 100, 100]) > 0.06,
    false,
  );
  assert.equal(visualDifference([100, 100, 100], [0, 0, 0]) > 0.06, true);
});
test("performance requires median regression with absolute and relative margins", () => {
  assert.equal(performanceRegression([100, 100, 900], 100), false);
  assert.equal(performanceRegression([1000, 1100, 1200], 500), true);
  assert.equal(performanceRegression([200, 210, 220], 100), false);
});
test("weekly schedule cannot publish, approve PRs or write source and uses immutable actions", async () => {
  const source = await readFile(
    ".github/workflows/weekly-maintenance.yml",
    "utf8",
  );
  assert.match(source, /cron: "0 1 \* \* 1"/);
  assert.doesNotMatch(
    source,
    /contents: write|pages: write|id-token: write|pull_request_target|pull-requests: write|secrets\.|gh pr merge|deploy-pages@/,
  );
  for (const match of source.matchAll(/uses:\s+(\S+)/g))
    assert.match(match[1], /^actions\/[\w-]+@[a-f0-9]{40}$/);
  assert.equal((source.match(/issues: write/g) || []).length, 1);
  assert.match(source, /persist-credentials: false/);
});
