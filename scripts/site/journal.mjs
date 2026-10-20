import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { renderMarkdown } from "./markdown.mjs";
export async function loadJournal(directory) {
  const posts = [];
  for (const name of await readdir(directory)) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*\.md$/.test(name)) continue;
    const source = (await readFile(join(directory, name), "utf8")).replace(
        /\r/g,
        "",
      ),
      match = source.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    if (!match) throw new Error(`Missing JSON front matter: ${name}`);
    const front = JSON.parse(match[1]);
    if (front.published !== true) continue;
    if (
      ![front.title, front.summary].every(
        (s) => typeof s === "string" && s.trim(),
      ) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(front.date) ||
      !Number.isFinite(Date.parse(front.date)) ||
      new Date(front.date).toISOString().slice(0, 10) !== front.date
    )
      throw new Error(`Invalid metadata: ${name}`);
    posts.push({
      ...front,
      slug: name.slice(0, -3),
      html: renderMarkdown(match[2]),
    });
  }
  return posts.sort((a, b) => b.date.localeCompare(a.date));
}
