import art from "../data/world.json";
import { cameraAt } from "./world-space";
import { projectWorldLayer } from "./environment-space";
import type { WorldController } from "./world-scene";
type Options = {
  host: HTMLElement;
  mobile: boolean;
  limited: boolean;
  signal: AbortSignal;
  onPose(p: { x: number; y: number; z: number }): void;
  onFailure(): void;
};
// The mobile gate and shore are parallel image planes. The same pinhole
// projection can be composited in CSS without allocating a second GL context.
export async function createWorldDOM({
  host,
  mobile,
  signal,
  onPose,
}: Options): Promise<WorldController> {
  const stage = host.parentElement!,
    experience = document.querySelector<HTMLElement>(".world-experience")!;
  const layers = [
    {
      node: document.querySelector<HTMLElement>(".shore-art")!,
      z: art.layers.shore,
    },
    {
      node: document.querySelector<HTMLElement>(".gate-art")!,
      z: art.layers.gate,
    },
  ];
  await Promise.all(layers.map((l) => l.node.querySelector("img")!.decode()));
  if (signal.aborted) throw new DOMException("Cancelled", "AbortError");
  const saved = layers.map((l) => l.node.style.cssText);
  const events = new AbortController();
  const reduced = matchMedia("(prefers-reduced-motion:reduce)");
  let width = 0,
    height = 0,
    raf = 0,
    paused = false,
    comparisonStatic = false,
    disposed = false,
    count = 0,
    active = true;
  const stop = () => {
    cancelAnimationFrame(raf);
    raf = 0;
  };
  const wake = () => {
    if (!raf && !disposed && active && !document.hidden)
      raf = requestAnimationFrame(draw);
  };
  function resize() {
    width = stage.clientWidth;
    height = stage.clientHeight;
    layers.forEach((l) => {
      const image = l.node.querySelector("img")!;
      const r = projectWorldLayer(
        width,
        height,
        image.naturalWidth / image.naturalHeight,
        art.camera.fov,
        l.z,
        { x: 0, y: 0, z: art.camera.startZ },
        art.camera.startZ,
      );
      Object.assign(l.node.style, {
        inset: "auto",
        left: "50%",
        top: "50%",
        width: `${r.width}px`,
        height: `${r.height}px`,
        transformOrigin: "50% 50%",
      });
    });
    wake();
  }
  function draw() {
    raf = 0;
    if (disposed || !active || document.hidden) return;
    const progress = Math.min(
      1,
      Math.max(
        0,
        -experience.getBoundingClientRect().top /
          Math.max(1, experience.offsetHeight - height),
      ),
    );
    const still =
      reduced.matches ||
      comparisonStatic ||
      !art.camera.enabled ||
      new URLSearchParams(location.search).get("camera") === "off";
    const pose = cameraAt(
      still ? 0 : progress,
      art.camera.startZ,
      mobile ? art.camera.mobileTravel : art.camera.travel,
    );
    layers.forEach((l) => {
      const image = l.node.querySelector("img")!;
      const r = projectWorldLayer(
        width,
        height,
        image.naturalWidth / image.naturalHeight,
        art.camera.fov,
        l.z,
        pose,
        art.camera.startZ,
      );
      l.node.style.transform = `translate(-50%,-50%) translate3d(${r.x}px,${r.y}px,0) scale(${r.scale})`;
    });
    onPose(pose);
    count++;
    host.dataset.frames = String(count);
    host.dataset.progress = progress.toFixed(4);
    host.dataset.cameraZ = pose.z.toFixed(4);
    host.dataset.running = "false";
    host.dataset.drawCalls = "0";
    host.dataset.paused = String(paused);
  }
  addEventListener("scroll", wake, { passive: true, signal: events.signal });
  addEventListener("resize", resize, { passive: true, signal: events.signal });
  document.addEventListener(
    "visibilitychange",
    () => (document.hidden ? stop() : wake()),
    { signal: events.signal },
  );
  reduced.addEventListener("change", wake, { signal: events.signal });
  addEventListener("pagehide", stop, { signal: events.signal });
  addEventListener("pageshow", resize, { signal: events.signal });
  const observer = new IntersectionObserver(([entry]) => {
    active = entry.isIntersecting;
    if (active) wake();
    else stop();
  });
  observer.observe(stage);
  const resizer = new ResizeObserver(resize);
  resizer.observe(stage);
  host.dataset.renderer = "dom";
  host.dataset.shoreSource = layers[0].node.querySelector("img")!.currentSrc;
  host.dataset.state = "live";
  host.dataset.renderStrategy = "on-demand-css";
  host.classList.remove("is-ready");
  resize();
  stop();
  draw();
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    stop();
    events.abort();
    observer.disconnect();
    resizer.disconnect();
    layers.forEach((l, i) => (l.node.style.cssText = saved[i]));
    onPose({ x: 0, y: 0, z: art.camera.startZ });
  };
  signal.addEventListener("abort", dispose, { once: true });
  return {
    setPaused(value) {
      paused = value;
      wake();
    },
    setStatic(value) {
      comparisonStatic = value;
      wake();
    },
    dispose,
  };
}
