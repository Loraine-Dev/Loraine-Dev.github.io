import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
await mkdir("artifacts", { recursive: true });
const b = await chromium.launch({ args: ["--enable-unsafe-swiftshader"] });
for (const [name, width, height] of [
  ["desktop", 1440, 1000],
  ["mobile", 390, 844],
]) {
  const p = await b.newPage({
    viewport: { width, height },
    deviceScaleFactor: 1,
    reducedMotion: "reduce",
  });
  p.on("pageerror", (e) => console.log("ERROR", e.message));
  p.on("console", (m) => {
    if (m.type() === "error") console.log("CONSOLE", m.text());
  });
  await p.goto("http://127.0.0.1:4176/", { waitUntil: "networkidle" });
  await p.waitForFunction(
    () =>
      document.querySelector("#scene")?.dataset.sceneState === "live" ||
      document
        .querySelector("#motion-toggle")
        ?.textContent.includes("开启实时形态"),
    null,
    { timeout: 60000 },
  );
  if ((await p.locator("#scene").getAttribute("data-scene-state")) !== "live")
    await p.getByRole("button", { name: /开启实时形态/ }).click();
  await p.waitForFunction(
    () => document.querySelector("#scene")?.dataset.sceneState === "live",
    { timeout: 30000 },
  );
  await p.waitForTimeout(1600);
  await p.screenshot({ path: `artifacts/hero-${name}.png` });
  console.log(
    name,
    await p.locator("#scene").evaluate((el) => ({
      ...el.dataset,
      canvas: !!el.querySelector("canvas"),
    })),
  );

  await p.evaluate(() =>
    document
      .querySelectorAll(".hero,.header,.threshold,.scene-shade")
      .forEach((el) => (el.style.visibility = "hidden")),
  );
  await p
    .locator("#scene canvas")
    .screenshot({ path: `artifacts/form-${name}.png` });

  await p.evaluate(() => {
    document
      .querySelectorAll(".hero,.header,.threshold,.scene-shade")
      .forEach((el) => (el.style.visibility = ""));
    scrollTo(0, innerHeight * 0.85);
  });
  await p.waitForTimeout(1000);
  await p.screenshot({ path: `artifacts/threshold-${name}.png` });
  await p.close();
}
await b.close();
