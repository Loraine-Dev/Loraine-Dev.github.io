// Imported only in Vite development. Never part of the production page.
export function mountMotionCompare(setStatic: (value: boolean) => void) {
  const group = document.createElement("div");
  group.id = "motion-compare";
  group.setAttribute("role", "group");
  group.setAttribute("aria-label", "仅开发预览：静态动态对比");
  const style = document.createElement("style");
  style.textContent =
    '#motion-compare{position:fixed;z-index:900;left:18px;bottom:18px;display:flex;gap:3px;padding:4px;background:#07111aeb;border:1px solid #81909880;border-radius:4px;font:12px/1.4 Arial,sans-serif}#motion-compare button{border:0;background:transparent;color:#bdc8ce;padding:8px 13px;border-radius:2px}#motion-compare button[aria-pressed="true"]{color:#07111a;background:#e1d4ba}';
  const buttons = [true, false].map((still) => {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = still ? "静态" : "动态";
    b.setAttribute("aria-pressed", String(!still));
    b.addEventListener("click", () => choose(still));
    group.append(b);
    return b;
  });
  function choose(still: boolean) {
    buttons.forEach((b, i) =>
      b.setAttribute("aria-pressed", String((i === 0) === still)),
    );
    setStatic(still);
  }
  document.head.append(style);
  document.body.append(group);
  if (new URLSearchParams(location.search).get("motionCompare") === "static")
    choose(true);
}
