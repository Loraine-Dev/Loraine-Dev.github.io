import { chromium } from "playwright";
import assert from "node:assert/strict";
const browser = await chromium.launch({
  args: ["--enable-unsafe-swiftshader"],
});
try {
  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 390, height: 844 },
  ]) {
    const page = await browser.newPage({
      viewport,
      reducedMotion: "no-preference",
    });
    await page.goto("http://127.0.0.1:4176/?artStudy=godrays", {
      waitUntil: "networkidle",
    });
    await page
      .getByRole("button", { name: "体积光开启", exact: true })
      .waitFor({ timeout: 4000 });
    await page.waitForFunction(
      () => document.querySelector(".godray-field")?.dataset.ready === "true",
    );
    await page.evaluate(() => {
      window.__fog = [...document.querySelectorAll(".farFog,.midFog")];
      window.__fogAnims = window.__fog.flatMap((e) =>
        e.getAnimations({ subtree: true }),
      );
      window.__fogTimes = window.__fogAnims.map((a) => a.currentTime);
    });
    await page.getByRole("button", { name: "体积光关闭", exact: true }).click();
    assert.equal(
      await page
        .locator(".godray-field")
        .evaluate((e) => getComputedStyle(e).visibility),
      "hidden",
    );
    assert.equal(
      await page.locator(".environment").getAttribute("data-running"),
      "2",
    );
    await page.getByRole("button", { name: "体积光开启", exact: true }).click();
    assert(
      await page.evaluate(
        () =>
          [...document.querySelectorAll(".farFog,.midFog")].every(
            (e, i) => e === window.__fog[i],
          ) &&
          window.__fogAnims.every(
            (a, i) => a.currentTime >= window.__fogTimes[i],
          ),
      ),
      "A/B must retain accepted clouds and phase",
    );
    const before = await page
      .locator(".godray-field")
      .evaluate((e) =>
        e.getAnimations({ subtree: true }).map((a) => a.currentTime),
      );
    await page.waitForTimeout(400);
    assert.equal(
      await page.evaluate(
        () =>
          [
            ...document
              .querySelector(".environment")
              .getAnimations({ subtree: true }),
            ...document
              .querySelector(".godray-field")
              .getAnimations({ subtree: true }),
          ].filter((a) => a.playState === "running").length,
      ), 8,
      "Candidate replaces six independent light timelines with two scattering poses",
    );
    assert(
      (await page
        .locator(".godray-field")
        .evaluate((e) => e.getAnimations({ subtree: true })[0].currentTime)) >
        before[0] + 250,
    );
    await page.getByRole("button", { name: /暂停动态/ }).click();
    await page.waitForFunction(
      () => document.querySelector(".godray-field").dataset.running === "false",
    );
    await page.waitForFunction(() =>
      document
        .querySelector(".godray-field")
        .getAnimations({ subtree: true })
        .every((a) => a.playState === "paused" && !a.pending),
    );
    const held = await page
      .locator(".godray-field")
      .evaluate((e) =>
        e.getAnimations({ subtree: true }).map((a) => a.currentTime),
      );
    await page.waitForTimeout(200);
    assert.deepEqual(
      await page
        .locator(".godray-field")
        .evaluate((e) =>
          e.getAnimations({ subtree: true }).map((a) => a.currentTime),
        ),
      held,
    );
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.waitForFunction(
      () =>
        getComputedStyle(document.querySelector(".godray-field")).visibility ===
        "hidden",
    );
    await page.close();
  }
  const prod = await browser.newPage();
  await prod.goto("http://127.0.0.1:4177/?artStudy=godrays");
  assert.equal(await prod.locator(".godray-field img").count(), 2);
  assert.equal(await prod.locator("#godray-controls").count(), 0);
  const initialReduced = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    reducedMotion: "reduce",
  });
  const recovery = await initialReduced.newPage();
  await recovery.goto("http://127.0.0.1:4176/?artStudy=godrays", {
    waitUntil: "networkidle",
  });
  assert.equal(
    await recovery.locator(".godray-field").getAttribute("data-ready"),
    "policy",
  );
  assert.equal(await recovery.locator(".godray-field img").count(), 0);
  await recovery.emulateMedia({ reducedMotion: "no-preference" });
  await recovery.waitForFunction(
    () => document.querySelector(".godray-field")?.dataset.running === "true",
  );
  await recovery.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await recovery.waitForFunction(
    () => document.querySelector(".godray-field").dataset.running === "false",
  );
  await recovery.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: false,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await recovery.waitForFunction(
    () => document.querySelector(".godray-field").dataset.running === "true",
  );
  await recovery.setViewportSize({ width: 390, height: 844 });
  await recovery.waitForFunction(
    () =>
      document.querySelector(".godray-field")?.dataset.ready === "true" &&
      document.querySelector(".godray-field img")?.src.includes("mobile-"),
  );
  await initialReduced.close();
  const low = await browser.newContext();
  await low.addInitScript(() =>
    Object.defineProperty(navigator, "deviceMemory", { get: () => 2 }),
  );
  const lowPage = await low.newPage(),
    requests = [];
  lowPage.on("request", (r) => requests.push(r.url()));
  await lowPage.goto("http://127.0.0.1:4176/?artStudy=godrays", {
    waitUntil: "networkidle",
  });
  assert.equal(
    await lowPage.locator(".godray-field").getAttribute("data-ready"),
    "policy",
  );
  assert(
    !requests.some((url) => url.includes("/world-tree/godrays/")),
    "Low-memory mode must not request ray textures",
  );
  await low.close();
  const noGl = await browser.newContext();
  await noGl.addInitScript(() => {
    const get = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      return String(type).startsWith("webgl")
        ? null
        : get.call(this, type, ...args);
    };
  });
  const noGlPage = await noGl.newPage();
  await noGlPage.goto("http://127.0.0.1:4176/?artStudy=godrays", {
    waitUntil: "networkidle",
  });
  await noGlPage.waitForFunction(
    () => document.querySelector(".godray-field")?.dataset.running === "true",
  );
  assert.equal(await noGlPage.locator(".godray-field img").count(), 2);
  await noGl.close();
  const broken = await browser.newContext();
  const brokenPage = await broken.newPage();
  await brokenPage.route("**/world-tree/godrays/*.webp", (route) =>
    route.abort(),
  );
  await brokenPage.goto("http://127.0.0.1:4176/?artStudy=godrays", {
    waitUntil: "networkidle",
  });
  await brokenPage.waitForFunction(
    () => document.querySelector(".godray-field")?.dataset.ready === "error",
  );
  assert.equal(
    await brokenPage
      .locator(".godray-field")
      .evaluate((e) => getComputedStyle(e).visibility),
    "hidden",
  );
  assert.equal(
    await brokenPage.locator(".environment").getAttribute("data-running"),
    "2",
  );
  await broken.close();
  console.log(
    "PASS real isolated godray prototype, cloud continuity, pause/reduced and production baseline",
  );
} finally {
  await browser.close();
}
