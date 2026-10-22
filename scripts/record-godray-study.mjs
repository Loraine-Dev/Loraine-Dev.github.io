import { chromium } from "playwright";
import fs from "node:fs/promises";
const device = process.env.RECORD_DEVICE || "desktop",
  quick = process.env.QUICK_REVIEW === "1";
const width = device === "desktop" ? 1440 : 390,
  height = device === "desktop" ? 900 : 844;
const out = `artifacts/godray-study/${quick ? "review" : "final"}`;
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({
  args: ["--enable-unsafe-swiftshader"],
});
const sessions = [];
for (const mode of ["off", "on"]) {
  const context = await browser.newContext({
    viewport: { width, height },
    reducedMotion: "no-preference",
    recordVideo: { dir: out, size: { width, height } },
  });
  const page = await context.newPage(),
    recordingStarted = Date.now(),
    errors = [],
    failures = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("response", (r) => {
    if (r.status() >= 400) failures.push(r.url());
  });
  await page.goto(`http://127.0.0.1:4176/?artStudy=godrays&study=${mode}`, {
    waitUntil: "networkidle",
  });
  await page.waitForFunction(
    () => document.querySelector(".godray-field")?.dataset.ready === "true",
  );
  await page.waitForTimeout(900);
  sessions.push({
    device,
    mode,
    context,
    page,
    recordingStarted,
    errors,
    failures,
    samples: [],
  });
}
const times = await sessions[0].page
  .locator(".farFog,.midFog")
  .evaluateAll((es) =>
    es
      .flatMap((e) => e.getAnimations({ subtree: true }))
      .map((a) => a.currentTime),
  );
for (const s of sessions)
  await s.page
    .locator(".farFog,.midFog")
    .evaluateAll(
      (es, t) =>
        es
          .flatMap((e) => e.getAnimations({ subtree: true }))
          .forEach((a, i) => (a.currentTime = t[i])),
      times,
    );
const started = Date.now();
sessions.forEach(
  (s) => (s.recordingLeadSeconds = (started - s.recordingStarted) / 1000),
);
async function sample(second) {
  for (const s of sessions) {
    await s.page.screenshot({
      path: `${out}/${device}-${s.mode}-${second}s.png`,
    });
    const state = await s.page.evaluate(() => ({
      scrollY,
      visibility: document.visibilityState,
      reduced: matchMedia("(prefers-reduced-motion:reduce)").matches,
      environment: { ...document.querySelector(".environment").dataset },
      ray: { ...document.querySelector(".godray-field").dataset },
      rayAnimations: document
        .querySelector(".godray-field")
        .getAnimations({ subtree: true })
        .map((a) => ({
          state: a.playState,
          time: a.currentTime,
          rate: a.playbackRate,
        })),
      camera: { ...document.querySelector("#world-canvas").dataset },
      fog: [...document.querySelectorAll(".farFog,.midFog")].map((e) => ({
        name: e.dataset.effect,
        opacity: getComputedStyle(e).opacity,
        transform: getComputedStyle(e.querySelector(".environment-drift"))
          .transform,
      })),
    }));
    s.samples.push({ second, elapsed: (Date.now() - started) / 1000, state });
  }
}
for (const second of quick ? [0, 5] : [0, 5, 15, 24]) {
  const delay = started + second * 1000 - Date.now();
  if (delay > 0) await new Promise((r) => setTimeout(r, delay));
  await sample(second);
  console.log(`${device}: ${second}s normal speed, no input`);
}
if (!quick) {
  for (let i = 0; i < 12; i++) {
    await Promise.all(
      sessions.map((s) =>
        s.page.mouse.wheel(0, device === "desktop" ? 40 : 44),
      ),
    );
    await new Promise((r) => setTimeout(r, 130));
  }
  await sample("entered");
  for (let i = 0; i < 12; i++) {
    await Promise.all(
      sessions.map((s) =>
        s.page.mouse.wheel(0, device === "desktop" ? -40 : -44),
      ),
    );
    await new Promise((r) => setTimeout(r, 130));
  }
  const delay = started + 30000 - Date.now();
  if (delay > 0) await new Promise((r) => setTimeout(r, delay));
  await sample(30);
}
for (const s of sessions) {
  const video = s.page.video();
  await s.context.close();
  await video.saveAs(`${out}/${device}-${s.mode}.webm`);
  delete s.page;
  delete s.context;
}
await browser.close();
await fs.writeFile(
  `${out}/${device}-report.json`,
  JSON.stringify(
    {
      note: "1x actual browser A/B; accepted clouds aligned once at start and remain running on both. First 24 seconds no input, then identical native wheel inputs in final capture. Mobile viewport simulation. No time acceleration.",
      sessions,
    },
    null,
    2,
  ),
);
