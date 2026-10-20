import { chromium } from "playwright";
import fs from "node:fs/promises";
const out = "artifacts/visible-flow/comparison";
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({
  args: ["--enable-unsafe-swiftshader"],
});
const sessions = [];
for (const [device, width, height] of [
  ["desktop", 1440, 900],
  ["mobile", 390, 844],
])
  if (!process.env.RECORD_DEVICE || process.env.RECORD_DEVICE === device)
    for (const mode of ["static", "dynamic"]) {
      const context = await browser.newContext({
        viewport: { width, height },
        reducedMotion: "no-preference",
        recordVideo: { dir: out, size: { width, height } },
      });
      const page = await context.newPage();
      const recordingStarted = Date.now();
      const errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await page.goto(
        `http://127.0.0.1:4176/?motionCompare=${mode}&v=v6-visible-flow.2`,
        { waitUntil: "networkidle" },
      );
      await page.waitForTimeout(1000);
      sessions.push({
        device,
        mode,
        width,
        height,
        context,
        page,
        recordingStarted,
        errors,
        samples: [],
      });
    }
const started = Date.now();
sessions.forEach(
  (s) => (s.recordingLeadSeconds = (started - s.recordingStarted) / 1000),
);
async function sample(second) {
  for (const s of sessions) {
    await s.page.screenshot({
      path: `${out}/${s.device}-${s.mode}-${second}s.png`,
    });
    const state = await s.page.evaluate(() => ({
      scrollY,
      visibility: document.visibilityState,
      environment: { ...document.querySelector(".environment").dataset },
      camera: { ...document.querySelector("#world-canvas").dataset },
      modules: [...document.querySelectorAll(".environment-mask")].map((e) => ({
        name: e.dataset.effect,
        opacity: getComputedStyle(e).opacity,
        transform: getComputedStyle(e.querySelector(".environment-drift"))
          .transform,
      })),
    }));
    s.samples.push({
      second,
      elapsedSeconds: (Date.now() - started) / 1000,
      state,
    });
  }
}
for (const second of [0, 3, 5, 15]) {
  const delay = started + second * 1000 - Date.now();
  if (delay > 0) await new Promise((r) => setTimeout(r, delay));
  await sample(second);
  console.log(`Real time ${second}s, no input`);
}
// Identical real browser inputs in both modes. First 15 seconds are untouched.
for (const s of sessions)
  if (s.device === "desktop") await s.page.mouse.move(100, 500);
await new Promise((r) => setTimeout(r, 600));
for (const s of sessions)
  if (s.device === "desktop") await s.page.mouse.move(1300, 500);
for (let step = 0; step < 16; step++) {
  await Promise.all(
    sessions.map((s) =>
      s.page.mouse.wheel(0, s.device === "desktop" ? 32 : 39),
    ),
  );
  await new Promise((r) => setTimeout(r, 250));
}
await sample(22);
for (let step = 0; step < 16; step++) {
  await Promise.all(
    sessions.map((s) =>
      s.page.mouse.wheel(0, s.device === "desktop" ? -32 : -39),
    ),
  );
  await new Promise((r) => setTimeout(r, 250));
}
const delay = started + 30000 - Date.now();
if (delay > 0) await new Promise((r) => setTimeout(r, delay));
await sample(30);
for (const s of sessions) {
  const video = s.page.video();
  await s.context.close();
  await video.saveAs(`${out}/${s.device}-${s.mode}.webm`);
  delete s.page;
  delete s.context;
}
await browser.close();
await fs.writeFile(
  `${out}/${process.env.RECORD_DEVICE || "all"}-report.json`,
  JSON.stringify(
    {
      note: "Normal 1x real-time browser capture. No input first 15s, then identical native pointer/wheel inputs in each mode. CSS-only ambient; no artificial frame changes. Viewport emulation, not physical mobile hardware.",
      sessions,
    },
    null,
    2,
  ),
);
console.log("Saved static and dynamic browser recordings");
