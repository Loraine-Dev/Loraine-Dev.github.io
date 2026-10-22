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
