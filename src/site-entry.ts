import "./styles/site.css";
import "./styles/editorial.css";
document
  .querySelectorAll<HTMLDetailsElement>(".mobile-menu")
  .forEach((menu) => {
    menu.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        menu.open = false;
        menu.querySelector("summary")?.focus();
      }
    });
    menu.querySelectorAll("a").forEach((a) =>
      a.addEventListener("click", () => {
        menu.open = false;
      }),
    );
    document.addEventListener("click", (event) => {
      if (!menu.contains(event.target as Node)) menu.open = false;
    });
  });
