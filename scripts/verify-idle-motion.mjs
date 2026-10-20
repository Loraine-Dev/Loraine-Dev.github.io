import { chromium } from "playwright";
import sharp from "sharp";
import fs from "node:fs/promises";
const label = process.env.CAPTURE_LABEL || "after";
const base = process.env.SITE_URL || "http://127.0.0.1:4177/";
const out = `artifacts/idle-motion/${label}`;
await fs.mkdir(out, { recursive: true });
const b = await chromium.launch({ args: ["--enable-unsafe-swiftshader"] });
const sessions = [];
for (const [name, width, height] of [
  ["desktop", 1440, 900],
  ["mobile", 390, 844],
]) {
  const c = await b.newContext({
    viewport: { width, height },
    reducedMotion: "no-preference",
    recordVideo: { dir: out, size: { width, height } },
  });
  const p = await c.newPage();
  const errors = [],
    failures = [];
  p.on("pageerror", (e) => errors.push(e.message));
  p.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  p.on("response", (r) => {
    if (r.status() >= 400) failures.push({ url: r.url(), status: r.status() });
  });
  const url = new URL(base);
  url.searchParams.set("verifyIdle", label);
  await p.goto(url.href, { waitUntil: "networkidle" });
  await p.waitForTimeout(1800);
  sessions.push({ name, c, p, errors, failures, samples: [] });
}
const start = Date.now();
for (const second of [0, 5, 15, 30]) {
  const delay = start + second * 1000 - Date.now();
  if (delay > 0) await new Promise((r) => setTimeout(r, delay));
  for (const s of sessions) {
    const state = await s.p.evaluate(() => ({
      visibility: document.visibilityState,
      reduced: matchMedia("(prefers-reduced-motion:reduce)").matches,
      environment: { ...document.querySelector(".environment").dataset },
      canvas: { ...document.querySelector("#world-canvas").dataset },
      animations: document
        .querySelector(".environment")
        .getAnimations({ subtree: true })
        .map((a) => ({ state: a.playState, time: a.currentTime })),
      modules: [...document.querySelectorAll(".environment-mask")].map((e) => ({
        name: e.dataset.effect,
        opacity: getComputedStyle(e).opacity,
        rect: e.getBoundingClientRect().toJSON(),
        mask: getComputedStyle(e).maskImage,
      })),
      foreground: [...document.querySelectorAll(".shore-art,.gate-art")].map(
        (e) => ({
          tag: e.className,
          visibility: getComputedStyle(e).visibility,
        }),
      ),
      scrollY,
    }));
    await s.p.screenshot({ path: `${out}/${s.name}-${second}s.png` });
    s.samples.push({ second, state });
  }
  console.log(`${label}: ${second}s no input`);
}
for (const s of sessions) {
  const first = await sharp(`${out}/${s.name}-0s.png`)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  s.differences = [];
  for (const second of [5, 15, 30]) {
    const data = await sharp(`${out}/${s.name}-${second}s.png`)
      .removeAlpha()
      .raw()
      .toBuffer();
    let sum = 0,
      max = 0,
      changed = 0;
    for (let i = 0; i < data.length; i++) {
      const d = Math.abs(data[i] - first.data[i]);
      sum += d;
      max = Math.max(max, d);
      if (d >= 8) changed++;
    }
    const modules = s.samples[0].state.modules.map((module) => {
      const r = module.rect;
      let total = 0,
        peak = 0,
        count = 0,
        channels = 0;
      for (
        let y = Math.max(0, Math.ceil(r.y));
        y < Math.min(first.info.height, Math.floor(r.y + r.height));
        y++
      )
        for (
          let x = Math.max(0, Math.ceil(r.x));
          x < Math.min(first.info.width, Math.floor(r.x + r.width));
          x++
        )
          for (let c = 0; c < 3; c++) {
            const i = (y * first.info.width + x) * 3 + c,
              d = Math.abs(data[i] - first.data[i]);
            total += d;
            peak = Math.max(peak, d);
            channels++;
            if (d >= 8) count++;
          }
      return {
        name: module.name,
        mean: total / Math.max(1, channels),
        max: peak,
        channelsChangedBy8: count,
      };
    });
    s.differences.push({
      second,
      meanChannelDifference: sum / data.length,
      maxChannelDifference: max,
      channelsChangedBy8: changed,
      modules,
    });
  }
  const video = s.p.video();
  await s.c.close();
  await video.saveAs(`${out}/${s.name}-normal.webm`);
  delete s.p;
  delete s.c;
}
await b.close();
await fs.writeFile(`${out}/report.json`, JSON.stringify(sessions, null, 2));
console.log(
  sessions.map((s) => ({
    name: s.name,
    animations: s.samples[0].state.animations.length,
    environment: s.samples[0].state.environment,
    differences: s.differences,
    errors: s.errors,
    failures: s.failures,
  })),
);
