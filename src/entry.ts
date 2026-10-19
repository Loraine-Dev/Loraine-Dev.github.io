import "./styles/site.css";
import { chooseQuality } from "./scenes/policy";
import type { SceneController } from "./scenes/living-form";
const host = document.querySelector<HTMLElement>("#scene")!;
const experience = document.querySelector<HTMLElement>(".experience")!;
const toggle = document.querySelector<HTMLButtonElement>("#motion-toggle")!;
const reduce = matchMedia("(prefers-reduced-motion: reduce)");
let controller: SceneController | undefined,
  paused = false,
  startup = 0,
  started = false,
  requestOnly = false;
let cancellation = new AbortController();
function showPoster() {
  host.classList.remove("live");
  host.dataset.sceneState = "poster";
  toggle.hidden = true;
}
function updateButton() {
  if (requestOnly) {
    toggle.disabled = false;
    toggle.setAttribute("aria-pressed", "false");
    toggle.innerHTML = "开启实时形态 <span>↗</span>";
    return;
  }
  toggle.disabled = reduce.matches;
  toggle.setAttribute("aria-pressed", String(paused || reduce.matches));
  toggle.innerHTML = reduce.matches
    ? "动态已简化 <span>—</span>"
    : paused
      ? "继续动态 <span>▷</span>"
      : "暂停动态 <span>Ⅱ</span>";
}
toggle.addEventListener("click", () => {
  if (requestOnly) {
    requestOnly = false;
    toggle.hidden = true;
    void start(true);
    return;
  }
  paused = !paused;
  controller?.setPaused(paused);
  updateButton();
});
reduce.addEventListener("change", updateButton);
async function start(force = false) {
  const ticket = ++startup;
  started = true;
  cancellation.abort();
  cancellation = new AbortController();
  const signal = cancellation.signal;
  const nav = navigator as Navigator & {
    deviceMemory?: number;
    connection?: { saveData?: boolean };
  };
  const quality = chooseQuality({
    width: innerWidth,
    cores: nav.hardwareConcurrency || 8,
    memory: nav.deviceMemory || 8,
    saveData: !!nav.connection?.saveData,
  });
  host.dataset.quality = quality.mode;
  if (quality.mode === "poster") return;
  const probe = document.createElement("canvas");
  const gl = probe.getContext("webgl2");
  if (!gl) {
    showPoster();
    return;
  }
  const debug = gl.getExtension("WEBGL_debug_renderer_info");
  const renderer = debug
    ? String(gl.getParameter(debug.UNMASKED_RENDERER_WEBGL))
    : "";
  const software =
    /swiftshader|llvmpipe|software|softpipe|microsoft basic render/i.test(
      renderer,
    );
  gl.getExtension("WEBGL_lose_context")?.loseContext();
  if (software && !force) {
    host.dataset.fallbackReason = "software-gpu";
    requestOnly = true;
    toggle.hidden = false;
    updateButton();
    return;
  }
  try {
    const { createLivingForm } = await import("./scenes/living-form");
    if (ticket !== startup || signal.aborted) return;
    const fresh = await createLivingForm({
      host,
      experience,
      cancellation: signal,
      limited: software,
      onFailure: () => {
        if (ticket === startup) showPoster();
      },
    });
    if (ticket !== startup || signal.aborted) {
      fresh.dispose();
      return;
    }
    controller = fresh;
    controller.setPaused(paused);
    toggle.hidden = false;
    updateButton();
  } catch (error) {
    if (ticket !== startup || signal.aborted) return;
    host.dataset.failure =
      error instanceof Error ? error.message : String(error);
    showPoster();
  }
}
if (document.readyState === "complete") setTimeout(() => void start(), 350);
else
  addEventListener("load", () => setTimeout(() => void start(), 350), {
    once: true,
  });
matchMedia("(max-width:759px)").addEventListener("change", () => {
  if (!started) return;
  controller?.dispose();
  controller = undefined;
  requestOnly = false;
  showPoster();
  void start();
});
