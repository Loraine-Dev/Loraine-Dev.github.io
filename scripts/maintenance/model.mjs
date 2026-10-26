import { createHash } from "node:crypto";
export const median = (values) =>
  [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
export const visualDifference = (a, b) =>
  a.length === b.length
    ? a.reduce((s, v, i) => s + Math.abs(v - b[i]), 0) / (a.length * 255)
    : 1;
export const performanceRegression = (samples, before) =>
  samples.length >= 3 &&
  before > 0 &&
  median(samples) > before * 1.5 &&
  median(samples) > before + 500;

export function auditCheck(audit, outcome) {
  const v = audit?.metadata?.vulnerabilities;
  const levels = ["info", "low", "moderate", "high", "critical"];
  const valid =
    audit?.auditReportVersion === 2 &&
    !audit.error &&
    audit.vulnerabilities &&
    typeof audit.vulnerabilities === "object" &&
    !Array.isArray(audit.vulnerabilities) &&
    v &&
    [...levels, "total"].every(
      (k) => Number.isSafeInteger(v[k]) && v[k] >= 0,
    ) &&
    levels.reduce((total, k) => total + v[k], 0) === v.total &&
    (v.total !== 0 || Object.keys(audit.vulnerabilities).length === 0);
  if (!valid)
    return {
      ok: false,
      detail: "npm audit结果缺失、无效或服务不可用；无法确认依赖安全",
    };
  if (v.total > 0)
    return {
      ok: false,
      detail: `已知漏洞合计 ${v.total}（低${v.low}、中等${v.moderate}、高${v.high}、严重${v.critical}）`,
    };
  return {
    ok: outcome === "success",
    detail:
      outcome === "success"
        ? "有效审计报告：已知漏洞合计 0"
        : "审计命令未成功，零值报告不能作为通过依据",
  };
}

export function summarizeMainFailures(
  runs,
  { now = Date.now(), currentRunId } = {},
) {
  const recent = runs.filter(
    (r) =>
      r.head_branch === "main" &&
      String(r.id) !== String(currentRunId) &&
      Date.parse(r.created_at) > now - 7 * 86400000,
  );
  const failures = recent.filter((r) =>
    ["failure", "timed_out", "startup_failure", "action_required"].includes(
      r.conclusion,
    ),
  );
  const maintenance = failures.filter(
    (r) => r.path === ".github/workflows/weekly-maintenance.yml",
  );
  const recovered = [],
    unresolved = [];
  for (const failure of failures.filter((r) => !maintenance.includes(r))) {
    const succeededLater = recent.some(
      (r) =>
        r.conclusion === "success" &&
        r.status === "completed" &&
        Date.parse(r.created_at) > Date.parse(failure.created_at) &&
        (failure.workflow_id != null
          ? r.workflow_id === failure.workflow_id
          : failure.path && r.path === failure.path),
    );
    (succeededLater ? recovered : unresolved).push(failure);
  }
  // Retain prior maintenance alerts as history. Re-alerting on this workflow's own
  // alert would perpetuate it forever; current audit/build/browser/live checks
  // independently decide whether the underlying risk is still present.
  const ids = (items) =>
    items
      .slice(0, 5)
      .map((r) => r.id)
      .join(",") || "无";
  return {
    ok: unresolved.length === 0,
    total: failures.length,
    recovered,
    unresolved,
    maintenance,
    detail: `近7天失败 ${failures.length}；未恢复 ${unresolved.length}（${ids(unresolved)}）；同工作流后续成功已恢复 ${recovered.length}（${ids(recovered)}）；巡检历史 ${maintenance.length}（${ids(maintenance)}），风险由本轮检查单独判断`,
  };
}
export function summarize({
  checks = [],
  unknown = [],
  unreleased = false,
  ...data
}) {
  const failures = checks.filter((c) => !c.ok);
  const status = failures.length
    ? "alert"
    : unknown.length || unreleased
      ? "pending"
      : "ok";
  const fingerprint = createHash("sha256")
    .update(
      JSON.stringify({
        status,
        failed: failures.map((c) => c.id).sort(),
        unknown: [...unknown].sort(),
      }),
    )
    .digest("hex")
    .slice(0, 16);
  const text =
    status === "ok"
      ? "本周检查正常"
      : status === "alert"
        ? "发现需要检查的风险"
        : "待上线或部分项目尚未验证";
  return {
    ...data,
    date: new Date().toISOString(),
    checks,
    unknown,
    unreleased,
    status,
    fingerprint,
    text,
  };
}
export function transition(previous, report) {
  return {
    notify:
      (report.status === "alert" &&
        previous?.fingerprint !== report.fingerprint) ||
      (previous?.status === "alert" && report.status !== "alert"),
    state: report.status === "alert" ? "open" : "closed",
  };
}
export function body(report, state) {
  return `<!-- miloqen-weekly-health:v1 -->\n${report.text}\n\n检查日期：${new Date(report.date).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })}（北京时间）\n\n运行记录：${report.runUrl || "本地演练"}\n\n${report.checks.map((c) => `- ${c.ok ? "通过" : "风险"}：${c.id} — ${c.detail || ""}`).join("\n")}\n${report.unknown.map((s) => `- 尚未验证：${s}`).join("\n")}\n\n性能为GitHub runner浏览器三次样本的中位数/范围，非真机或Lighthouse认证。截图只比较明显回归，不代表艺术验收。\n\n建议：${report.status === "alert" ? "打开Codex并要求处理本Issue；在独立分支修复、测试并提交PR，等待人工合并。" : "保持现有版本；未首次上线项目在批准后补验。"}\n\n<!-- miloqen-state:${Buffer.from(JSON.stringify(state)).toString("base64")} -->`;
}
export function readState(bodyText = "") {
  try {
    const encoded = bodyText.match(
      /<!-- miloqen-state:([A-Za-z0-9+/=]+) -->/,
    )?.[1];
    if (!encoded || encoded.length > 50000) return null;
    return JSON.parse(Buffer.from(encoded, "base64").toString("utf8"));
  } catch {
    return null;
  }
}
