import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, cp, mkdir, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
test("content rehearsal generates and withdraws an article without touching live content", async () => {
  const dir = await mkdtemp(join(tmpdir(), "miloqen-maintenance-"));
  try {
    await mkdir(join(dir, "scripts"), { recursive: true });
    await cp("scripts/site", join(dir, "scripts/site"), { recursive: true });
    await cp("scripts/render.mjs", join(dir, "scripts/render.mjs"));
    await cp("src/data", join(dir, "src/data"), { recursive: true });
    await cp("src/page.html", join(dir, "src/page.html"));
    await mkdir(join(dir, "content/journal"), { recursive: true });
    const source = join(dir, "content/journal/rehearsal.md");
    await writeFile(
      source,
      "---\n" +
        JSON.stringify({
          title: "仅演练：内容更新",
          summary: "临时目录夹具，不对外发布",
          date: "2026-10-21",
          published: true,
        }) +
        "\n---\n## 正文\n\n测试维护流程。",
    );
    const site = JSON.parse(
      await readFile(join(dir, "src/data/site.json"), "utf8"),
    );
    site.brand.tagline = "仅演练的宣言";
    await writeFile(join(dir, "src/data/site.json"), JSON.stringify(site));
    const build = () =>
      execFileSync(process.execPath, [join(dir, "scripts/render.mjs")]);
    build();
    assert.match(
      await readFile(join(dir, "journal/rehearsal/index.html"), "utf8"),
      /仅演练：内容更新/,
    );
    assert.match(
      await readFile(join(dir, "index.html"), "utf8"),
      /仅演练的宣言/,
    );
    assert.match(
      await readFile(join(dir, "public/sitemap.xml"), "utf8"),
      /journal\/rehearsal/,
    );
    await writeFile(
      source,
      (await readFile(source, "utf8")).replace(
        '"published":true',
        '"published":false',
      ),
    );
    build();
    await assert.rejects(readFile(join(dir, "journal/rehearsal/index.html")), {
      code: "ENOENT",
    });
    assert.doesNotMatch(
      await readFile(join(dir, "public/sitemap.xml"), "utf8"),
      /journal\/rehearsal/,
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
