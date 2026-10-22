import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
const label = process.argv[2] || "baseline",
  base = process.env.TRACE_URL || "http://127.0.0.1:4177/";
const out = `artifacts/targeted/${label}`;
await mkdir(out, { recursive: true });
const browser = await chromium.launch({
  args: ["--enable-unsafe-swiftshader"],
});
try {
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    reducedMotion: "no-preference",
  });
  await page.addInitScript(() => {
    window.__homeProfile = { calls: [], tasks: [], lcp: [] };
    new PerformanceObserver((l) =>
      l
        .getEntries()
        .forEach((e) =>
          window.__homeProfile.tasks.push({
            start: e.startTime,
            duration: e.duration,
          }),
        ),
    ).observe({ type: "longtask", buffered: true });
    new PerformanceObserver((l) =>
      l
        .getEntries()
        .forEach((e) =>
          window.__homeProfile.lcp.push({
            start: e.startTime,
            size: e.size,
            element: e.element?.className,
            url: e.url,
          }),
        ),
    ).observe({ type: "largest-contentful-paint", buffered: true });
    for (const [proto, names] of [
      [HTMLCanvasElement.prototype, ["getContext"]],
      [
        WebGLRenderingContext.prototype,
        [
          "compileShader",
          "getShaderParameter",
          "linkProgram",
          "getProgramParameter",
          "texImage2D",
          "drawArrays",
        ],
      ],
    ])
      for (const name of names) {
        const original = proto[name];
        proto[name] = function (...args) {
          const start = performance.now();
          try {
            return original.apply(this, args);
          } finally {
            const duration = performance.now() - start;
            if (duration > 1 || name !== "drawArrays")
              window.__homeProfile.calls.push({
                method: name,
                start,
                duration,
              });
          }
        };
      }
  });
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Network.enable");
  await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
  await cdp.send("Network.emulateNetworkConditions", {
    offline: false,
    latency: 150,
    downloadThroughput: (1600 * 1024) / 8,
    uploadThroughput: (750 * 1024) / 8,
  });
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  await cdp.send("Tracing.start", {
    transferMode: "ReturnAsStream",
    categories:
      "devtools.timeline,v8.execute,blink.user_timing,loading,disabled-by-default-devtools.timeline",
  });
  await page.goto(base, { waitUntil: "load" });
  await page.waitForTimeout(10000);
  if (process.env.TRACE_SCROLL === "1") {
    await page.evaluate(() => performance.mark("targeted-first-scroll"));
    await page.mouse.wheel(0, 300);
    await page.waitForTimeout(3000);
    await page.mouse.wheel(0, -180);
    await page.waitForTimeout(1500);
  }
  const snapshot = await page.evaluate(() => ({
    ...window.__homeProfile,
    resources: performance
      .getEntriesByType("resource")
      .map((r) => ({
        name: r.name,
        initiator: r.initiatorType,
        start: r.startTime,
        duration: r.duration,
        transfer: r.transferSize,
        decoded: r.decodedBodySize,
      })),
    scene: document.querySelector(".living-scene")?.dataset,
    images: [...document.images].map((i) => ({
      src: i.currentSrc,
      width: i.naturalWidth,
      height: i.naturalHeight,
    })),
  }));
  const completed = new Promise((resolve) =>
    cdp.once("Tracing.tracingComplete", resolve),
  );
  await cdp.send("Tracing.end");
  const { stream } = await completed;
  let trace = "";
  while (true) {
    const chunk = await cdp.send("IO.read", { handle: stream });
    trace += chunk.data;
    if (chunk.eof) break;
  }
  await cdp.send("IO.close", { handle: stream });
  await writeFile(`${out}/performance-trace.json`, trace);
  await writeFile(`${out}/profile.json`, JSON.stringify(snapshot, null, 2));
  const events = JSON.parse(trace).traceEvents;
  const totals = new Map();
  for (const e of events)
    if (e.ph === "X" && e.dur) {
      const t = totals.get(e.name) || { count: 0, ms: 0, max: 0 };
      t.count++;
      t.ms += e.dur / 1000;
      t.max = Math.max(t.max, e.dur / 1000);
      totals.set(e.name, t);
    }
  const summary = {
    base,
    environment:
      "Chromium, 390x844 touch emulation, applied CPU4x / 150ms / 1.6Mbps; diagnostic trace, not Lighthouse simulated metrics",
    calls: snapshot.calls.sort((a, b) => b.duration - a.duration).slice(0, 20),
    longTasks: snapshot.tasks,
    events: [...totals].sort((a, b) => b[1].ms - a[1].ms).slice(0, 35),
    lcp: snapshot.lcp,
    scene: snapshot.scene,
  };
  await writeFile(
    `${out}/trace-summary.json`,
    JSON.stringify(summary, null, 2),
  );
  console.log(JSON.stringify(summary, null, 2));
} finally {
  await browser.close();
}
