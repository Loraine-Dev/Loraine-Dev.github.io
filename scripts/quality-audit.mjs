import lighthouse from "lighthouse";
import * as chromeLauncher from "chrome-launcher";
import { chromium } from "playwright";
import { writeFile, mkdir } from "node:fs/promises";
const label = process.argv[2] || "baseline",
  count = Number(process.argv[3] || 3),
  base = process.env.AUDIT_URL || "http://127.0.0.1:4177/";
const out = `artifacts/final-quality/${label}`;
await mkdir(out, { recursive: true });
const chrome = await chromeLauncher.launch({
  chromePath: chromium.executablePath(),
  chromeFlags: ["--headless", "--no-sandbox", "--enable-unsafe-swiftshader"],
});
const runs = [];
try {
  for (let i = 1; i <= count; i++) {
    const r = await lighthouse(base, {
      port: chrome.port,
      output: ["json", "html"],
      logLevel: "error",
      onlyCategories: ["performance", "accessibility", "best-practices", "seo"],
    });
    await writeFile(`${out}/home-${i}.json`, r.report[0]);
    await writeFile(`${out}/home-${i}.html`, r.report[1]);
    const a = r.lhr.audits;
    const run = {
      run: i,
      url: base,
      version: r.lhr.lighthouseVersion,
      categories: Object.fromEntries(
        Object.entries(r.lhr.categories).map(([k, v]) => [
          k,
          Math.round(v.score * 100),
        ]),
      ),
      metrics: Object.fromEntries(
        [
          "first-contentful-paint",
          "largest-contentful-paint",
          "total-blocking-time",
          "cumulative-layout-shift",
          "speed-index",
        ].map((k) => [k, a[k].numericValue]),
      ),
      lcp: a["lcp-discovery-insight"]?.details,
      breakdown: a["lcp-breakdown-insight"]?.details,
    };
    runs.push(run);
    console.log(JSON.stringify(run));
  }
} finally {
  await chrome.kill();
  await writeFile(`${out}/summary.json`, JSON.stringify(runs, null, 2));
}
