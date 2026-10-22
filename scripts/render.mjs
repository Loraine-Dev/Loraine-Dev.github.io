import { loadJournal } from "./site/journal.mjs";
import { readFile, writeFile, mkdir, unlink } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { escape as e } from "./site/markdown.mjs";
import { routes, navigation, footer, meta } from "./site/components.mjs";
import { homeContent, innerContent } from "./site/pages.mjs";
const root = fileURLToPath(new URL("../", import.meta.url));
const read = (p) => readFile(resolve(root, p), "utf8");
const json = async (p) => JSON.parse((await read(p)).replace(/^\uFEFF/, ""));
const data = await json("src/data/site.json"),
  works = await json("src/data/works.json"),
  copy = await json("src/data/editorial.json");
const write = async (path, content) => {
  await mkdir(resolve(root, path, ".."), { recursive: true });
  await writeFile(resolve(root, path), content.replace(/[\t ]+$/gm, ""));
};
const posts = await loadJournal(resolve(root, "content/journal"));
const journalFiles = posts.map((p) => "journal/" + p.slug + "/index.html");
let previous = [];
try {
  previous = JSON.parse(await read(".generated-journal.json"));
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}
for (const old of previous) {
  if (!/^journal\/[a-z0-9]+(?:-[a-z0-9]+)*\/index\.html$/.test(old))
    throw Error("Invalid generated journal path");
  if (!journalFiles.includes(old))
    await unlink(resolve(root, old)).catch((error) => {
      if (error.code !== "ENOENT") throw error;
    });
}
await write(
  ".generated-journal.json",
  JSON.stringify(journalFiles, null, 2) + "\n",
);
let home = await read("src/page.html");
home = home.replace(/\{\{([\w.]+)\}\}/g, (_, key) => {
  const value = key.split(".").reduce((o, k) => o?.[k], data);
  if (value === undefined) throw Error(key);
  return e(value);
});
home = home
  .replace(/<meta\s+name="description"[\s\S]*?\/>/, "")
  .replace(
    /<title>[\s\S]*?<\/title>/,
    meta(
      "弥洛生 MILOQEN — 让想象拥有生命。",
      "弥洛生 MILOQEN，原创游戏与互动艺术。探索品牌概念世界，了解策划中的原创节奏游戏《奇妙拍档》。",
    ),
  )
  .replace(/<meta name="robots" content="noindex,nofollow"\s*\/>/, "")
  .replace(
    /<header class="world-header">[\s\S]*?<\/header>/,
    navigation("./", "", true),
  )
  .replace(
    '<main class="world-experience"',
    '<main id="main"><section aria-label="星门之外的世界树" class="world-experience"',
  )
  .replace(
    "</main>",
    `</section>${homeContent(copy, works[0])}</main>${footer("./", data)}`,
  )
  .replace('href="#beyond">跳至世界探索', 'href="#content">跳至网站内容');
await write("index.html", home);
const shell = (
  route,
  title,
  description,
  content,
  base = "../",
  paper = false,
) =>
  `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="${paper ? "#eae5db" : "#070b12"}">${meta(title, description, route ? route + "/" : "")}<link rel="icon" href="${base}images/mark.svg" type="image/svg+xml"><script type="module" src="/src/site-entry.ts"></script></head><body class="editorial-page ${paper ? "paper-page" : ""} ${route}-page" id="top"><a class="skip" href="#main">跳至正文</a>${navigation(base, route)}<main id="main" class="editorial-main content-width">${content}</main>${footer(base, data)}</body></html>`;
for (const [route, zh] of routes.slice(1))
  await write(
    `${route}/index.html`,
    shell(
      route,
      `${zh} — 弥洛生 MILOQEN`,
      route === "works"
        ? "《奇妙拍档》，策划与研究中的原创节奏游戏，计划平台手机与 PC。"
        : copy[route]?.intro || "弥洛生 MILOQEN",
      innerContent(route, data, works, copy, posts),
      "../",
      ["philosophy", "journal"].includes(route),
    ),
  );
for (const post of posts)
  await write(
    `journal/${post.slug}/index.html`,
    shell(
      `journal/${post.slug}`,
      `${post.title} — MILOQEN JOURNAL`,
      post.summary,
      `<article class="journal-article"><a class="text-link" href="../">← 所有创作记录</a><p class="section-label"><time datetime="${post.date}">${post.date}</time> / JOURNAL</p><h1>${e(post.title)}</h1><p class="lead">${e(post.summary)}</p><div class="prose">${post.html}</div></article>`,
      "../../",
      true,
    ),
  );
await write(
  "404.html",
  shell(
    "404",
    "未找到页面 — MILOQEN",
    "返回弥洛生官方网站。",
    innerContent("404", data, works, copy, posts),
    "/",
  )
    .replace('content="index,follow"', 'content="noindex,follow"')
    .replace(
      "https://loraine-dev.github.io/404/",
      "https://loraine-dev.github.io/404.html",
    ),
);
await write(
  "public/sitemap.xml",
  `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${[...routes.map(([r]) => (r ? r + "/" : "")), ...posts.map((p) => "journal/" + p.slug + "/")].map((p) => `<url><loc>https://loraine-dev.github.io/${p}</loc></url>`).join("")}</urlset>`,
);
await write(
  "public/robots.txt",
  "User-agent: *\nAllow: /\nSitemap: https://loraine-dev.github.io/sitemap.xml\n",
);
console.log(
  `Rendered 6 pages, 404, sitemap and ${posts.length} real journal articles.`,
);
