import { chromium } from "playwright";
import fs from "node:fs/promises";
const device = process.env.RECORD_DEVICE || "desktop";
const width = device === "desktop" ? 1440 : 390,
  height = device === "desktop" ? 900 : 844;
const out = "artifacts/light-study";
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
    recordingStarted = Date.now();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(`http://127.0.0.1:4176/?artStudy=light&study=${mode}`, {
    waitUntil: "networkidle",
  });
  await page.locator("#art-study").waitFor();
  await page.waitForTimeout(1000);
  sessions.push({
    device,
    mode,
    context,
    page,
    recordingStarted,
    errors,
    samples: [],
  });
}
// Only align the already accepted cloud phases between A/B. Normal playback rate stays 1.
const cloudTimes = await sessions[0].page
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
      (es, times) =>
        es
          .flatMap((e) => e.getAnimations({ subtree: true }))
          .forEach((a, i) => (a.currentTime = times[i])),
      cloudTimes,
    );
const started = Date.now();
sessions.forEach(
  (s) => (s.recordingLeadSeconds = (started - s.recordingStarted) / 1000),
);
for (const second of [0, 5, 10, 15, 24]) {
  const delay = started + second * 1000 - Date.now();
  if (delay > 0) await new Promise((r) => setTimeout(r, delay));
  for (const s of sessions) {
    await s.page.screenshot({
      path: `${out}/${device}-${s.mode}-${second}s.png`,
    });
    const state = await s.page
      .locator(".environment")
      .evaluate((e) => ({
        state: { ...e.dataset },
        visible: document.visibilityState,
        scrollY,
        count: e.getAnimations({ subtree: true }).length,
        modules: [...e.querySelectorAll(".environment-mask")].map((layer) => ({
          name: layer.dataset.effect,
          opacity: getComputedStyle(layer).opacity,
          time: layer.getAnimations()[0].currentTime,
          progress: layer.getAnimations()[0].effect.getComputedTiming()
            .progress,
        })),
      }));
    s.samples.push({ second, elapsed: (Date.now() - started) / 1000, state });
  }
  console.log(`${device}: nominal ${second}s, untouched, normal speed`);
}
// Additional same-page near-simultaneous on/off stills at an actual, normally reached phase.
const p = sessions[1].page;
await p.getByRole("button", { name: "改动关闭", exact: true }).click();
await p.screenshot({ path: `${out}/${device}-toggle-off.png` });
await p.getByRole("button", { name: "改动开启", exact: true }).click();
await p.screenshot({ path: `${out}/${device}-toggle-on.png` });
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
      note: "Unaccelerated real-browser A/B. Clouds aligned at start only, then continue at 1x; no input through 24s capture. Same viewport; no new motion assets. Mobile is viewport simulation.",
      sessions,
    },
    null,
    2,
  ),
);
