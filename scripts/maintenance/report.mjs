import { readFile, writeFile, mkdir } from "node:fs/promises";
import assert from "node:assert/strict";
import { api, repo, findTracker } from "./github.mjs";
import { body, readState, transition, summarize } from "./model.mjs";
function publish(report, title = "MILOQEN 每周维护记录", knownIssue) {
  const issue = knownIssue || findTracker(title),
    previous = readState(issue?.body);
  const action = transition(previous, report);
  const state = {
    status: report.status,
    fingerprint: report.fingerprint,
    sha: report.sha,
    environment: report.environment,
    visual: report.visual,
    performance: report.performance,
    history: [
      ...(previous?.history || []),
      { date: report.date, status: report.status, runUrl: report.runUrl },
    ].slice(-52),
  };
  const text = body(report, state).replace(
    "\n\n<!-- miloqen-state:",
    "\n\n最近巡检：\n" +
      state.history
        .map((h) => `- ${h.date.slice(0, 10)} ${h.status} ${h.runUrl || ""}`)
        .join("\n") +
      "\n\n<!-- miloqen-state:",
  );
  assert(text.length < 60000, "Report too large");
  let current = issue;
  if (!current) {
    const r = api(`repos/${repo}/issues`, "POST", { title, body: text });
    if (!r.ok) throw Error("创建维护Issue失败");
    current = r.data;
  } else if (
    !api(`repos/${repo}/issues/${current.number}`, "PATCH", {
      body: text,
      state: action.state,
    }).ok
  )
    throw Error("更新维护Issue失败");
  // Only state transitions notify; never print or attach raw command/API logs.
  if (
    action.notify &&
    !api(`repos/${repo}/issues/${current.number}/comments`, "POST", {
      body: `@Loraine-Dev ${report.status === "alert" ? "巡检发现风险" : "上次异常已恢复"}。${title.includes("演练") ? "这是隔离的安全演练，不影响网站。" : ""}\n${report.runUrl || ""}`,
    }).ok
  )
    throw Error("通知评论失败");
  if (!issue && action.state === "closed")
    api(`repos/${repo}/issues/${current.number}`, "PATCH", { state: "closed" });
  return { issue: { ...current, body: text }, action };
}
await mkdir("artifacts/maintenance", { recursive: true });
let report;
try {
  report = JSON.parse(
    await readFile("artifacts/maintenance/report.json", "utf8"),
  );
} catch {
  report = summarize({
    checks: [
      {
        id: "inspection-infrastructure",
        ok: false,
        detail: "检查任务或报告产物失败；查看Actions运行记录",
      },
    ],
    runUrl: `https://github.com/${repo}/actions/runs/${process.env.GITHUB_RUN_ID || ""}`,
  });
}
// Only constrained structured fields from this repository's trusted schedule/trial.
assert(["ok", "pending", "alert"].includes(report.status));
assert(Array.isArray(report.checks) && report.checks.length < 100);
assert(Array.isArray(report.unknown) && report.unknown.length < 100);
const result = publish(report);
console.log("维护报告：" + result.issue.html_url);
if (process.env.MAINTENANCE_TRIAL === "true") {
  const title = "MILOQEN 维护告警安全演练（非生产故障）";
  const bad = summarize({
    checks: [
      { id: "isolated-fixture", ok: false, detail: "不修改网站的演练故障" },
    ],
    runUrl: report.runUrl,
  });
  const existing = findTracker(title);
  const count = (issue) =>
    api(`repos/${repo}/issues/${issue.number}`).data?.comments;
  const initialCount = existing ? count(existing) : 0;
  const a = publish(bad, title, existing);
  assert(a.action.notify);
  assert.equal(count(a.issue), initialCount + 1);
  const b = publish(bad, title, a.issue);
  assert(!b.action.notify);
  assert.equal(count(b.issue), initialCount + 1);
  const good = summarize({ checks: [], runUrl: report.runUrl });
  const c = publish(good, title, b.issue);
  assert(c.action.notify);
  const d = publish(good, title, c.issue);
  assert(!d.action.notify);
  assert.equal(count(d.issue), initialCount + 2);
  const final = api(`repos/${repo}/issues/${d.issue.number}`);
  assert(final.ok && final.data.state === "closed");
  await writeFile(
    "artifacts/maintenance/trial.json",
    JSON.stringify({
      issue: final.data.html_url,
      failureNotified: true,
      repeatedFailureDeduped: true,
      recoveryRecorded: true,
      repeatedRecoveryDeduped: true,
      closed: true,
      siteModified: false,
      deployed: false,
    }),
  );
  console.log(
    "PASS remote Issue fault/repeat/recovery/repeat verification: " +
      final.data.html_url,
  );
}
