import settings from "../../data/materials.json";
import type { createEnvironment } from "../environment";
type Mode = "all" | "off" | "rays" | "water" | "clouds" | "tree";
type Effect = "water" | "light";
type Layer = { effect: Effect; canvas: HTMLCanvasElement; ready: boolean };

/** Local repaired materials share the existing world projection and one worker. */
export function mountLocalMaterials(
  environment: ReturnType<typeof createEnvironment>,
  world: HTMLElement,
) {
  const mobile = matchMedia("(max-width:759px), (max-aspect-ratio:4/5)");
  const reduced = matchMedia("(prefers-reduced-motion:reduce)");
  let mode: Mode = "all",
    worker: Worker | undefined,
    timer: ReturnType<typeof setTimeout> | undefined;
  let failed = false,
    departed = false,
    layers: Layer[] = [];
  function poses() {
    const r = world.getBoundingClientRect();
    return [...world.querySelectorAll<HTMLElement>(".cloud-billow")]
      .slice(0, 4)
      .map((el) => {
        const b = el.getBoundingClientRect();
        return [
          (b.x - r.x) / r.width,
          (b.y - r.y) / r.height,
          b.width / r.width,
          b.height / r.height,
        ];
      });
  }
  function stopSync() {
    clearTimeout(timer);
    timer = undefined;
  }
  function syncClouds() {
    stopSync();
    const s = environment.motionState();
    if (
      worker &&
      !departed &&
      !s.hidden &&
      s.active &&
      !s.paused &&
      !s.reduced &&
      !s.saveData &&
      !s.comparisonStatic &&
      (mode === "all" || mode === "rays")
    ) {
      worker.postMessage({ type: "clouds", rects: poses() });
      timer = setTimeout(syncClouds, 100);
    }
  }
  function fail(reason: string) {
    failed = true;
    worker?.terminate();
    worker = undefined;
    stopSync();
    for (const l of layers) {
      l.ready = false;
      l.canvas.style.visibility = "hidden";
      l.canvas.dataset.state = "fallback";
      l.canvas.dataset.running = "false";
    }
    console.warn("Local materials: original painting retained.", reason);
  }
  function createLayers() {
    const device = mobile.matches ? "mobile" : "desktop",
      p = settings[device];
    for (const effect of ["water", "light"] as const) {
      const rect = p[effect],
        canvas = document.createElement("canvas");
      canvas.className = "local-material";
      canvas.ariaHidden = "true";
      Object.assign(canvas.dataset, {
        effect,
        device,
        state: "pending",
        running: "false",
      });
      Object.assign(canvas.style, {
        position: "absolute",
        pointerEvents: "none",
        visibility: "hidden",
        left: `${(rect.left / p.world[0]) * 100}%`,
        top: `${(rect.top / p.world[1]) * 100}%`,
        width: `${(rect.width / p.world[0]) * 100}%`,
        height: `${(rect.height / p.world[1]) * 100}%`,
      });
      world.insertBefore(canvas, world.querySelector(".environment"));
      layers.push({ effect, canvas, ready: false });
    }
  }
  function start() {
    if (worker || failed) return;
    if (
      typeof Worker === "undefined" ||
      !("transferControlToOffscreen" in HTMLCanvasElement.prototype)
    ) {
      fail("Offscreen worker unavailable");
      return;
    }
    try {
      worker = new Worker(new URL("./renderer.worker.ts", import.meta.url), {
        type: "module",
      });
      worker.onerror = (e) => {
        e.preventDefault();
        fail(e.message);
      };
      worker.onmessage = ({ data }) => {
        if (data.type === "error") {
          fail(data.message);
          return;
        }
        const layer = layers.find((l) => l.effect === data.effect);
        if (!layer) return;
        if (data.type === "ready") {
          layer.ready = true;
          Object.assign(layer.canvas.dataset, {
            state: "ready",
            renderer: "worker",
            quality: data.quality,
            renderSize: `${data.width}x${data.height}`,
          });
          state();
        }
        if (data.type === "frame")
          Object.assign(layer.canvas.dataset, {
            time: data.time.toFixed(2),
            frames: String(data.frames),
            drawMs: data.drawMs.toFixed(2),
          });
      };
      const device = mobile.matches ? "mobile" : "desktop";
      for (const l of layers) {
        l.canvas.dataset.state = "loading";
        const offscreen = l.canvas.transferControlToOffscreen();
        worker.postMessage(
          {
            type: "init",
            effect: l.effect,
            device,
            canvas: offscreen,
            rect: settings[device][l.effect],
            settings,
            baseURL: new URL(import.meta.env.BASE_URL, location.href).href,
            clouds: poses(),
          },
          [offscreen],
        );
      }
    } catch (e) {
      fail(String(e));
    }
  }
  function state() {
    const s = environment.motionState(),
      policy = s.reduced || s.saveData;
    if (!worker && !policy && !s.comparisonStatic && !departed && s.active)
      start();
    for (const l of layers) {
      const selected =
        settings.enabled[l.effect] &&
        (mode === "all" ||
          (mode === "water" && l.effect === "water") ||
          (mode === "rays" && l.effect === "light"));
      const visible = l.ready && selected && !policy && !s.comparisonStatic;
      const running =
        visible && !departed && !s.paused && !s.hidden && s.active;
      l.canvas.style.visibility = visible ? "visible" : "hidden";
      l.canvas.dataset.running = String(running);
      l.canvas.dataset.mode = mode;
      if (policy && !worker && !failed) l.canvas.dataset.state = "policy";
      worker?.postMessage({ type: "state", effect: l.effect, running });
    }
    syncClouds();
  }
  function resize() {
    worker?.terminate();
    worker = undefined;
    failed = false;
    stopSync();
    for (const l of layers) l.canvas.remove();
    layers = [];
    createLayers();
    state();
  }
  createLayers();
  const observer = new MutationObserver(state);
  observer.observe(world.querySelector(".environment")!, {
    attributes: true,
    attributeFilter: ["data-paused", "data-running", "data-comparison"],
  });
  mobile.addEventListener("change", resize);
  reduced.addEventListener("change", state);
  document.addEventListener("visibilitychange", state);
  addEventListener("pagehide", () => {
    departed = true;
    state();
  });
  addEventListener("pageshow", () => {
    departed = false;
    state();
  });
  const boot = () => setTimeout(state, 100);
  if (document.readyState === "complete") boot();
  else addEventListener("load", boot, { once: true });
  return {
    setMode(value: Mode) {
      mode = value;
      state();
    },
  };
}
