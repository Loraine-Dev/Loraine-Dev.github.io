import { chromium } from "playwright";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
const base = process.env.SITE_URL || "http://127.0.0.1:4177/";
const out = "artifacts/production-ui";
await mkdir(out, { recursive: true });
const browser = await chromium.launch({
  args: ["--enable-unsafe-swiftshader"],
});
const report = { base, pages: [], errors: [], physicalPhone: false };
const parameters = [
  "",
  "?debugMotion=1&motionMode=all&artStudy=light&study=on",
  "?debug=1&stats=1&shader=1&test=1&motionCompare=static",
  "?debugMotion=1&motionMode=off&effects=none&camera=off&pointer=off",
];
try {
  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 390, height: 844 },
  ]) {
    const context = await browser.newContext({
        viewport,
        reducedMotion: "no-preference",
      }),
      page = await context.newPage();
    page.on("pageerror", (e) => report.errors.push(e.message));
    for (const route of [
      "",
      "works/",
      "philosophy/",
      "about/",
      "journal/",
      "contact/",
      "404.html",
    ])
      for (const query of parameters) {
        const requests = [];
        const record = (r) => requests.push(r.url());
        page.on("request", record);
        await page.goto(base + route + query, { waitUntil: "networkidle" });
        assert.equal(
          await page
            .locator(
              "#motion-compare,#motion-debug,#godray-controls,#art-study,[data-test-marker],.stats-panel,.lil-gui,.dg.main",
            )
            .count(),
          0,
          "production must not mount any developer panel",
        );
        const text = await page.locator("body").innerText();
        assert.doesNotMatch(
          text,
          /仅丁达尔光|仅水面|仅云雾|全部关闭|正常动态|动画诊断|临时调试|测试夹具|占位测试/,
        );
        assert(
          !requests.some((u) =>
            /\/src\/dev\/|motion-debug\.|motion-compare\.|art-study\./.test(u),
          ),
          "no development module request",
        );
        assert.equal(await page.locator("h1").count(), 1);
        assert(await page.locator(".small-brand").isVisible());
        if (!route) {
          await page
            .locator(".local-material[data-effect=water][data-state=ready]")
            .waitFor({ state: "attached" });
          await page
            .locator(".local-material[data-effect=light][data-state=ready]")
            .waitFor({ state: "attached" });
          assert.equal(
            await page.locator(".cloud-billow").count(),
            4,
            "debug URL cannot disable production clouds",
          );
          assert.equal(
            await page.locator(".local-material[data-running=true]").count(),
            2,
            "debug URL cannot disable production local materials",
          );
          assert(
            await page.locator("#motion-toggle").isVisible(),
            "keep the user pause control",
          );
          const before = await page
            .locator(".world-layer")
            .getAttribute("style");
          await page.mouse.wheel(0, 300);
          await page.waitForFunction(
            () =>
              document.querySelector("#world-canvas").dataset.state === "live",
          );
          await page.waitForTimeout(180);
          assert.notEqual(
            await page.locator(".world-layer").getAttribute("style"),
            before,
            "debug URL cannot disable production camera traversal",
          );
        }
        if (query === "")
          await page.screenshot({
            path: `${out}/${route.replace("/", "").replace(".html", "") || "home"}-${viewport.width}.png`,
            fullPage: true,
          });
        report.pages.push({ route, query, viewport, ok: true });
        page.off("request", record);
      }
    await context.close();
  }
  const reduced = await browser.newContext({ reducedMotion: "reduce" }),
    page = await reduced.newPage();
  await page.goto(base + "?debugMotion=1&motionMode=all", {
    waitUntil: "networkidle",
  });
  assert.equal(await page.locator("#motion-debug,#motion-compare").count(), 0);
  assert.equal(
    await page.locator(".local-material[data-running=true]").count(),
    0,
  );
  assert(await page.locator("#motion-toggle").isDisabled());
  await reduced.close();
  if (process.env.DEV_URL) {
    const dev = await browser.newPage();
    await dev.goto(process.env.DEV_URL + "?debugMotion=1");
    await dev.locator("#motion-debug").waitFor();
    await dev.goto(process.env.DEV_URL + "?motionMode=all");
    await dev.locator("#motion-compare").waitFor();
    await dev.close();
  }
  assert.deepEqual(report.errors, []);
  console.log(
    `PASS ${report.pages.length} production route/viewport/query checks; debug UI absent, default dynamics intact, reduced motion respected.`,
  );
} finally {
  await writeFile(out + "/report.json", JSON.stringify(report, null, 2));
  await browser.close();
}
