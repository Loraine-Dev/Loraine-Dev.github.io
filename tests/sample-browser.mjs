import{chromium}from'playwright';import assert from'node:assert/strict';
const browser=await chromium.launch({args:['--enable-unsafe-swiftshader']});try{
 for(const viewport of[{width:1440,height:900},{width:390,height:844}])for(const effect of['water','light']){
 const p=await browser.newPage({viewport}),errors=[],images=[];p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text())});p.on('response',r=>{if(r.url().includes('/art/'))images.push({url:r.url(),type:r.headers()['content-type']})});
 await p.goto('http://127.0.0.1:4176/samples/?effect='+effect,{waitUntil:'networkidle'});await p.locator('.sample-material[data-state=ready]').waitFor({state:'attached'});
 assert(images.every(i=>i.type?.startsWith('image/')),'CSS masks and cloud textures must not silently load an HTML fallback: '+JSON.stringify(images.filter(i=>!i.type?.startsWith('image/'))));assert(images.some(i=>i.url.includes('/art/world-tree/cloud-bank-v2.avif')));assert(images.every(i=>!i.url.includes('/samples/art/')));
 assert.equal(await p.locator('#motion-compare').count(),0);await p.locator('#motion-toggle').click();await p.waitForTimeout(250);const frames=await p.locator('.sample-material').getAttribute('data-frames');await p.waitForTimeout(300);assert.equal(await p.locator('.sample-material').getAttribute('data-frames'),frames);
 await p.locator('#motion-toggle').click();await p.emulateMedia({reducedMotion:'reduce'});await p.waitForTimeout(180);assert.equal(await p.locator('.sample-material').evaluate(c=>getComputedStyle(c).visibility),'hidden');assert.deepEqual(errors,[]);await p.close();
 }
 const fallback=await browser.newPage();await fallback.addInitScript(()=>Object.defineProperty(window,'Worker',{value:undefined}));await fallback.goto('http://127.0.0.1:4176/samples/?effect=light');await fallback.locator('.sample-material[data-state=static-fallback]').waitFor({state:'attached'});assert(await fallback.locator('h1').isVisible());assert.equal(await fallback.locator('.environment').getAttribute('data-comparison'),'static');await fallback.close();
 console.log('PASS sample resource MIME/path, desktop/mobile material startup, no normal debug UI, pause, reduced motion and original-image fallback. Naturalness remains unapproved.');
}finally{await browser.close()}
