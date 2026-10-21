import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
const out='artifacts/v1-integration/media';await mkdir(out,{recursive:true});
const browser=await chromium.launch({args:['--enable-unsafe-swiftshader']});
const encode=(input,output,tail=false)=>execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-y',...(tail?['-sseof','-30']:[]),'-i',input,'-threads','1','-c:v','libx264','-crf','18','-pix_fmt','yuv420p','-movflags','+faststart',output]);
try{for(const[device,viewport]of[['desktop',{width:1440,height:900}],['mobile',{width:390,height:844}]])for(const take of['normal','tour']){
 const context=await browser.newContext({viewport,isMobile:device==='mobile',hasTouch:device==='mobile',reducedMotion:'no-preference',recordVideo:{dir:out,size:viewport}}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url())});
 await page.goto('http://127.0.0.1:4177/',{waitUntil:'networkidle'});await page.locator('.local-material[data-effect=light][data-state=ready]').waitFor({state:'attached'});await page.locator('.local-material[data-effect=water][data-state=ready]').waitFor({state:'attached'});
 if(await page.locator('#motion-compare,#motion-debug').count())throw Error('Debug controls in normal production preview');
 if(take==='normal'){await page.waitForTimeout(32000);await page.screenshot({path:`${out}/${device}-normal.png`})}
 else{await page.waitForTimeout(5000);await page.mouse.wheel(0,650);await page.waitForTimeout(2000);await page.locator('#content').scrollIntoViewIfNeeded();await page.waitForTimeout(1500);for(const route of['works','philosophy','about','journal','contact']){await page.goto(`http://127.0.0.1:4177/${route}/`,{waitUntil:'networkidle'});await page.waitForTimeout(1800);await page.mouse.wheel(0,350);await page.waitForTimeout(700)}}
 const state=await page.locator('.local-material').evaluateAll(cs=>cs.map(c=>({...c.dataset}))),video=page.video();await context.close();const raw=`${out}/${device}-${take}.webm`;await video.saveAs(raw);encode(raw,`${out}/${device}-${take}-full.mp4`);if(take==='normal')encode(`${out}/${device}-${take}-full.mp4`,`${out}/${device}-normal-30s.mp4`,true);await writeFile(`${out}/${device}-${take}.json`,JSON.stringify({device,viewport,take,normalSpeed:true,debugUI:false,physicalPhone:false,state,errors},null,2));console.log(device,take,errors);
}}finally{await browser.close()}
