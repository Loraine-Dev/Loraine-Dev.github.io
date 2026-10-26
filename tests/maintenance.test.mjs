import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  summarize,
  transition,
  visualDifference,
  performanceRegression,
  auditCheck,
  summarizeMainFailures,
} from "../scripts/maintenance/model.mjs";

test("audit distinguishes a valid clean report, known vulnerabilities and unavailable results", () => {
  const clean = {
    auditReportVersion: 2,
    vulnerabilities: {},
    metadata: {
      vulnerabilities: {
        info: 0,
        low: 0,
        moderate: 0,
        high: 0,
        critical: 0,
        total: 0,
      },
    },
  };
  assert.equal(auditCheck(clean, "success").ok, true);
  const vulnerable = {
    ...clean,
    vulnerabilities: { "fast-uri": { severity: "moderate" } },
    metadata: {
      vulnerabilities: {
        ...clean.metadata.vulnerabilities,
        moderate: 1,
        total: 1,
      },
    },
  };
  assert.equal(auditCheck(vulnerable, "failure").ok, false);
  assert.match(auditCheck(vulnerable, "failure").detail, /中等1/);
  for (const invalid of [
    null,
    {},
    { error: { code: "E503" } },
    { ...clean, metadata: { vulnerabilities: { total: 0 } } },
    {
      ...clean,
      metadata: {
        vulnerabilities: { ...clean.metadata.vulnerabilities, total: 1 },
      },
    },
    { ...clean, vulnerabilities: { unexpected: {} } },
  ]) {
    assert.equal(auditCheck(invalid, "success").ok, false);
  }
  assert.equal(auditCheck(clean, "failure").ok, false);
  assert.equal(auditCheck(clean, undefined).ok, false);
});

test("main failures retain history, distinguish recovered CI, and do not recursively count maintenance alerts", () => {
  const now = Date.parse("2026-10-26T06:00:00Z");
  const run = (id, workflow_id, path, created_at, conclusion, extra = {}) => ({
    id,
    workflow_id,
    path,
    created_at,
    conclusion,
    status: "completed",
    head_branch: "main",
    ...extra,
  });
  const build = ".github/workflows/pages.yml",
    weekly = ".github/workflows/weekly-maintenance.yml";
  const runs = [
    run(1, 10, build, "2026-10-22T02:45:00Z", "failure"),
    run(2, 10, build, "2026-10-22T04:42:00Z", "success"),
    run(3, 20, weekly, "2026-10-22T03:53:00Z", "failure"),
    run(4, 20, weekly, "2026-10-26T05:55:00Z", "failure"),
    run(5, 10, build, "2026-10-25T00:00:00Z", "failure", {
      head_branch: "feature",
    }),
    run(6, 10, build, "2026-10-18T00:00:00Z", "failure"),
  ];
  const summary = summarizeMainFailures(runs, { now, currentRunId: 4 });
  assert.equal(summary.ok, true);
  assert.deepEqual(
    summary.recovered.map((r) => r.id),
    [1],
  );
  assert.deepEqual(
    summary.maintenance.map((r) => r.id),
    [3],
  );
  assert.equal(summary.total, 2);
  assert.match(summary.detail, /本轮检查/);
  // Latest failed build, different failed workflow and spoofed maintenance name stay actionable.
  for (const failure of [
    run(7, 10, build, "2026-10-26T01:00:00Z", "failure"),
    run(
      8,
      30,
      ".github/workflows/other.yml",
      "2026-10-22T02:00:00Z",
      "timed_out",
    ),
    run(
      9,
      30,
      ".github/workflows/other.yml",
      "2026-10-22T02:00:00Z",
      "failure",
      { name: "Weekly MILOQEN maintenance" },
    ),
  ])
    assert.equal(
      summarizeMainFailures([...runs, failure], { now, currentRunId: 4 }).ok,
      false,
    );
  // Historical maintenance is not itself a new fault; current vulnerable audit still forces alert.
  assert.equal(
    summarize({
      checks: [
        { id: "recent-main-actions", ok: summary.ok },
        { id: "npm-audit", ok: false },
      ],
    }).status,
    "alert",
  );
});

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
  assert.match(source, /RESULT_AUDIT: \$\{\{ steps\.audit\.outcome \}\}/);
});
