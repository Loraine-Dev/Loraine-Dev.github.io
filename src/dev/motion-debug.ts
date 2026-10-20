import type { createEnvironment } from "../scenes/environment";
type Controller = ReturnType<typeof createEnvironment>;
export function mountMotionDebug(controller: Controller) {
  const panel = document.createElement("details");
  panel.id = "motion-debug";
  panel.open = true;
  const style = document.createElement("style");
  style.textContent = `#motion-debug{position:fixed;z-index:1000;right:10px;top:10px;width:min(370px,calc(100vw - 20px));max-height:90svh;overflow:auto;background:#07111aef;color:#edf3f8;border:1px solid #7893a3;padding:12px;font:12px/1.6 Consolas,"Microsoft YaHei",monospace;box-shadow:0 8px 30px #0008}#motion-debug summary{cursor:pointer;font-size:14px}#motion-debug p{margin:6px 0;white-space:pre-wrap;overflow-wrap:anywhere}#motion-debug fieldset{margin:8px 0;padding:6px;border:1px solid #526775}#motion-debug label{display:block;padding:3px 0}#motion-debug input{accent-color:#8bcbfa;margin-right:8px}#motion-debug select,#motion-debug button{color:#edf3f8;background:#172937;border:1px solid #7893a3;padding:5px}#motion-debug progress{width:100%;height:7px}#motion-debug .muted{color:#a5b8c7}#motion-debug [data-errors]{color:#ffc6ac}`;
  panel.innerHTML = "<summary>动画诊断 · 仅开发模式</summary>";
  const add = (tag: string, text = "") => {
    const el = document.createElement(tag);
    el.textContent = text;
    panel.append(el);
    return el;
  };
  const version = add("p", "核对运行版本…");
  const status = add("p");
  status.dataset.status = "";
  const policy = add("p");
  policy.dataset.policy = "";
  const engine = add("p");
  const field = document.createElement("fieldset");
  const legend = document.createElement("legend");
  legend.textContent = "独立开关 / 实时进度";
  field.append(legend);
  panel.append(field);
  const names: Record<string, string> = {
    farFog: "远处云雾",
    midFog: "山间云雾",
    treeLight: "世界树局部光",
    waterLight: "水面反射光",
  };
  const rows = new Map<
    string,
    { check: HTMLInputElement; text: HTMLElement; bar: HTMLProgressElement }
  >();
  for (const module of controller.snapshot().modules) {
    const label = document.createElement("label"),
      check = document.createElement("input");
    check.type = "checkbox";
    check.checked = module.enabled;
    check.dataset.module = module.name;
    check.addEventListener("change", () =>
      controller.setEffect(module.name, check.checked),
    );
    const title = document.createElement("span");
    title.textContent = names[module.name];
    const text = document.createElement("p");
    text.dataset.moduleState = module.name;
    const bar = document.createElement("progress");
    bar.max = 1;
    bar.setAttribute("aria-label", names[module.name] + " 动画进度");
    label.append(check, title);
    field.append(label, text, bar);
    rows.set(module.name, { check, text, bar });
  }
  const waterfall = document.createElement("p");
  waterfall.textContent = "瀑布：静态 / 源图内烘焙，无独立水流素材";
  field.append(waterfall);
  const pause = document.createElement("button");
  pause.type = "button";
  pause.textContent = "暂停 / 恢复全部";
  pause.addEventListener("click", () =>
    document.querySelector<HTMLButtonElement>("#motion-toggle")?.click(),
  );
  panel.append(pause);
  const rateLabel = document.createElement("label");
  rateLabel.textContent = "临时调试速度（不写入配置） ";
  const rate = document.createElement("select");
  rate.setAttribute("aria-label", "临时调试速度");
  for (const value of [0.5, 1, 2, 4]) {
    const option = document.createElement("option");
    option.value = String(value);
    option.textContent = `${value}×`;
    rate.append(option);
  }
  rate.value = "1";
  rate.addEventListener("change", () => controller.setRate(Number(rate.value)));
  rateLabel.append(rate);
  panel.append(rateLabel);
  const resources = add("p");
  resources.dataset.resources = "";
  const errors = add("p");
  errors.dataset.errors = "";
  const note = add(
    "p",
    "时间轴推进 ≠ 像素变化 ≠ 肉眼可见。正常录屏与截图对比请使用不带 debugMotion 的地址。",
  );
  note.className = "muted";
  const issues: string[] = [];
  addEventListener("error", (e) => {
    issues.push(e.message || "资源/运行错误");
  });
  addEventListener("unhandledrejection", (e) => {
    issues.push(String(e.reason));
  });
  const assets = new Map<string, string>();
  function probe(url: string) {
    if (assets.has(url)) return;
    assets.set(url, "loading");
    const image = new Image();
    image.onload = () =>
      assets.set(url, `loaded ${image.naturalWidth}×${image.naturalHeight}`);
    image.onerror = () => {
      assets.set(url, "ERROR");
      issues.push(`资源失败：${url}`);
    };
    image.src = url;
  }
  const updateText = (el: HTMLElement, value: string) => {
    if (el.textContent !== value) el.textContent = value;
  };
  function update() {
    const s = controller.snapshot();
    const reasons = [
      !s.enabled && "总开关关闭",
      !s.armed && "等待交互",
      s.paused && "手动暂停",
      s.reduced && "减少动态",
      s.hidden && "页面后台",
      !s.active && "场景离屏",
      s.saveData && "低内存/省流量",
    ].filter(Boolean);
    updateText(
      status,
      `${s.revision} | ${reasons.length ? "暂停/禁用：" + reasons.join("、") : "环境循环启用"} | ${s.playbackRate}×`,
    );
    updateText(
      policy,
      `visible=${!s.hidden} · IO=${s.active} · reduced=${s.reduced}\n省流量/低内存=${s.saveData} · 自动初始化=${s.armed}`,
    );
    const host = document.querySelector<HTMLElement>("#world-canvas");
    updateText(
      engine,
      `环境：Web Animations API；GSAP：未使用\n镜头：${host?.dataset.state} / ${host?.dataset.renderStrategy || "等待初始化"}，绘制=${host?.dataset.frames || 0}（静置不必增加）`,
    );
    for (const module of s.modules) {
      const row = rows.get(module.name)!;
      row.check.checked = module.enabled;
      const a = module.animations[module.animations.length - 1],
        move = module.animations[0];
      updateText(
        row.text,
        `${module.initialized ? "初始化成功" : "未初始化"} | ${a?.state || "off"}\n位移 ${((move?.time || 0) / 1000).toFixed(1)}s / ${((move?.progress || 0) * 100).toFixed(1)}% · 明暗 ${((a?.time || 0) / 1000).toFixed(1)}s · 光强 ${Number(module.opacity).toFixed(3)}`,
      );
      row.bar.value = a?.progress || 0;
    }
    s.assets.forEach(probe);
    updateText(
      resources,
      "素材：" +
        [...assets]
          .map(([url, state]) => `${url.split("/").pop()}: ${state}`)
          .join("\n"),
    );
    const failure = host?.dataset.failure;
    updateText(
      errors,
      issues.length || failure
        ? `错误：${[...new Set([...issues, ...(failure ? [failure] : [])])].join("\n")}`
        : "运行错误：未捕获到（不代表视觉已合格）",
    );
  }
  document.head.append(style);
  document.body.append(panel);
  update();
  let timer: ReturnType<typeof setInterval>;
  const resume = () => {
    clearInterval(timer);
    update();
    timer = setInterval(update, 300);
  };
  resume();
  addEventListener("pagehide", () => clearInterval(timer));
  addEventListener("pageshow", resume);
  void fetch("/__motion-version", { cache: "no-store" })
    .then((r) => r.json())
    .then((v) => {
      version.textContent = `${v.branch} @ ${v.head}${v.dirty ? " + 工作区修改" : ""}\n${v.root}\n服务=${v.mode} / ${v.motionRevision}`;
    })
    .catch(() => {
      version.textContent = "版本接口不可用；请确认是本地 Vite 开发服务器。";
    });
}
