import { readFile, writeFile } from "node:fs/promises";
const data = JSON.parse(
  (
    await readFile(new URL("../src/data/site.json", import.meta.url), "utf8")
  ).replace(/^\uFEFF/, ""),
);
const escape = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
let html = await readFile(new URL("../src/page.html", import.meta.url), "utf8");
html = html.replace(/\{\{([\w.]+)\}\}/g, (_, key) => {
  const v = key.split(".").reduce((o, k) => o?.[k], data);
  if (v === undefined) throw new Error(`Missing content: ${key}`);
  return (Array.isArray(v) ? v : [v]).map(escape).join("<br>");
});
await writeFile(new URL("../index.html", import.meta.url), html);
console.log("Static HTML rendered from src/data/site.json");
