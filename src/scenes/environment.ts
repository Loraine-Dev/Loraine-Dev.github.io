import config from "../data/environment.json";
import art from "../data/world.json";
import {
  motionEnabled,
  projectWorldLayer,
  maskPlacement,
} from "./environment-space";
import placements from "../data/environment-regions.json";
type Pose = { x: number; y: number; z: number };
export function createEnvironment(world: HTMLElement, stage: HTMLElement) {
  const media = matchMedia("(max-width:759px), (max-aspect-ratio:4/5)");
  const reduced = matchMedia("(prefers-reduced-motion:reduce)");
  const nav = navigator as Navigator & {
    deviceMemory?: number;
    connection?: { saveData?: boolean };
  };
  const saveData =
    !!nav.connection?.saveData || !!(nav.deviceMemory && nav.deviceMemory <= 2);
  const params = new URLSearchParams(location.search);
  const selection = params.has("effects")
    ? new Set((params.get("effects") || "").split(","))
    : null;
  const root = document.createElement("div");
  root.className = "environment";
  root.setAttribute("aria-hidden", "true");
  world.append(root);
  const records: Array<{
    name: string;
    layer: HTMLElement;
    animations: Animation[];
    enabled: boolean;
  }> = [];
  let paused = false,
    armed = !media.matches || config.mobileStart !== 'interaction',
    active = true,
    pose: Pose = { x: 0, y: 0, z: art.camera.startZ };
  function sync(next: Pose = pose) {
    pose = next;
    const r = projectWorldLayer(
      stage.clientWidth,
      stage.clientHeight,
      media.matches ? config.mobileAspect : config.desktopAspect,
      art.camera.fov,
      art.layers.world,
      pose,
      art.camera.startZ,
    );
    world.style.width = `${r.width}px`;
    world.style.height = `${r.height}px`;
    world.style.transform = `translate(-50%,-50%) translate3d(${r.x}px,${r.y}px,0) scale(${r.scale})`;
  }
  function state() {
    let running = 0;
    for (const record of records) {
      const play = motionEnabled(record.enabled, {
        reduced: reduced.matches,
        paused,
        hidden: document.hidden,
        active,
        saveData,
      });
      for (const a of record.animations) play ? a.play() : a.pause();
      if (play) running++;
    }
    root.style.visibility = reduced.matches || saveData ? "hidden" : "visible";
    root.dataset.running = String(running);
    root.dataset.paused = String(paused);
  }
  function rebuild() {
    for (const r of records) for (const a of r.animations) a.cancel();
    records.length = 0;
    root.replaceChildren();
    if (!config.enabled || saveData || !armed) {
      root.dataset.deferred=String(!armed);
      root.dataset.effects='';
      state();
      sync();
      return;
    }
    const prefix = media.matches ? config.assets.mobile : config.assets.desktop;
    root.dataset.deferred='false';
    for (const [name, effect] of Object.entries(config.effects)) {
      const enabled = selection ? selection.has(name) : effect.enabled;
      if (!enabled) continue;
      const layer = document.createElement("div");
      layer.className = `environment-mask ${name}`;
      layer.dataset.effect = name;
      const bounds = (media.matches ? placements.mobile : placements.desktop)[
        name as keyof typeof placements.desktop
      ];
      const rect = maskPlacement(bounds);
      Object.assign(layer.style, {
        inset: "auto",
        left: `${rect.left}%`,
        top: `${rect.top}%`,
        width: `${rect.width}%`,
        height: `${rect.height}%`,
      });
      layer.style.maskImage = `url("${prefix}${name}.webp")`;
      const drift = document.createElement("div");
      drift.className = "environment-drift";
      Object.assign(drift.style, {
        inset: "auto",
        left: `${rect.driftLeft}%`,
        top: `${rect.driftTop}%`,
        width: `${rect.driftWidth}%`,
        height: `${rect.driftHeight}%`,
      });
      layer.append(drift);
      root.append(layer);
      const fog = name.endsWith("Fog");
      if (fog) drift.style.backgroundImage = `url("${config.assets.fog}")`;
      const strength = media.matches ? config.mobileStrength : 1;
      const opacity = effect.opacity * strength;
      const move = drift.animate(
        [
          {
            transform: `translate3d(${-effect.travel / 2}%,${-effect.rise / 2}%,0)`,
          },
          {
            transform: `translate3d(${effect.travel / 2}%,${effect.rise / 2}%,0)`,
          },
        ],
        {
          duration: effect.duration,
          iterations: Infinity,
          direction: "alternate",
          easing: "ease-in-out",
        },
      );
      const breath = layer.animate(
        [
          { opacity: opacity * config.minimumOpacity },
          { opacity },
          { opacity: opacity * config.minimumOpacity },
        ],
        {
          duration: effect.opacityDuration,
          iterations: Infinity,
          easing: "ease-in-out",
        },
      );
      move.currentTime = effect.duration * effect.phase;
      breath.currentTime = effect.duration * effect.phase;
      records.push({ name, layer, animations: [move, breath], enabled });
    }
    root.dataset.effects = records.map((r) => r.name).join(",");
    state();
    sync();
  }
  document.addEventListener("visibilitychange", state);
  reduced.addEventListener("change", () => {
    state();
    sync(reduced.matches ? { x: 0, y: 0, z: art.camera.startZ } : pose);
  });
  media.addEventListener("change", rebuild);
  const observer = new IntersectionObserver(([entry]) => {
    active = entry.isIntersecting;
    state();
  });
  observer.observe(stage);
  const resizer = new ResizeObserver(() => sync());
  resizer.observe(stage);
  addEventListener("pagehide", () => {
    active = false;
    state();
  });
  addEventListener("pageshow", () => {
    active = true;
    state();
  });
  rebuild();
  return {
    available: config.enabled && !saveData,
    activate() { if(!armed){armed=true;rebuild();} },
    sync,
    setPaused(value: boolean) {
      paused = value;
      state();
    },
    reset() {
      sync({ x: 0, y: 0, z: art.camera.startZ });
    },
  };
}
