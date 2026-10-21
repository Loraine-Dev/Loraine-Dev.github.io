import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { footer } from "../scripts/site/components.mjs";
import { innerContent } from "../scripts/site/pages.mjs";
import { renderMarkdown } from "../scripts/site/markdown.mjs";

test("official GitHub destinations reject script schemes, spoofed hosts and attribute injection", () => {
  for (const github of [
    "javascript:alert(1)",
    "https://github.com.evil.invalid/Loraine-Dev",
    "https://evil@github.com/Loraine-Dev",
    'https://github.com/Loraine-Dev" onmouseover="alert(1)',
  ]) {
    assert.throws(() =>
      footer("./", {
        brand: { name: "弥洛生", english: "MILOQEN", tagline: "test" },
        github,
      }),
    );
    assert.throws(() =>
      innerContent(
        "contact",
        { github },
        [],
        { contact: { title: "联系", intro: "", note: "" } },
        [],
      ),
    );
  }
  assert.match(
    footer("./", { brand: {}, github: "https://github.com/Loraine-Dev" }),
    /rel="noopener noreferrer"/,
  );
});

test("Markdown hostile HTML and encoded script links stay inert", () => {
  const html = renderMarkdown(
    '<img src=x onerror=alert(1)>\n\n[x](javascript:alert)\n\n[x](data:text/html,test)\n\n[x](https://example.org/"onclick="alert)',
  );
  assert.doesNotMatch(html, /<img|href="(?:javascript|data):|"onclick="/i);
});

test("all production HTML carries early enforcing CSP and no external scripts", async () => {
  for (const route of [
    "index.html",
    "works/index.html",
    "philosophy/index.html",
    "about/index.html",
    "journal/index.html",
    "contact/index.html",
    "404.html",
  ]) {
    const html = await readFile("dist/" + route, "utf8");
    const policy = html.match(
      /<meta http-equiv="Content-Security-Policy" content="([^"]+)"/,
    );
    assert(policy, route + " lacks CSP");
    assert.match(policy[1], /script-src 'self'/);
    assert.doesNotMatch(
      policy[1],
      /script-src[^;]*(?:unsafe-inline|unsafe-eval)|frame-ancestors|report-uri/,
    );
    assert(
      html.indexOf(policy[0]) < html.indexOf("<script"),
      route + " late CSP",
    );
    assert.doesNotMatch(html, /<script[^>]*src="https?:/i);
  }
});

test("CI keeps immutable actions, no persisted checkout credentials, and no privileged PR events", async () => {
  const workflow = await readFile(".github/workflows/pages.yml", "utf8");
  for (const match of workflow.matchAll(/uses:\s+(\S+)/g))
    assert.match(match[1], /^actions\/[\w-]+@[a-f0-9]{40}$/);
  assert.match(workflow, /persist-credentials: false/);
  assert.doesNotMatch(
    workflow,
    /pull_request_target|write-all|secrets\.|gh pr (?:merge|review)/,
  );
  assert.match(workflow, /needs: check/);
  assert.match(workflow, /MILOQEN_PAGES_APPROVED == 'true'/);
  assert.match(workflow, /npm run test:security/);
  assert.match(workflow, /npm audit --audit-level=low/);
});
