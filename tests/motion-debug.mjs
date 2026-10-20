import { chromium } from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
const browser = await chromium.launch({
  args: ["--enable-unsafe-swiftshader"],
});
try {
  const page = await browser.newPage({
    viewport: { width: 1280, height: 900 },
  });
  await page.goto("http://127.0.0.1:4176/?debugMotion=1", {
    waitUntil: "networkidle",
  });
  await page.locator("#motion-debug").waitFor();
  await page.waitForFunction(() =>
    document.querySelector("[data-resources]")?.textContent.includes("loaded"),
  );
  assert(
    (await page.locator("#motion-debug").innerText()).includes("v6-idle-fix.1"),
  );
  assert(
    (await page.locator("#motion-debug").innerText()).includes(
      "D:/codex/work/miloqen-v6",
    ),
  );
  await page.locator('input[data-module="treeLight"]').uncheck();
  assert.equal(await page.locator(".treeLight").count(), 0);
  await page.locator('input[data-module="treeLight"]').check();
  assert.equal(await page.locator(".treeLight").count(), 1);
  await page.getByLabel("临时调试速度", { exact: true }).selectOption("4");
  await page.waitForFunction(() =>
    document.querySelector("[data-status]").textContent.includes("4×"),
  );
  await page.getByLabel("临时调试速度", { exact: true }).selectOption("1");
  await page.getByRole("button", { name: "暂停 / 恢复全部" }).click();
  assert.equal(
    await page.locator(".environment").getAttribute("data-running"),
    "0",
  );
  await page.getByRole("button", { name: "暂停 / 恢复全部" }).click();
  assert.equal(
    await page.locator(".environment").getAttribute("data-running"),
    "4",
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.waitForFunction(() =>
    document.querySelector("[data-status]").textContent.includes("减少动态"),
  );
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.screenshot({ path: "artifacts/idle-motion/debug-panel.png" });
  const prod = await browser.newPage();
  const requests = [];
  prod.on("request", (r) => requests.push(r.url()));
  await prod.goto("http://127.0.0.1:4177/?debugMotion=1", {
    waitUntil: "networkidle",
  });
  assert.equal(await prod.locator("#motion-debug").count(), 0);
  assert(!requests.some((url) => url.includes("motion-debug")));
  const assets = await fs.readdir("dist/assets");
  for (const file of assets.filter((x) => x.endsWith(".js")))
    assert(
      !(await fs.readFile("dist/assets/" + file, "utf8")).includes(
        "动画诊断 · 仅开发模式",
      ),
    );
  const brokenContext = await browser.newContext();
  const broken = await brokenContext.newPage();
  await broken.route("**/motion/fog.webp", (route) => route.abort());
  await broken.goto("http://127.0.0.1:4176/?debugMotion=1", {
    waitUntil: "networkidle",
  });
  await broken.waitForFunction(() =>
    document.querySelector("[data-errors]")?.textContent.includes("资源失败"),
  );
  assert(
    (await broken.locator("[data-resources]").innerText()).includes("ERROR"),
  );
  await brokenContext.close();
  console.log(
    "PASS debug version/resources/switches/speed/pause/reduced; absent from production bundle",
  );
} finally {
  await browser.close();
}
