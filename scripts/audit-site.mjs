import lighthouse from "lighthouse";
import * as chromeLauncher from "chrome-launcher";
import { chromium } from "playwright";
import { writeFile, mkdir } from "node:fs/promises";
await mkdir("artifacts/complete-site", { recursive: true });
const chrome = await chromeLauncher.launch({
  chromePath: chromium.executablePath(),
  chromeFlags: ["--headless", "--no-sandbox", "--enable-unsafe-swiftshader"],
});
try {
  for (const route of ["", "philosophy/"]) {
    const name = route ? "philosophy" : "home";
    const result = await lighthouse("http://127.0.0.1:4177/" + route, {
      port: chrome.port,
      output: ["json", "html"],
      logLevel: "error",
      onlyCategories: ["performance", "accessibility", "best-practices", "seo"],
    });
    await writeFile(
      `artifacts/complete-site/lighthouse-${name}.json`,
      result.report[0],
    );
    await writeFile(
      `artifacts/complete-site/lighthouse-${name}.html`,
      result.report[1],
    );
    console.log(
      JSON.stringify(
        {
          route,
          categories: Object.fromEntries(
            Object.entries(result.lhr.categories).map(([k, v]) => [k, v.score]),
          ),
          metrics: Object.fromEntries(
            [
              "first-contentful-paint",
              "largest-contentful-paint",
              "total-blocking-time",
              "cumulative-layout-shift",
              "speed-index",
            ].map((k) => [k, result.lhr.audits[k]?.displayValue]),
          ),
          issues: Object.entries(result.lhr.audits)
            .filter(([k, v]) => v.score !== null && v.score < 1 && v.details)
            .map(([k, v]) => ({ id: k, title: v.title, value: v.displayValue }))
            .slice(0, 20),
        },
        null,
        2,
      ),
    );
  }
} finally {
  await chrome.kill();
}
