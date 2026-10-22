export const escape = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const inline = (s) =>
  escape(s)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\[([^\]]+)\]\(([^\s)]+)\)/g, (all, label, url) =>
      /^https:\/\//i.test(url)
        ? `<a href="${url}" rel="noopener noreferrer">${label} ↗</a>`
        : label,
    );
export function renderMarkdown(markdown) {
  return markdown
    .replace(/\r/g, "")
    .trim()
    .split(/\n\s*\n/)
    .map((block) => {
      if (/^#{1,3} /.test(block))
        return block
          .split("\n")
          .map((line) => {
            const match = line.match(/^(#{1,3}) (.*)$/);
            return match
              ? `<h${match[1].length}>${inline(match[2])}</h${match[1].length}>`
              : `<p>${inline(line)}</p>`;
          })
          .join("");
      if (block.split("\n").every((line) => /^- /.test(line)))
        return `<ul>${block
          .split("\n")
          .map((line) => `<li>${inline(line.slice(2))}</li>`)
          .join("")}</ul>`;
      if (/^> /.test(block))
        return `<blockquote>${inline(block.replace(/^> /gm, "").replace(/\n/g, " "))}</blockquote>`;
      return `<p>${inline(block.replace(/\n/g, " "))}</p>`;
    })
    .join("\n");
}
