import { mountWorkerMaterial } from "./living-worker-controller";
import type { createEnvironment } from "./environment";
type Mode = "all" | "off" | "rays" | "water" | "tree" | "clouds";
// One small 2D shader, not a new 3D scene. All effects remain registered to
// world coordinates and sit behind the independent shore and gate planes.
export function mountLivingScene(
  controller: ReturnType<typeof createEnvironment>,
  world: HTMLElement,
) {
  let mode: Mode = "all";
  let material: { setMode(value: Mode): void } | undefined;
  const fallback = () =>
    import("./living-main-fallback").then(({ initializeLivingScene }) =>
      initializeLivingScene(controller, world),
    );
  const start = () => {
    void (
      typeof Worker !== "undefined" &&
      "transferControlToOffscreen" in HTMLCanvasElement.prototype
        ? mountWorkerMaterial(controller, world, () => fallback())
        : fallback()
    ).then((value) => {
      material = value;
      material.setMode(mode);
    });
  };
  // The static painting and CSS atmosphere render first. Do not synchronously
  // compile a second graphics context inside the document's initial task.
  if (document.readyState === "complete") setTimeout(start, 0);
  else addEventListener("load", start, { once: true });
  return {
    setMode(value: Mode) {
      mode = value;
      material?.setMode(value);
    },
  };
}
