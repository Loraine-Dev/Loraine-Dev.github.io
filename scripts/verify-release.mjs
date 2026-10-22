import { readFile, readdir, stat } from "node:fs/promises";
import { resolve, relative, join } from "node:path";
import assert from "node:assert/strict";
const root = resolve("dist"),
  origin = "https://loraine-dev.github.io";
async function walk(dir) {
  const result = [];
  for (const f of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, f.name);
    result.push(...(f.isDirectory() ? await walk(p) : [p]));
  }
  return result;
}
const files = await walk(root),
  html = files.filter((p) => p.endsWith(".html"));
// Audit the emitted application, not just the HTML or CSS visibility.
for (const path of files.filter((p) => /\.(?:html|js|css)$/.test(p))) {
  const text = await readFile(path, "utf8");
  assert(
    !/motion-compare|motion-debug|godray-controls|art-study|动画诊断|仅开发模式/.test(
      text,
    ),
    `Developer UI shipped in ${relative(root, path)}`,
  );
}
let checked = 0;
async function target(ref, from) {
  if (/^(https?:|mailto:|data:|#|javascript:)/i.test(ref)) return;
  const base = origin + "/" + relative(root, from).replaceAll("\\", "/");
  const url = new URL(ref, base);
  if (url.origin !== origin) return;
  let path = resolve(root, "." + decodeURIComponent(url.pathname));
  assert(!relative(root, path).startsWith(".."));
  let info;
  try {
    info = await stat(path);
  } catch {
    throw Error(`Missing ${ref} in ${relative(root, from)}`);
  }
  if (info.isDirectory()) await stat(join(path, "index.html"));
  checked++;
}
for (const path of html) {
  const text = await readFile(path, "utf8");
  assert(
    !/\/src\/|id="motion-compare"|id="motion-debug"/.test(text),
    "development entry in build",
  );
  for (const m of text.matchAll(/\b(?:src|href)="([^"]+)"/g))
    await target(m[1], path);
  for (const m of text.matchAll(/\bsrcset="([^"]+)"/g))
    for (const src of m[1].split(","))
      await target(src.trim().split(/\s+/)[0], path);
}
for (const name of [
  ".nojekyll",
  "sitemap.xml",
  "robots.txt",
  "404.html",
  "works/index.html",
  "philosophy/index.html",
  "about/index.html",
  "journal/index.html",
  "contact/index.html",
])
  await stat(join(root, name));
assert(
  !files.some((p) => relative(root, p).startsWith("review")),
  "review tools must not ship",
);
console.log(
  JSON.stringify(
    {
      status: "PASS",
      html: html.length,
      files: files.length,
      localReferences: checked,
      target: "GitHub user root site",
      note: "Static integrity only; remote Pages execution and art approval are separate.",
    },
    null,
    2,
  ),
);
