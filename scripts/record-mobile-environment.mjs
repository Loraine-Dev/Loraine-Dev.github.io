import { chromium } from "playwright";
const b = await chromium.launch({ args: ["--enable-unsafe-swiftshader"] });
const c = await b.newContext({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
  recordVideo: { dir: "artifacts/living", size: { width: 390, height: 844 } },
});
const p = await c.newPage();
await p.goto("http://127.0.0.1:4176/", { waitUntil: "networkidle" });
// Record the real mobile policy: activate with input, then hold the initial view.
await p.mouse.move(180, 400);
await p.mouse.wheel(0, 1);
await p.waitForFunction(()=>document.querySelector('.environment').dataset.running==='4');
await p.evaluate(()=>scrollTo({top:0,behavior:'instant'}));
await p.waitForTimeout(30000);
console.log("Mobile ambient actual 30 seconds");
await p.locator(".explore").tap();
await p.waitForTimeout(5000);
await p.screenshot({ path: "artifacts/living/mobile-entered.png" });
await p.locator(".return").tap();
await p.waitForTimeout(1500);
const v = p.video();
await c.close();
await v.saveAs("artifacts/living/mobile-real-time.webm");
await b.close();
