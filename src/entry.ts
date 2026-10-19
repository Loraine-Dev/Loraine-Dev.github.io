import "./styles/site.css";
import type { WorldController } from "./scenes/world-scene";
import { createEnvironment } from "./scenes/environment";
const host = document.querySelector<HTMLElement>("#world-canvas")!;
const experience = document.querySelector<HTMLElement>(".world-experience")!;
const stage = document.querySelector<HTMLElement>(".world-stage")!;
const environment = createEnvironment(
  document.querySelector<HTMLElement>(".world-layer")!,
  stage,
);
const toggle = document.querySelector<HTMLButtonElement>("#motion-toggle")!;
const back = document.querySelector<HTMLAnchorElement>(".return")!;
const copy = document.querySelector<HTMLElement>(".brand-copy")!;
const reduce = matchMedia("(prefers-reduced-motion:reduce)");
const mobile = matchMedia("(max-width:759px), (max-aspect-ratio:4/5)");
let instance: WorldController | undefined,
  paused = false,
  generation = 0,
  started = false,
  deferred = false,
  activated = false,
  pending = new AbortController();
function poster() {
  host.classList.remove("is-ready");
  host.dataset.state = "poster";
  experience.dataset.mode = "static";
  toggle.hidden = !environment.available;
  environment.reset();
  updateProgress();
}
function label() {
  toggle.disabled = reduce.matches;
  toggle.setAttribute("aria-pressed", String(paused || reduce.matches));
  toggle.innerHTML = reduce.matches
    ? '静态画面 <span aria-hidden="true">—</span>'
    : paused
      ? '继续动态 <span aria-hidden="true">▷</span>'
      : '暂停动态 <span aria-hidden="true">Ⅱ</span>';
}
function updateProgress() {
  const p = Math.min(
    1,
    Math.max(
      0,
      -experience.getBoundingClientRect().top /
        Math.max(1, experience.offsetHeight - stage.clientHeight),
    ),
  );
  experience.style.setProperty("--progress", reduce.matches ? "0" : String(p));
  back.hidden = p < 0.8;
  copy.inert =
    experience.dataset.mode === "live" && !reduce.matches && p >= 0.4;
}
addEventListener("scroll", updateProgress, { passive: true });
addEventListener("resize", updateProgress, { passive: true });
addEventListener("pageshow", updateProgress);
toggle.addEventListener("click", () => {
  paused = !paused;
  instance?.setPaused(paused);
  environment.setPaused(paused);
  label();
});
reduce.addEventListener("change", () => {
  label();
  updateProgress();
});
async function start(force = false) {
  if (force) activated = true;
  started = true;
  const ticket = ++generation;
  pending.abort();
  pending = new AbortController();
  const { signal } = pending;
  const nav = navigator as Navigator & {
    deviceMemory?: number;
    connection?: { saveData?: boolean };
  };
  if (nav.connection?.saveData || (nav.deviceMemory && nav.deviceMemory <= 2)) {
    poster();
    host.dataset.reason = "device-policy";
    return;
  }
  if (mobile.matches && !activated && !reduce.matches) {
    deferred = true;
    host.dataset.reason = "mobile-interaction";
    host.dataset.renderStrategy = "interaction";
    return;
  }
  const probe = document.createElement("canvas");
  const gl = probe.getContext("webgl2");
  if (!gl) {
    poster();
    host.dataset.reason = "no-webgl2";
    return;
  }
  const debug = gl.getExtension("WEBGL_debug_renderer_info");
  const software = debug
    ? /swiftshader|llvmpipe|software|microsoft basic render/i.test(
        String(gl.getParameter(debug.UNMASKED_RENDERER_WEBGL)),
      )
    : false;
  gl.getExtension("WEBGL_lose_context")?.loseContext();
  if ((software || mobile.matches) && !activated && !reduce.matches) {
    deferred = true;
    host.dataset.reason = software ? "software-gpu" : "mobile-interaction";
    host.dataset.renderStrategy = "interaction";
    return;
  }
  try {
    const { createWorldScene } = await import("./scenes/world-scene");
    if (ticket !== generation || signal.aborted) return;
    const controller = await createWorldScene({
      host,
      mobile: mobile.matches,
      limited: software,
      signal,
      onPose: environment.sync,
      onFailure: () => {
        if (ticket === generation) poster();
      },
    });
    if (ticket !== generation || signal.aborted) {
      controller.dispose();
      return;
    }
    instance = controller;
    host.dataset.renderStrategy = "on-demand";
    instance.setPaused(paused);
    experience.dataset.mode = "live";
    toggle.hidden = false;
    label();
    updateProgress();
  } catch (error) {
    if (signal.aborted || ticket !== generation) return;
    poster();
    host.dataset.failure =
      error instanceof Error ? error.message : String(error);
  }
}
mobile.addEventListener("change", () => {
  if (!started) return;
  instance?.dispose();
  instance = undefined;
  poster();
  void start();
});
function activate() {
  environment.activate();
  activated = true;
  if (deferred) {
    deferred = false;
    void start(true);
  }
}
document.querySelector(".explore")?.addEventListener("click", activate);
addEventListener("wheel", activate, { passive: true });
addEventListener("touchmove", activate, { passive: true });
addEventListener("keydown", (event) => {
  if (["ArrowDown", "PageDown", " "].includes(event.key)) activate();
});
if (document.readyState === "complete") setTimeout(() => void start(), 250);
else
  addEventListener("load", () => setTimeout(() => void start(), 250), {
    once: true,
  });
toggle.hidden = !environment.available;
label();
