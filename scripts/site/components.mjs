import { escape as e } from "./markdown.mjs";
export const routes = [
  ["", "首页", "HOME"],
  ["works", "计划作品", "WORKS"],
  ["philosophy", "创作理念", "PHILOSOPHY"],
  ["about", "关于弥洛生", "ABOUT"],
  ["journal", "创作记录", "JOURNAL"],
  ["contact", "联系", "CONTACT"],
];
export const pathTo = (base, route) => `${base}${route ? route + "/" : ""}`;
export function navigation(base, active, home = false) {
  const links = routes
    .map(
      ([slug, zh, en]) =>
        `<a href="${pathTo(base, slug)}" ${slug === (active.startsWith("journal/") ? "journal" : active) ? 'aria-current="page"' : ""}><span>${zh}</span><small>${en}</small></a>`,
    )
    .join("");
  return `<header class="${home ? "world-header" : "site-header"}"><a class="small-brand" href="${base}" aria-label="MILOQEN 弥洛生 首页"><img src="${base}images/mark.svg" width="26" height="26" alt=""><span>MILOQEN</span></a><nav class="desktop-nav" aria-label="主导航">${links}</nav><details class="mobile-menu"><summary aria-label="打开网站导航">导航 <span aria-hidden="true">＋</span></summary><nav aria-label="移动导航">${links}</nav></details></header>`;
}
export function footer(base, data) {
  return `<footer class="site-footer"><div class="footer-brand"><img src="${base}images/mark.svg" width="40" height="40" alt=""><p>${e(data.brand.name)} <span>${e(data.brand.english)}</span></p></div><p class="footer-motto">${e(data.brand.tagline)}</p><div class="footer-bottom"><span>原创游戏 · 互动想象</span><a href="${data.github}" target="_blank" rel="noopener noreferrer">GITHUB ↗<span class="sr-only">（新窗口）</span></a><a href="${base}#top">回到初见 ↑</a></div></footer>`;
}
export function meta(title, description, route = "") {
  const url = `https://loraine-dev.github.io/${route}`;
  return `<title>${e(title)}</title><meta name="description" content="${e(description)}"><link rel="canonical" href="${url}"><meta property="og:title" content="${e(title)}"><meta property="og:description" content="${e(description)}"><meta property="og:type" content="website"><meta property="og:url" content="${url}"><meta property="og:image" content="https://loraine-dev.github.io/art/world-tree/world-desktop.webp"><meta name="twitter:card" content="summary_large_image"><meta name="robots" content="index,follow">`;
}
export const label = (number, en, zh) =>
  `<p class="section-label"><span>${number}</span> ${en} <i>${zh}</i></p>`;
export const arrowLink = (href, text) =>
  `<a class="text-link" href="${href}">${text}<span aria-hidden="true">↗</span></a>`;
export function scoreArt() {
  return `<div class="score-art" role="img" aria-label="两条不同节奏在谱面中相遇的原创图形概念，并非游戏画面"><svg viewBox="0 0 1000 620" aria-hidden="true"><defs><pattern id="score-grid" width="100" height="100" patternUnits="userSpaceOnUse"><path d="M100 0H0V100" fill="none" stroke="currentColor" stroke-width=".6" opacity=".15"/></pattern></defs><rect width="1000" height="620" fill="url(#score-grid)"/><g fill="none" stroke="currentColor"><path d="M40 420H195L285 190L378 420H530L620 190L710 420H960" stroke-width="2" opacity=".65"/><path d="M40 310H245L335 430L428 310H580L670 80L760 310H960" stroke-width="2" opacity=".45"/><path d="M40 310H960M40 420H960" opacity=".12"/></g><g fill="currentColor"><circle cx="285" cy="190" r="15"/><circle cx="530" cy="420" r="8"/><circle cx="670" cy="80" r="11"/><circle cx="428" cy="310" r="8"/></g></svg><div class="score-caption"><span>两个节奏，一次相遇。</span><small>原创图形概念 · 非游戏画面</small></div></div>`;
}
