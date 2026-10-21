type Mode = "all" | "off" | "rays" | "water" | "tree" | "clouds";
// Development-only review controls, excluded from production.
export function mountMotionCompare(
  select: (still: boolean, mode: Mode) => void,
) {
  const group = document.createElement("div");
  group.id = "motion-compare";
  group.setAttribute("role", "group");
  group.ariaLabel = "仅开发预览：分项动态验收";
  const style = document.createElement("style");
  style.textContent =
    '#motion-compare{position:fixed;z-index:900;left:12px;bottom:12px;max-width:calc(100vw - 24px);display:flex;flex-wrap:wrap;gap:3px;padding:5px;background:#07111aee;border:1px solid #81909880;border-radius:4px;font:12px/1.4 Arial,sans-serif}#motion-compare button{border:0;background:transparent;color:#bdc8ce;padding:9px;border-radius:2px}#motion-compare button[aria-pressed="true"]{color:#07111a;background:#e1d4ba}';
  const options: [Mode, string][] = [
    ["off", "全部关闭"],
    ["all", "正常动态"],
    ["rays", "仅丁达尔光"],
    ["water", "仅水面"],
    ["tree", "仅世界树"],
    ["clouds", "仅云雾"],
  ];
  const buttons = options.map(([mode, label]) => {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = label;
    b.onclick = () => choose(mode);
    group.append(b);
    return b;
  });
  function choose(mode: Mode) {
    buttons.forEach((b, i) =>
      b.setAttribute("aria-pressed", String(options[i][0] === mode)),
    );
    select(mode === "off", mode);
  }
  document.head.append(style);
  document.body.append(group);
  const requested = new URLSearchParams(location.search).get("motionMode");
  const mode = options.some(([m]) => m === requested)
    ? (requested as Mode)
    : new URLSearchParams(location.search).get("motionCompare") === "static"
      ? "off"
      : "all";
  choose(mode);
}
