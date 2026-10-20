import { chromium } from "playwright";
import assert from "node:assert/strict";
const browser = await chromium.launch();
try {
  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 390, height: 844 },
  ]) {
    const page = await browser.newPage({
      viewport,
      reducedMotion: "no-preference",
    });
    await page.goto("http://127.0.0.1:4176/?artStudy=light", {
      waitUntil: "networkidle",
    });
    await page
      .getByRole("button", { name: "改动开启", exact: true })
      .waitFor({ timeout: 3000 });
    await page.evaluate(() => {
      window.__clouds = [...document.querySelectorAll(".farFog,.midFog")];
      window.__cloudAnimations = window.__clouds.flatMap((e) =>
        e.getAnimations({ subtree: true }),
      );
      window.__cloudTimes = window.__cloudAnimations.map((a) => a.currentTime);
      window.__animationCount = document
        .querySelector(".environment")
        .getAnimations({ subtree: true }).length;
    });
    const synced = () =>
      page.evaluate(() => {
        const progress = (name) =>
          document
            .querySelector("." + name)
            .getAnimations()[0]
            .effect.getComputedTiming().progress;
        return Math.abs(progress("treeLight") - progress("waterLight")) < 0.01;
      });
    assert(await synced(), "Same source light must have a shared phase");
    await page.getByRole("button", { name: "改动关闭", exact: true }).click();
    await page.getByRole("button", { name: "改动开启", exact: true }).click();
    assert(await synced());
    assert(
      await page.evaluate(() => {
        const clouds = [...document.querySelectorAll(".farFog,.midFog")];
        const animations = clouds.flatMap((e) =>
          e.getAnimations({ subtree: true }),
        );
        return (
          clouds.every((e, i) => e === window.__clouds[i]) &&
          animations.every(
            (a, i) =>
              a === window.__cloudAnimations[i] &&
              a.currentTime >= window.__cloudTimes[i],
          ) &&
          document
            .querySelector(".environment")
            .getAnimations({ subtree: true }).length === window.__animationCount
        );
      }),
      "A/B must not rebuild clouds, reset them or add animation layers",
    );
    await page.getByRole("button", { name: /暂停动态/ }).click();
    assert.equal(
      await page.locator(".environment").getAttribute("data-running"),
      "0",
    );
    const held = await page
      .locator(".environment")
      .evaluate((e) =>
        e.getAnimations({ subtree: true }).map((a) => a.currentTime),
      );
    await page.waitForTimeout(300);
    assert.deepEqual(
      await page
        .locator(".environment")
        .evaluate((e) =>
          e.getAnimations({ subtree: true }).map((a) => a.currentTime),
        ),
      held,
    );
    await page.setViewportSize(
      viewport.width > 500
        ? { width: 390, height: 844 }
        : { width: 1440, height: 900 },
    );
    await page.waitForFunction(
      () =>
        document
          .querySelector(".treeLight")
          ?.getAnimations()[0]
          .effect.getTiming().duration === 32000,
    );
    assert(
      await synced(),
      "Responsive rebuild must keep the shared light phase",
    );
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.waitForFunction(
      () =>
        getComputedStyle(document.querySelector(".environment")).visibility ===
        "hidden",
    );
    await page.close();
  }
  const prod = await browser.newPage();
  await prod.goto("http://127.0.0.1:4177/?artStudy=light");
  assert.equal(await prod.locator("#art-study").count(), 0);
  assert.equal(
    await prod.locator(".environment").getAttribute("data-light-study"),
    "off",
  );
  console.log(
    "PASS isolated DEV A/B, unchanged cloud identities/phases, shared light phase, no extra animations, pause/reduced, production unchanged",
  );
} finally {
  await browser.close();
}
