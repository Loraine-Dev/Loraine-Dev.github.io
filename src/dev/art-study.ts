import type { createEnvironment } from "../scenes/environment";
export function mountArtStudy(
  controller: ReturnType<typeof createEnvironment>,
) {
  if (!import.meta.env.DEV) return;
  const group = document.createElement("aside");
  group.id = "art-study";
  group.setAttribute("aria-label", "云隙透光美术对照");
  const title = document.createElement("p");
  title.textContent = "云隙透光 · 单一改动对照";
  group.append(title);
  const buttons = [false, true].map((on) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = on ? "改动开启" : "改动关闭";
    button.addEventListener("click", () => choose(on));
    group.append(button);
    return button;
  });
  const note = document.createElement("small");
  note.textContent = "云雾与镜头始终保留 · 正常 1×";
  group.append(note);
  const style = document.createElement("style");
  style.textContent = `#art-study{position:fixed;z-index:901;left:18px;bottom:18px;padding:10px 12px;background:#08121aeb;border:1px solid #c2b08b66;border-radius:3px;color:#e1dfd7;font:12px/1.5 Arial,"Microsoft Yahei",sans-serif}#art-study p{margin:0 0 7px}#art-study button{border:0;padding:7px 12px;margin-right:4px;background:#25303b;color:#cad4d9;border-radius:2px}#art-study button[aria-pressed=true]{background:#d7c39b;color:#09121b}#art-study small{display:block;margin-top:7px;color:#a3b1b9;font-size:10px}body:has(#art-study) #motion-compare{display:none}.environment[data-light-study=on] .waterLight{mix-blend-mode:screen}.environment[data-light-study=on] .waterLight .environment-drift{background:radial-gradient(ellipse 4.5% 16% at var(--reflection-x) var(--reflection-y),#e9cd96 0%,#d8b67488 38%,transparent 100%)}.environment[data-light-study=on] .canopy-shaft-1{opacity:.28}`;
  function choose(on: boolean) {
    controller.setLightStudy(on);
    buttons.forEach((b, i) =>
      b.setAttribute("aria-pressed", String((i === 1) === on)),
    );
  }
  document.head.append(style);
  document.body.append(group);
  choose(new URLSearchParams(location.search).get("study") !== "off");
}
