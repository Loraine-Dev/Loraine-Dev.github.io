import { chromium } from "playwright";
export async function checkOnline(base = "https://loraine-dev.github.io/") {
  const browser = await chromium.launch({
    args: ["--enable-unsafe-swiftshader"],
  });
  const failures = new Set(),
    pages = [];
  try {
    const context = await browser.newContext({ reducedMotion: "reduce" });
    const page = await context.newPage();
    page.on("response", (r) => {
      if (new URL(r.url()).origin === new URL(base).origin && r.status() >= 400)
        failures.add(new URL(r.url()).pathname);
    });
    page.on("requestfailed", (r) => {
      if (r.url().startsWith(base)) failures.add(new URL(r.url()).pathname);
    });
    const links = new Set();
    for (const route of [
      "",
      "works/",
      "philosophy/",
      "about/",
      "journal/",
      "contact/",
    ]) {
      const response = await page.goto(new URL(route, base).href, {
        waitUntil: "networkidle",
        timeout: 30000,
      });
      pages.push({ route, status: response?.status() });
      if (response?.status() !== 200) failures.add("/" + route);
      for (const href of await page
        .locator("a[href]")
        .evaluateAll((es) => es.map((e) => e.href)))
        if (href.startsWith(base)) links.add(href.split("#")[0]);
    }
    for (const link of [...links].slice(0, 100))
      if (
        (await context.request.get(link, { timeout: 20000 })).status() !== 200
      )
        failures.add(new URL(link).pathname);
    return {
      ok: !failures.size,
      pages,
      failedPaths: [...failures].slice(0, 30),
    };
  } finally {
    await browser.close();
  }
}
if (process.argv.includes("--after-deploy")) {
  let result;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      result = await checkOnline();
    } catch {
      result = { ok: false };
    }
    if (result.ok) break;
    await new Promise((r) => setTimeout(r, 10000));
  }
  console.log(
    result?.ok
      ? "PASS live HTTPS/pages/resources/navigation"
      : "FAIL live validation; inspect deployment, do not overwrite site",
  );
  if (!result?.ok) process.exitCode = 1;
}
