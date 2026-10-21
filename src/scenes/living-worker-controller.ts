import type { createEnvironment } from "./environment";
import settings from "../data/living-scene.json";
type Mode = "all" | "off" | "rays" | "water" | "tree" | "clouds";
type Material = { setMode(value: Mode): void };
export async function mountWorkerMaterial(
  controller: ReturnType<typeof createEnvironment>,
  world: HTMLElement,
  fallback: () => Promise<Material>,
): Promise<Material> {
  const canvas = document.createElement("canvas");
  canvas.className = "living-scene";
  canvas.ariaHidden = "true";
  canvas.dataset.renderer = "worker";
  Object.assign(canvas.style, {
    position: "absolute",
    inset: "0",
    width: "100%",
    height: "100%",
    pointerEvents: "none",
    visibility: "hidden",
  });
  world.append(canvas);
  const media = matchMedia("(max-width:759px), (max-aspect-ratio:4/5)");
  let worker: Worker,
    mode: Mode = "all",
    ready = false,
    initialized = false,
    ticket = 0,
    stopped = false,
    legacy: Material | undefined;
  const policy = controller.motionState();
  // Do not allocate a graphics context or upload textures for static policies.
  if (policy.reduced || policy.saveData) canvas.dataset.state = "policy";
  const material: Material = {
    setMode(value) {
      mode = value;
      legacy?.setMode(value);
      state();
    },
  };
  const events = new AbortController();
  const observer = new MutationObserver(state);
  observer.observe(world.querySelector(".environment")!, {
    attributes: true,
    attributeFilter: ["data-paused", "data-running", "data-comparison"],
  });
  async function fail(reason: string) {
    if (stopped) return;
    stopped = true;
    ready = false;
    worker?.terminate();
    observer.disconnect();
    events.abort();
    canvas.remove();
    console.warn("Worker material fallback:", reason);
    legacy = await fallback();
    legacy.setMode(mode);
  }
  function state() {
    if (stopped) return;
    const s = controller.motionState();
    if (!worker && !s.reduced && !s.saveData) {
      start();
      return;
    }
    const visible =
      ready &&
      !s.reduced &&
      !s.saveData &&
      !s.comparisonStatic &&
      mode !== "off" &&
      mode !== "clouds";
    const running = visible && !s.paused && !s.hidden && s.active;
    canvas.style.visibility = visible ? "visible" : "hidden";
    canvas.dataset.mode = mode;
    canvas.dataset.running = String(running);
    if (initialized) worker.postMessage({ type: "state", mode, running });
  }
  function start() {
    if (worker || stopped) return;
    try {
      worker = new Worker(
        new URL("./living-renderer.worker.ts", import.meta.url),
        { type: "module" },
      );
      worker.onerror = (event) => {
        event.preventDefault();
        void fail(event.message);
      };
      worker.onmessage = ({ data }) => {
        if (stopped) return;
        if (data.type === "error") {
          void fail(data.message);
          return;
        }
        if (data.type === "initialized") {
          initialized = true;
          canvas.dataset.quality = data.quality;
          void load();
        }
        if (data.type === "ready" && data.ticket === ticket) {
          ready = true;
          canvas.dataset.state = "ready";
          canvas.dataset.renderSize = `${data.width}x${data.height}`;
          state();
        }
        if (data.type === "progress") {
          canvas.dataset.time = Number(data.time).toFixed(2);
          canvas.dataset.drawCount = String(data.drawCount ?? "");
        }
        if (data.type === "lost") {
          // A transferred canvas cannot be reused on the main thread. Replace
          // it with the existing fallback instead of leaving a frozen overlay.
          void fail("Worker graphics context lost");
        }
      };
      const target = canvas.transferControlToOffscreen();
      worker.postMessage({ type: "initialize", canvas: target }, [target]);
    } catch (error) {
      void fail(String(error));
    }
  }
  async function load() {
    if (!initialized || stopped) return;
    const n = ++ticket;
    ready = false;
    canvas.style.visibility = "hidden";
    canvas.dataset.state = "loading";
    state();
    const device = media.matches ? "mobile" : "desktop";
    const sources = [
      `./art/world-tree/world-${device}.webp`,
      `./art/world-tree/living/${device}-regions-lossless.webp`,
      settings.opticalField,
    ];
    worker.postMessage({
      type: "sources",
      device,
      ticket: n,
      sources: sources.map((src) => new URL(src, location.href).href),
    });
  }

  media.addEventListener(
    "change",
    () => {
      if (initialized) void load();
    },
    { signal: events.signal },
  );
  matchMedia("(prefers-reduced-motion:reduce)").addEventListener(
    "change",
    state,
    { signal: events.signal },
  );
  document.addEventListener("visibilitychange", state, {
    signal: events.signal,
  });
  addEventListener(
    "pagehide",
    () => {
      if (initialized)
        worker.postMessage({ type: "state", mode, running: false });
    },
    { signal: events.signal },
  );
  addEventListener("pageshow", state, { signal: events.signal });
  state();
  return material;
}
