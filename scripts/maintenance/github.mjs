import { execFileSync } from "node:child_process";
export const repo =
  process.env.GITHUB_REPOSITORY || "Loraine-Dev/Loraine-Dev.github.io";
export function api(path, method = "GET", body) {
  try {
    const args = ["api", path, "--method", method];
    if (body) args.push("--input", "-");
    const text = execFileSync("gh", args, {
      input: body ? JSON.stringify(body) : undefined,
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
      maxBuffer: 4 * 1024 * 1024,
    });
    return { ok: true, data: text.trim() ? JSON.parse(text) : null };
  } catch {
    return { ok: false, data: null };
  } // Never emit raw API errors, credentials or headers.
}
export function findTracker(title = "MILOQEN 每周维护记录") {
  for (let page = 1; page <= 10; page++) {
    const result = api(
      `repos/${repo}/issues?state=all&per_page=100&page=${page}&sort=updated&direction=desc`,
    );
    if (!result.ok) throw Error("Issue读取失败");
    const found = result.data.find(
      (i) =>
        !i.pull_request &&
        i.title === title &&
        i.user?.login === "github-actions[bot]" &&
        i.body?.includes("<!-- miloqen-weekly-health:v1 -->"),
    );
    if (found) return found;
    if (result.data.length < 100) return null;
  }
  throw Error("Issue列表超出安全扫描范围，拒绝创建重复记录");
}
