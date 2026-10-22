import{chromium}from'playwright';import{mkdir,writeFile}from'node:fs/promises';
await mkdir('artifacts/material-samples',{recursive:true});const browser=await chromium.launch({args:['--enable-unsafe-swiftshader']});const results=[];
try{for(const[device,viewport]of[['desktop',{width:1440,height:900}],['mobile',{width:390,height:844}]])for(const effect of['water','light'])for(const candidate of[false,true]){
 const page=await browser.newPage({viewport}),errors=[],responses=[];
 await page.addInitScript(()=>{window.sampleTasks=[];new PerformanceObserver(l=>{for(const e of l.getEntries())window.sampleTasks.push({start:e.startTime,duration:e.duration})}).observe({type:'longtask',buffered:true})});
 const cdp=await page.context().newCDPSession(page);await cdp.send('Network.enable');const artRequests=new Set();let artEncodedNetworkBytes=0;
 cdp.on('Network.responseReceived',e=>{if(e.response.url.includes('/art/'))artRequests.add(e.requestId)});cdp.on('Network.loadingFinished',e=>{if(artRequests.has(e.requestId))artEncodedNetworkBytes+=e.encodedDataLength});
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.url().includes('/art/'))responses.push({url:new URL(r.url()).pathname,declaredBytes:Number(r.headers()['content-length']||0)})});
 await page.goto(candidate?`http://127.0.0.1:4176/samples/?effect=${effect}`:`http://127.0.0.1:4176/?motionMode=${effect==='light'?'rays':'water'}`,{waitUntil:'networkidle'});
 const selector=candidate?'.sample-material':'.living-scene';await page.locator(selector+'[data-state=ready]').waitFor({state:'attached'});
 const start=await page.evaluate(()=>performance.now()),frames=Number(await page.locator(selector).getAttribute(candidate?'data-frames':'data-draw-count'));
 await page.waitForTimeout(10000);
 const result=await page.evaluate(({start,selector})=>{const c=document.querySelector(selector);return{state:{...c.dataset},tasks:window.sampleTasks.filter(t=>t.start>=start),end:performance.now()}},{start,selector});
 const after=Number(result.state[candidate?'frames':'drawCount']);results.push({device,effect,candidate,viewport,environment:'Local Chromium software graphics, no CPU/network throttle, no recording. One run, not a physical phone.',afterReadyWindowMs:Math.round(result.end-start),mainLongTasks:result.tasks,materialSubmissionsPerSecond:((after-frames)/(result.end-start)*1000).toFixed(2),artEncodedNetworkBytes,artDeclaredResponseBytesIncludingCache:responses.reduce((sum,r)=>sum+r.declaredBytes,0),responses,state:result.state,errors});console.log(device,effect,candidate?'sample':'stable',JSON.stringify(results.at(-1)));await page.close();
}}finally{await browser.close()}
await writeFile('artifacts/material-samples/performance.json',JSON.stringify(results,null,2));
