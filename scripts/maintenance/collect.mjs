import { mkdir, readFile, writeFile } from "node:fs/promises";
import { appendFileSync } from "node:fs";
import { api, repo, findTracker } from "./github.mjs";
import { summarize, readState } from "./model.mjs";
import { probe } from "./probe.mjs";
import { checkOnline } from "./online.mjs";
const checks = [],
  unknown = [];
const check = (id, ok, detail = "") => checks.push({ id, ok, detail });
await mkdir("artifacts/maintenance", { recursive: true });
for (const id of ["build", "security", "browser"])
  if (process.env["RESULT_" + id.toUpperCase()])
    check(
      id,
      process.env["RESULT_" + id.toUpperCase()] === "success",
      "现有完整检查，详见运行记录",
    );
try {
  const audit = JSON.parse(
    (await readFile("artifacts/maintenance/audit.json", "utf8")).replace(
      /^\uFEFF/,
      "",
    ),
  );
  check(
    "npm-audit",
    audit.metadata?.vulnerabilities?.total === 0,
    `已知漏洞合计 ${audit.metadata?.vulnerabilities?.total ?? "未知"}`,
  );
} catch {
  unknown.push("npm audit服务不可用或结果缺失");
}
let previous = {};
try {
  previous = readState(findTracker()?.body) || {};
} catch {
  unknown.push("维护历史Issue读取失败");
}
const response = (path) => api(`repos/${repo}/${path}`);
const branch = response("branches/main");
if (branch.ok)
  check(
    "main-protected",
    branch.data.protected === true,
    "只检查、不写入保护设置",
  );
else unknown.push("main保护读取不可用");
const permissions = response("actions/permissions/workflow");
if (permissions.ok)
  check(
    "workflow-permissions",
    permissions.data.default_workflow_permissions === "read" &&
      !permissions.data.can_approve_pull_request_reviews,
    "默认只读、禁止自动批准",
  );
else unknown.push("仓库级Actions权限需所有者核实");
const alerts = response("dependabot/alerts?state=open&per_page=100");
if (alerts.ok)
  check(
    "dependabot-alerts",
    alerts.data.length === 0,
    `开放告警 ${alerts.data.length}${alerts.data.length === 100 ? "+" : ""}，不公开漏洞详情`,
  );
else
  unknown.push(
    "GITHUB_TOKEN无Dependabot告警读取权限；由GitHub原生告警通知所有者，不扩权",
  );
const runs = response("actions/runs?per_page=100");
if (runs.ok) {
  const failed = runs.data.workflow_runs.filter(
    (r) =>
      r.head_branch === "main" &&
      ["failure", "timed_out"].includes(r.conclusion) &&
      Date.parse(r.created_at) > Date.now() - 7 * 86400000,
  );
  check(
    "recent-main-actions",
    failed.length === 0,
    `近7天main失败运行 ${failed.length}`,
  );
} else unknown.push("Actions历史读取不可用");
const pages = response("pages");
if (pages.ok)
  check(
    "pages-config",
    pages.data.build_type === "workflow" && pages.data.https_enforced === true,
    "官方workflow构建、HTTPS",
  );
else unknown.push("Pages配置读取不可用");
const deploys = response("deployments?environment=github-pages&per_page=1");
if (deploys.ok && deploys.data.length) {
  const s = response(`deployments/${deploys.data[0].id}/statuses?per_page=1`);
  if (s.ok && s.data.length)
    check(
      "last-pages-deployment",
      s.data[0].state === "success",
      `最近Pages状态 ${s.data[0].state}`,
    );
  else unknown.push("最新Pages部署状态未读取");
}
const changes = previous.sha
  ? api(
      `repos/${repo}/compare/${previous.sha}...${process.env.GITHUB_SHA || "HEAD"}`,
    )
  : null;
if (changes?.ok) {
  const paths =
    changes.data.files
      ?.filter((f) => f.filename.startsWith(".github/workflows/"))
      .map((f) => f.filename) || [];
  if (paths.length)
    unknown.push(
      "自上次检查工作流有改动，需人工复核：" + paths.slice(0, 10).join("、"),
    );
}
let sampled = {};
try {
  sampled = await probe(
    previous,
    process.env.ACCEPT_VISUAL_BASELINE === "true",
  );
  checks.push(...sampled.checks);
  unknown.push(...sampled.unknown);
} catch {
  check("visual-performance-probe", false, "截图/性能采样失败，查看运行记录");
}
const unreleased = process.env.PUBLICATION_APPROVED !== "true";
if (unreleased)
  unknown.push("尚未批准首次上线，公网可用性检查待启用；没有把预期404报为正常");
else
  try {
    const online = await checkOnline();
    check(
      "live-site",
      online.ok,
      online.ok
        ? "HTTPS、六页、资源和内部链接正常"
        : `异常路径 ${online.failedPaths.join("、")}`,
    );
  } catch {
    check("live-site", false, "公网访问超时或TLS/加载异常");
  }
const report = summarize({
  checks,
  unknown,
  unreleased,
  environment: sampled.environment,
  visual: sampled.visual || {},
  performance: sampled.performance || {},
  sha: process.env.GITHUB_SHA || "",
  runUrl: `https://github.com/${repo}/actions/runs/${process.env.GITHUB_RUN_ID || ""}`,
});
await writeFile("artifacts/maintenance/report.json", JSON.stringify(report));
const summary = `# MILOQEN 每周巡检\n\n${report.text}\n\n${checks.map((c) => `- ${c.ok ? "通过" : "风险"} ${c.id}：${c.detail}`).join("\n")}\n\n${unknown.map((s) => "- 尚未验证：" + s).join("\n")}\n\n不修改源码、不部署；截图不是艺术验收，性能不是真机认证。`;
await writeFile("artifacts/maintenance/summary.md", summary);
if (process.env.GITHUB_STEP_SUMMARY)
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary);
console.log(
  report.text +
    "；通过 " +
    checks.filter((c) => c.ok).length +
    "/" +
    checks.length +
    "，未验证 " +
    unknown.length,
);
