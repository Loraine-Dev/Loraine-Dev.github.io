import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
// Deliberately output only counts/paths, never matched credential material.
// Signature scanning is not a guarantee that arbitrary secrets are absent.
const signatures = [
  new RegExp("-----BEGIN (?:RSA |EC |OPENSSH )?" + "PRIVATE KEY-----"),
  new RegExp("gh" + "[pousr]_[A-Za-z0-9]{36,}"),
  new RegExp("github_" + "pat_[A-Za-z0-9_]{40,}"),
  new RegExp("AK" + "IA[0-9A-Z]{16}"),
];
const files = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" })
  .split("\0")
  .filter(Boolean);
const textFiles = files.filter(
  (p) =>
    /\.(?:[cm]?js|ts|html|css|json|ya?ml|md|txt|xml|env|pem|key)$/.test(p) ||
    /(?:^|\/)\.env(?:\.|$)/.test(p),
);
const findings = [];
for (const file of textFiles) {
  const source = await readFile(file, "utf8");
  if (signatures.some((r) => r.test(source))) findings.push(file);
}
assert.equal(
  findings.length,
  0,
  "Potential credentials in tracked files: " + findings.join(", "),
);
assert(
  !files.some((p) =>
    /(?:^|\/)(?:\.env(?:\.(?!example$)[^/]+)?|id_rsa|id_ed25519|credentials\.json)$/.test(
      p,
    ),
  ),
  "Private configuration tracked",
);
const lock = JSON.parse(await readFile("package-lock.json", "utf8"));
for (const [name, pkg] of Object.entries(lock.packages || {}))
  if (name && pkg.resolved) {
    assert.match(
      pkg.resolved,
      /^https:\/\/registry\.npmjs\.org\//,
      "Unexpected dependency registry: " + name,
    );
    assert(pkg.integrity, "Missing integrity: " + name);
  }
console.log(
  `PASS security signatures in ${textFiles.length} tracked text files; registry/integrity lockfile checks. Not a comprehensive secret detector.`,
);
if (process.argv.includes("--history")) {
  const refs = execFileSync("git", ["rev-list", "--all"], { encoding: "utf8" })
    .trim()
    .split("\n");
  const pattern = [
    "-----BEGIN [A-Z ]*" + "PRIVATE KEY-----",
    "gh" + "[pousr]_[A-Za-z0-9]{36,}",
    "github_" + "pat_[A-Za-z0-9_]{40,}",
    "AK" + "IA[0-9A-Z]{16}",
  ].join("|");
  // -l emits only filenames, never matching source or credential values.
  try {
    const matches = execFileSync(
      "git",
      ["grep", "-I", "-l", "-E", "-e", pattern, ...refs],
      { encoding: "utf8", maxBuffer: 4 * 1024 * 1024 },
    );
    assert(
      !matches.trim(),
      "Potential historical secret signatures; inspect privately without printing matches",
    );
  } catch (error) {
    if (error.status !== 1) throw error;
  }
  console.log(
    `PASS historical signature scan: ${refs.length} reachable commits; no matching credential values printed or saved. Limited signature coverage.`,
  );
}
