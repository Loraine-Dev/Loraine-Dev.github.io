import config from "../data/environment.json";
import art from "../data/world.json";
import {
  motionEnabled,
  projectWorldLayer,
  maskPlacement,
} from "./environment-space";
import placements from "../data/environment-regions.json";
import lightStudy from "../data/light-study.json";
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
  root.dataset.revision = config.revision;
  const overrides = new Map<string, boolean>();
  let playbackRate = 1;
  let comparisonStatic = false;
  let ambientLightSuppressed = true;
  let studyEnabled = false;
  let studyTime: number | undefined;
  const originalLight = new Map<
    Animation,
    { frames: ComputedKeyframe[]; timing: OptionalEffectTiming; time: number }
  >();
  root.dataset.lightStudy = "off";
  const records: Array<{
    name: string;
    layer: HTMLElement;
    animations: Animation[];
    enabled: boolean;
  }> = [];
  function restoreLight() {
    const breath = records
      .find((r) => r.name === "treeLight")
      ?.animations.at(-1);
    if (breath) studyTime = Number(breath.currentTime) || 0;
    for (const [a, original] of originalLight) {
      const effect = a.effect as KeyframeEffect;
      effect.setKeyframes(original.frames);
      effect.updateTiming(original.timing);
      a.currentTime = original.time;
    }
    originalLight.clear();
  }
  function applyLightStudy() {
    if (!import.meta.env.DEV || !studyEnabled) return;
    const profile = media.matches ? lightStudy.mobile : lightStudy.desktop;
    root.style.setProperty("--reflection-x", `${profile.reflectionX}%`);
    root.style.setProperty("--reflection-y", `${profile.reflectionY}%`);
    const sharedTime =
      studyTime ?? lightStudy.duration * lightStudy.initialPhase;
    for (const r of records.filter(
      (r) => r.name === "treeLight" || r.name === "waterLight",
    )) {
      r.animations.forEach((a, index) => {
        const effect = a.effect as KeyframeEffect;
        originalLight.set(a, {
          frames: effect.getKeyframes(),
          timing: {
            ...effect.getTiming(),
            duration: Number(effect.getTiming().duration),
          },
          time: Number(a.currentTime) || 0,
        });
        if (index === r.animations.length - 1) {
          const low =
            r.name === "treeLight" ? profile.treeLow : profile.waterLow;
          const high =
            r.name === "treeLight" ? profile.treeHigh : profile.waterHigh;
          effect.setKeyframes(
            lightStudy.curve.map(([offset, energy]) => ({
              offset,
              opacity: low + (high - low) * energy,
              easing: "ease-in-out",
            })),
          );
        } else {
          // Reuse existing timelines; stop the separate light wander, don't add another loop.
          const transform =
            index === 0
              ? "translate3d(0,0,0)"
              : `rotate(${profile.angles[index - 1]}deg)`;
          effect.setKeyframes([{ transform }, { transform }]);
        }
        effect.updateTiming({
          duration: lightStudy.duration,
          iterations: Infinity,
          direction: "normal",
          easing: "linear",
        });
        a.currentTime = sharedTime;
      });
    }
  }
  let paused = false,
    armed = !media.matches || config.mobileStart !== "interaction",
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
      const suppressed =
        ambientLightSuppressed &&
        (record.name === "treeLight" || record.name === "waterLight");
      record.layer.hidden = suppressed;
      const play = motionEnabled(record.enabled && !suppressed, {
        reduced: reduced.matches,
        paused: paused || comparisonStatic,
        hidden: document.hidden,
        active,
        saveData,
      });
      for (const a of record.animations) play ? a.play() : a.pause();
      if (play) running++;
    }
    root.style.visibility =
      reduced.matches || saveData || comparisonStatic ? "hidden" : "visible";
    root.dataset.comparison = comparisonStatic ? "static" : "dynamic";
    root.dataset.running = String(running);
    root.dataset.paused = String(paused);
    root.dataset.ambientLightSuppressed = String(ambientLightSuppressed);
  }
  function rebuild() {
    if (import.meta.env.DEV && originalLight.size) restoreLight();
    const phases = new Map(
      records.map((r) => [
        r.name,
        r.animations.map((a) => Number(a.currentTime) || 0),
      ]),
    );
    for (const r of records) for (const a of r.animations) a.cancel();
    records.length = 0;
    root.replaceChildren();
    if (!config.enabled || saveData || !armed) {
      root.dataset.deferred = String(!armed);
      root.dataset.effects = "";
      state();
      sync();
      return;
    }
    const prefix = media.matches ? config.assets.mobile : config.assets.desktop;
    root.dataset.deferred = "false";
    for (const [name, effect] of Object.entries(config.effects)) {
      const enabled =
        overrides.get(name) ??
        (selection ? selection.has(name) : effect.enabled);
      if (
        !enabled ||
        (ambientLightSuppressed &&
          (name === "treeLight" || name === "waterLight"))
      )
        continue;
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
      const billows: Animation[] = [];
      if (fog) {
        // Work in the local mask bounds, not a texture stretched over the entire world.
        Object.assign(drift.style, {
          left: "-20%",
          top: "-12%",
          width: "140%",
          height: "125%",
        });
        for (let index = 0; index < 2; index++) {
          const cloud = document.createElement("div");
          cloud.className = `cloud-billow cloud-billow-${index}`;
          cloud.style.backgroundImage = `url("${config.assets.fog}")`;
          drift.append(cloud);
          const a = cloud.animate(
            [
              {
                transform: `translate3d(${index ? 4 : -3}%,2%,0) scale(1,0.9) rotate(-1deg)`,
              },
              {
                transform: `translate3d(${index ? -4 : 3}%,-3%,0) scale(${index ? 1.08 : 0.94},1.12) rotate(1.2deg)`,
              },
            ],
            {
              duration: index ? 19000 : 27000,
              iterations: Infinity,
              direction: "alternate",
              easing: "ease-in-out",
            },
          );
          a.currentTime = effect.duration * (index ? 0.63 : 0.21);
          billows.push(a);
        }
      }
      if (name === "treeLight") {
        for (let index = 0; index < 2; index++) {
          const shaft = document.createElement("div");
          shaft.className = `canopy-shaft canopy-shaft-${index}`;
          drift.append(shaft);
          const mobile = media.matches;
          const angle = index ? (mobile ? 22 : 18) : mobile ? -23 : -28;
          const a = shaft.animate(
            [
              { transform: `rotate(${angle - 7}deg) scaleX(0.8)` },
              { transform: `rotate(${angle + 7}deg) scaleX(1.15)` },
            ],
            {
              duration: index ? 19000 : 14000,
              iterations: Infinity,
              direction: "alternate",
              easing: "ease-in-out",
            },
          );
          a.currentTime = index ? 10000 : 3500;
          billows.push(a);
        }
      }
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
          {
            opacity: fog
              ? opacity
              : opacity * (name === "treeLight" ? 0.55 : config.minimumOpacity),
          },
          { opacity },
          {
            opacity: fog
              ? opacity
              : opacity * (name === "treeLight" ? 0.55 : config.minimumOpacity),
          },
        ],
        {
          duration: effect.opacityDuration,
          iterations: Infinity,
          easing: "ease-in-out",
        },
      );
      move.currentTime = effect.duration * effect.phase;
      breath.currentTime = effect.duration * effect.phase;
      const animations = [move, ...billows, breath];
      const previous = phases.get(name);
      if (previous) {
        animations.forEach((a, i) => {
          if (previous[i] !== undefined) a.currentTime = previous[i];
        });
      }
      animations.forEach((a) => a.updatePlaybackRate(playbackRate));
      records.push({ name, layer, animations, enabled });
    }
    root.dataset.effects = records.map((r) => r.name).join(",");
    applyLightStudy();
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
    motionState() {
      return {
        reduced: reduced.matches,
        saveData,
        paused,
        hidden: document.hidden,
        active,
        comparisonStatic,
      };
    },
    setAmbientLightSuppressed(value: boolean) {
      ambientLightSuppressed = value;
      state();
    },
    setLightStudy(value: boolean) {
      if (!import.meta.env.DEV || value === studyEnabled) return;
      if (originalLight.size) restoreLight();
      studyEnabled = value;
      root.dataset.lightStudy = value ? "on" : "off";
      applyLightStudy();
      state();
    },
    setComparisonStatic(value: boolean) {
      comparisonStatic = value;
      state();
    },
    setEffect(name: string, enabled: boolean) {
      overrides.set(name, enabled);
      rebuild();
    },
    setRate(value: number) {
      playbackRate = Math.max(0.25, Math.min(4, value));
      for (const r of records)
        for (const a of r.animations) a.updatePlaybackRate(playbackRate);
    },
    snapshot() {
      return {
        revision: config.revision,
        enabled: config.enabled,
        paused,
        comparisonStatic,
        ambientLightSuppressed,
        studyEnabled,
        armed,
        active,
        hidden: document.hidden,
        reduced: reduced.matches,
        saveData,
        playbackRate,
        modules: Object.entries(config.effects).map(([name, effect]) => {
          const record = records.find((r) => r.name === name);
          return {
            name,
            enabled:
              overrides.get(name) ??
              (selection ? selection.has(name) : effect.enabled),
            initialized: !!record,
            mask: record?.layer.style.maskImage || "",
            opacity: record ? getComputedStyle(record.layer).opacity : "0",
            animations:
              record?.animations.map((a) => ({
                state: a.playState,
                time: Number(a.currentTime) || 0,
                progress: a.effect?.getComputedTiming().progress ?? 0,
              })) || [],
          };
        }),
        assets: records.flatMap((r) => {
          const prefix = media.matches
            ? config.assets.mobile
            : config.assets.desktop;
          return [
            `${prefix}${r.name}.webp`,
            ...(r.name.endsWith("Fog") ? [config.assets.fog] : []),
          ];
        }),
      };
    },
    activate() {
      if (!armed) {
        armed = true;
        rebuild();
      }
    },
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
