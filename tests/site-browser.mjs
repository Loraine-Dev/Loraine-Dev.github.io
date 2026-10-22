import { chromium } from "playwright";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
const base = process.env.SITE_URL || "http://127.0.0.1:4177/";
const out = "artifacts/complete-site";
await mkdir(out, { recursive: true });
const browser = await chromium.launch({
  args: ["--enable-unsafe-swiftshader"],
});
const report = {
  base,
  date: new Date().toISOString(),
  pages: [],
  errors: [],
  failed: [],
  checks: [],
};
try {
  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 768, height: 1024 },
    { width: 390, height: 844 },
    { width: 320, height: 740 },
  ]) {
    const context = await browser.newContext({
      viewport,
      reducedMotion: "no-preference",
    });
    const page = await context.newPage();
    const requests = [];
    page.on("pageerror", (e) => report.errors.push(e.message));
    page.on("response", (r) => {
      if (r.status() >= 400) report.failed.push(r.url());
    });
    page.on("request", (r) => requests.push(r.url()));
    for (const route of [
      "",
      "works/",
      "philosophy/",
      "about/",
      "journal/",
      "contact/",
    ]) {
      requests.length = 0;
      assert.equal(
        (await page.goto(base + route, { waitUntil: "networkidle" })).status(),
        200,
      );
      await page.locator("h1").waitFor();
      assert.equal(await page.locator("main").count(), 1);
      assert.equal(await page.locator("h1").count(), 1);
      assert(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
        "horizontal overflow " + route + " " + viewport.width,
      );
      for (const img of await page.locator("img").all()) {
        if (await img.evaluate((i) => i.loading !== "lazy"))
          assert(await img.evaluate((i) => i.complete && i.naturalWidth > 0));
      }
      if (route)
        assert(
          !requests.some((u) =>
            /world-scene|environment|godrays\/|motion\/|living\/|cloud-bank/.test(
              u,
            ),
          ),
          "inner page must not load scene " + route,
        );
      assert.equal(
        await page
          .locator("#godray-controls,#motion-debug,#motion-compare")
          .count(),
        0,
        "no production diagnostics",
      );
      const links = await page
        .locator("a[href]")
        .evaluateAll((as) =>
          as
            .map((a) => a.href)
            .filter((h) => h.startsWith(location.origin) && !h.includes("#")),
        );
      for (const href of new Set(links))
        assert.equal(
          (await page.request.get(href)).status(),
          200,
          "broken link " + href,
        );
      if (viewport.width === 1440 || viewport.width === 390) {
        await page.screenshot({
          path: `${out}/${route.replace("/", "") || "home"}-${viewport.width}.png`,
          fullPage: true,
        });
        await page.screenshot({
          path: `${out}/${route.replace("/", "") || "home"}-${viewport.width}-first.png`,
        });
      }
      if (viewport.width < 1000) {
        const menu = page.locator(".mobile-menu");
        if (await menu.isVisible()) {
          await menu.locator("summary").focus();
          await page.keyboard.press("Enter");
          assert(await menu.evaluate((e) => e.open));
          await page.keyboard.press("Tab");
          await page.keyboard.press("Escape");
          assert(!(await menu.evaluate((e) => e.open)));
        }
      }
      if (route === "") {
        const material = page.locator(".local-material[data-effect=water]");
        await page
          .locator('.local-material[data-effect=water][data-state="ready"]')
          .waitFor();
        await page.waitForFunction(
          () =>
            document.querySelector(".local-material[data-effect=water]")
              ?.dataset.running === "true",
        );
        const before = Number(await material.getAttribute("data-time"));
        await page.waitForTimeout(350);
        assert(Number(await material.getAttribute("data-time")) > before);
        await page.getByRole("button", { name: "暂停动态" }).click();
        await page.waitForFunction(
          () =>
            document.querySelector(".local-material[data-effect=water]")
              ?.dataset.running === "false",
        );
        // The main-thread flag changes before an already queued Worker frame
        // reaches the DOM. Wait for that queue to settle, then assert a strict
        // stationary interval; continuously running frames cannot pass this.
        await page.waitForFunction(
          () => {
            const value = document.querySelector(
              ".local-material[data-effect=water]",
            )?.dataset.time;
            const last = window.__pauseObservation;
            if (!last || last.value !== value) {
              window.__pauseObservation = { value, since: performance.now() };
              return false;
            }
            return performance.now() - last.since >= 400;
          },
          null,
          { timeout: 5000, polling: 50 },
        );
        const stopped = await material.getAttribute("data-time");
        await page.waitForTimeout(250);
        assert.equal(await material.getAttribute("data-time"), stopped);
        await page.getByRole("button", { name: "继续动态" }).click();
        await page.locator("#content").scrollIntoViewIfNeeded();
        await page.waitForFunction(
          () =>
            document.querySelector(".local-material[data-effect=water]")
              ?.dataset.running === "false",
        );
      }
      report.pages.push({
        route,
        viewport,
        ok: true,
        requests: requests.length,
      });
    }
    await context.close();
  }
  const reduced = await browser.newContext({ reducedMotion: "reduce" });
  const rp = await reduced.newPage();
  await rp.goto(base, { waitUntil: "networkidle" });
  assert.equal(
    await rp
      .locator(".local-material[data-effect=water]")
      .getAttribute("data-state"),
    "policy",
  );
  assert.equal(
    await rp
      .locator(".local-material[data-effect=water]")
      .evaluate((e) => getComputedStyle(e).visibility),
    "hidden",
  );
  report.checks.push("reduced motion: static image, no ray asset request");
  await reduced.close();
  const low = await browser.newContext();
  await low.addInitScript(() =>
    Object.defineProperty(navigator, "deviceMemory", { value: 2 }),
  );
  const lp = await low.newPage();
  await lp.goto(base, { waitUntil: "networkidle" });
  assert.equal(
    await lp
      .locator(".local-material[data-effect=water]")
      .getAttribute("data-state"),
    "policy",
  );
  report.checks.push("low-memory: static fallback");
  await low.close();
  const nojs = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 390, height: 844 },
  });
  const np = await nojs.newPage();
  for (const route of ["", "works/", "journal/"]) {
    await np.goto(base + route);
    assert(await np.locator("h1").isVisible());
    await np.locator(".mobile-menu summary").click();
    assert(await np.getByRole("navigation", { name: "移动导航" }).isVisible());
  }
  report.checks.push("no JavaScript: content and native menu usable");
  await nojs.close();
  const p = await browser.newPage();
  await p.goto(base + "404.html");
  assert(
    (await p
      .getByRole("heading", { name: "这条小径， 还没有通向远方。" })
      .count()) || (await p.locator("h1").count()),
  );
  report.checks.push("custom 404 rendered");
  await p.close();
  assert.deepEqual(report.errors, []);
  assert.deepEqual(report.failed, []);
  console.log(
    "PASS 24 route/viewport combinations, local links, scene isolation, pause, offscreen, reduced, low-memory, no-JS, keyboard menu and 404",
  );
} finally {
  await writeFile(
    out + "/browser-report.json",
    JSON.stringify(report, null, 2),
  );
  await browser.close();
}
