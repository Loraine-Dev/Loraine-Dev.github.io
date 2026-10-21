import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
test("all six content routes have canonical, title, main and shared navigation", async () => {
  for (const route of [
    "",
    "works/",
    "philosophy/",
    "about/",
    "journal/",
    "contact/",
  ]) {
    const html = await readFile(`${route}index.html`, "utf8");
    assert.match(html, /rel="canonical"/);
    assert.match(html, /aria-label="主导航"/);
    assert.match(html, /<main[ >]/);
    assert.doesNotMatch(html, /noindex,nofollow/);
  }
});
test("works is honest and journal reflects published content files", async () => {
  const html = await readFile("works/index.html", "utf8");
  assert.match(html, /In Planning/);
  assert.match(html, /尚未正式进入游戏开发/);
  assert.doesNotMatch(html, /下载游戏|立即试玩|已获奖/);
  const { loadJournal } = await import("../scripts/site/journal.mjs");
  const posts = await loadJournal("content/journal");
  const journal = await readFile("journal/index.html", "utf8");
  if (posts.length === 0) assert.match(journal, /尚无公开记录/);
  else {
    assert.doesNotMatch(journal, /class="journal-empty"/);
    for (const post of posts)
      assert(journal.includes(`href="./${post.slug}/"`));
  }
});
test("markdown escapes raw HTML and blocks unsafe link schemes", async () => {
  const { renderMarkdown } = await import("../scripts/site/markdown.mjs");
  const result = renderMarkdown(
    "# 标题\n\n<script>alert(1)</script>\n\n[坏链接](javascript:alert)\n\n[有效链接](https://github.com/Loraine-Dev)",
  );
  assert.match(result, /<h1>标题<\/h1>/);
  assert.doesNotMatch(result, /<script>|href="javascript:/);
  assert.match(result, /href="https:\/\/github.com\/Loraine-Dev"/);
});
