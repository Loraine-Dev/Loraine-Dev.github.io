import type { createEnvironment } from "./environment";
import config from "../data/godrays.json";
import assets from "../data/godray-assets.json";
export function mountGodrays(
  controller: ReturnType<typeof createEnvironment>,
  world: HTMLElement,
  debug = false,
) {
  const media = matchMedia("(max-width:759px), (max-aspect-ratio:4/5)");
  const root = document.createElement("div");
  root.className = "godray-field";
  root.setAttribute("aria-hidden", "true");
  root.dataset.study = config.id;
  world.append(root);
  const controls = document.createElement("aside");
  controls.id = "godray-controls";
  controls.setAttribute("aria-label", "候选 A 云谷体积光对照");
  const title = document.createElement("p");
  title.textContent = "候选 A · 穿过云谷的光";
  controls.append(title);
  const buttons = [false, true].map((value) => {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = value ? "体积光开启" : "体积光关闭";
    b.addEventListener("click", () => {
      enabled = value;
      state();
    });
    controls.append(b);
    return b;
  });
  const note = document.createElement("small");
  controls.append(note);
  const style = document.createElement("style");
  style.textContent = `.godray-field{position:absolute;pointer-events:none;mix-blend-mode:screen;isolation:isolate}.godray-field img{position:absolute;inset:0;width:100%;height:100%;object-fit:fill;pointer-events:none}#godray-controls{position:fixed;z-index:901;left:18px;bottom:18px;padding:10px 12px;border:1px solid #c3b29477;background:#08121aeb;color:#e5e3db;border-radius:3px;font:12px/1.5 Arial,"Microsoft YaHei",sans-serif}#godray-controls p{margin:0 0 7px}#godray-controls button{border:0;background:#28323b;color:#bdcbd1;padding:7px 12px;border-radius:2px;margin-right:4px}#godray-controls button[aria-pressed=true]{background:#d8c49c;color:#0a141d}#godray-controls small{display:block;color:#a7b6bf;margin-top:7px;font-size:10px}body:has(#godray-controls) #motion-compare{display:none}`;
  document.head.append(style);
  if (debug) document.body.append(controls);
  let enabled = !(
      import.meta.env.DEV &&
      new URLSearchParams(location.search).get("study") === "off"
    ),
    generation = 0;
  let animations: Animation[] = [];
  function state() {
    const s = controller.motionState(),
      ready = root.dataset.ready === "true";
    if (root.dataset.ready === "policy" && !s.reduced && !s.saveData) {
      rebuild();
      return;
    }
    const visible =
      enabled && ready && !s.reduced && !s.saveData && !s.comparisonStatic;
    const run = visible && !s.paused && !s.hidden && s.active;
    animations.forEach((a) => (run ? a.play() : a.pause()));
    root.style.visibility = visible ? "visible" : "hidden";
    root.dataset.enabled = String(enabled);
    root.dataset.running = String(run);
    buttons.forEach((b, i) =>
      b.setAttribute("aria-pressed", String((i === 1) === enabled)),
    );
    note.textContent =
      root.dataset.ready === "error"
        ? "光路素材失败，保留主画与云雾"
        : s.reduced
          ? "已遵循减少动态设置"
          : s.saveData
            ? "已遵循低内存／省流设置"
            : s.paused
              ? "动态已暂停"
              : `云雾始终保留 · 正常 1×${ready ? "" : " · 素材准备中"}`;
  }
  function rebuild() {
    const time =
      Number(animations[0]?.currentTime) || config.period * config.initialPhase;
    animations.forEach((a) => a.cancel());
    animations = [];
    root.replaceChildren();
    const ticket = ++generation;
    const policy = controller.motionState();
    if (policy.saveData || policy.reduced) {
      root.dataset.ready = "policy";
      state();
      return;
    }
    root.dataset.ready = "false";
    const p = media.matches ? assets.mobile : assets.desktop,
      profile = media.matches ? config.mobile : config.desktop,
      b = p.bounds;
    Object.assign(root.style, {
      left: `${b.x * 100}%`,
      top: `${b.y * 100}%`,
      width: `${b.width * 100}%`,
      height: `${b.height * 100}%`,
      opacity: String(profile.strength),
    });
    const images = p.poses.map((src, index) => {
      const image = new Image();
      image.alt = "";
      image.decoding = "async";
      image.src = src;
      root.append(image);
      const a = image.animate(
        [
          { opacity: index ? config.blendRange[0] : config.blendRange[1] },
          { opacity: index ? config.blendRange[1] : config.blendRange[0] },
          { opacity: index ? config.blendRange[0] : config.blendRange[1] },
        ],
        {
          duration: config.period,
          iterations: Infinity,
          easing: "ease-in-out",
        },
      );
      a.currentTime = time;
      a.pause();
      animations.push(a);
      return image;
    });
    Promise.allSettled(images.map((image) => image.decode())).then(
      (results) => {
        if (ticket !== generation) return;
        root.dataset.ready = results.every((r) => r.status === "fulfilled")
          ? "true"
          : "error";
        state();
      },
    );
    state();
  }
  controller.setAmbientLightSuppressed(true);
  const environment = world.querySelector(".environment")!;
  const observer = new MutationObserver(state);
  observer.observe(environment, {
    attributes: true,
    attributeFilter: [
      "style",
      "data-running",
      "data-paused",
      "data-comparison",
      "data-ambient-light-suppressed",
    ],
  });
  media.addEventListener("change", rebuild);
  addEventListener("pagehide", () => animations.forEach((a) => a.pause()));
  addEventListener("pageshow", state);
  rebuild();
}
