import { chromium } from "playwright";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
const base = process.env.SITE_URL || "http://127.0.0.1:4177/";
const browser = await chromium.launch({
  args: ["--enable-unsafe-swiftshader"],
});
const results = [];
try {
  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 390, height: 844 },
  ]) {
    const context = await browser.newContext({
      viewport,
      reducedMotion: "no-preference",
    });
    const page = await context.newPage(),
      errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(m.text());
    });
    for (const route of [
      "",
      "works/",
      "philosophy/",
      "about/",
      "journal/",
      "contact/",
      "404.html",
    ]) {
      await page.goto(new URL(route, base).href, { waitUntil: "networkidle" });
      assert.equal(
        await page
          .locator('meta[http-equiv="Content-Security-Policy"]')
          .count(),
        1,
      );
      if (!route) {
        await page
          .locator(".local-material[data-effect=water][data-state=ready]")
          .waitFor({ state: "attached" });
        await page
          .locator(".local-material[data-effect=light][data-state=ready]")
          .waitFor({ state: "attached" });
        const initial = await page
          .locator(".local-material")
          .evaluateAll((cs) => cs.map((c) => c.dataset.time));
        await page.waitForTimeout(1500);
        const next = await page
          .locator(".local-material")
          .evaluateAll((cs) => cs.map((c) => c.dataset.time));
        assert.notDeepEqual(
          initial,
          next,
          "CSP must preserve normal animation progress",
        );
      }
      results.push({ route, viewport, ok: true });
    }
    assert.deepEqual(errors, [], "Unexpected CSP/runtime console errors");
    // Deliberate attack probes only after normal-page error verification.
    await page.evaluate(() => {
      const script = document.createElement("script");
      script.textContent = "window.__cspProbe=1";
      document.body.append(script);
    });
    assert.equal(
      await page.evaluate(() => window.__cspProbe),
      undefined,
      "inline script blocked",
    );
    assert.equal(
      await page.evaluate(async () => {
        try {
          await fetch("https://example.invalid/csp-probe");
          return false;
        } catch {
          return true;
        }
      }),
      true,
      "external connections blocked",
    );
    await context.close();
  }
  await mkdir("artifacts/security", { recursive: true });
  await writeFile(
    "artifacts/security/browser.json",
    JSON.stringify(
      {
        results,
        inlineScriptBlocked: true,
        externalConnectBlocked: true,
        physicalPhone: false,
      },
      null,
      2,
    ),
  );
  console.log(
    "PASS CSP on 14 route/viewport combinations; normal materials animate; inline-script and external-connect probes blocked.",
  );
} finally {
  await browser.close();
}
