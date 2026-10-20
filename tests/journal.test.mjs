import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
test("journal publishes only explicit real posts, orders dates, rejects invalid metadata", async () => {
  const { loadJournal } = await import("../scripts/site/journal.mjs");
  const dir = await mkdtemp(join(tmpdir(), "miloqen-journal-"));
  try {
    const article = (date, published = true) =>
      `---\n${JSON.stringify({ title: "测试标题", summary: "仅测试夹具，不发布到站点", date, published })}\n---\n## 正文\n\n<script>x</script>`;
    await writeFile(join(dir, "first.md"), article("2026-10-19"));
    await writeFile(join(dir, "second.md"), article("2026-10-20"));
    await writeFile(join(dir, "draft.md"), article("2026-10-20", false));
    const posts = await loadJournal(dir);
    assert.deepEqual(
      posts.map((p) => p.slug),
      ["second", "first"],
    );
    assert.doesNotMatch(posts[0].html, /<script>/);
    await writeFile(join(dir, "bad.md"), article("2026-02-31"));
    await assert.rejects(() => loadJournal(dir), /Invalid metadata/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
