import { chromium } from "playwright";
import assert from "node:assert/strict";
const base = process.env.SITE_URL || "http://127.0.0.1:4177/";
const b = await chromium.launch({ args: ["--enable-unsafe-swiftshader"] });
try {
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  await p.goto(base, { waitUntil: "networkidle" });
  await p.waitForFunction(
    () =>
      document.querySelector("#world-canvas")?.dataset.state === "live" ||
      document.querySelector("#world-canvas")?.dataset.reason ===
        "software-gpu",
  );
  await p.mouse.wheel(0, 1);
  await p.waitForFunction(
    () => document.querySelector("#world-canvas")?.dataset.state === "live",
  );
  await p.evaluate(() => scrollTo(0, innerHeight * 0.8));
  await p.waitForTimeout(900);
  await p.locator(".world-header .desktop-nav a:last-child").focus();
  await p.keyboard.press("Tab");
  assert.notEqual(
    await p.locator(":focus").getAttribute("class"),
    "explore",
    "faded link must not receive keyboard focus",
  );
  console.log("PASS invisible hero focus regression");
} finally {
  await b.close();
}
