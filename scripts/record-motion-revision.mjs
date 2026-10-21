import { chromium } from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
const out=process.env.REVIEW_OUT || 'artifacts/motion-revision-final';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({args:['--enable-unsafe-swiftshader']});
function encode(input,output){execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-i',input,'-threads','1','-c:v','libx264','-crf','18','-pix_fmt','yuv420p','-movflags','+faststart',output]);}
try {
 for(const [device,viewport] of [['desktop',{width:1440,height:900}],['mobile',{width:390,height:844}]]) {
  for(const [id,label] of [['rays','仅丁达尔光'],['water','仅水面'],['tree','仅世界树'],['normal',null]]) {
   const context=await browser.newContext({viewport,isMobile:device==='mobile',hasTouch:device==='mobile',reducedMotion:'no-preference',recordVideo:{dir:out,size:viewport}});
   const page=await context.newPage(),errors=[],marks=[],start=Date.now();
   page.on('pageerror',e=>errors.push(e.message));
   page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
   const mark=state=>marks.push({state,seconds:(Date.now()-start)/1000});
   await page.goto(id==='normal'?'http://127.0.0.1:4177/':'http://127.0.0.1:4176/?motionMode=off',{waitUntil:'networkidle'});
   await page.locator('.living-scene[data-state=ready]').waitFor({state:'attached'});
   if(id==='normal') {
    if(await page.locator('#motion-compare').count())throw Error('Debug controls cannot appear in normal production recording');
    mark('normal; no debug UI; no input');
    for(const second of [0,5,10,20,30]) {
      if(second)await page.waitForTimeout(second===5||second===10?5000:10000);
      await page.screenshot({path:`${out}/${device}-normal-${second}s.png`});
    }
    await page.waitForTimeout(1000);
   } else {
    mark('off');await page.waitForTimeout(4000);
    await page.screenshot({path:`${out}/${device}-${id}-off.png`});
    await page.getByRole('button',{name:label,exact:true}).click();mark(id+' only on');
    for(const second of [0,5,10,14]) {
      if(second)await page.waitForTimeout(second===14?4000:5000);
      await page.screenshot({path:`${out}/${device}-${id}-${second}s.png`});
    }
    await page.getByRole('button',{name:'全部关闭',exact:true}).click();mark('off');
    await page.waitForTimeout(4000);
   }
   const status=await page.locator('.living-scene').evaluate(c=>({...c.dataset}));
   const video=page.video();await context.close();
   await video.saveAs(`${out}/${device}-${id}.webm`);
   encode(`${out}/${device}-${id}.webm`,`${out}/${device}-${id}.mp4`);
   if(id==='normal')execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-ss','2','-i',`${out}/${device}-normal.mp4`,'-t','30','-threads','1','-c:v','libx264','-crf','18','-pix_fmt','yuv420p','-movflags','+faststart',`${out}/${device}-normal-30s.mp4`]);
   await writeFile(`${out}/${device}-${id}.json`,JSON.stringify({device,viewport,normalSpeed:true,debugUI:id!=='normal',physicalDevice:false,marks,status,errors},null,2));
   console.log(device,id,JSON.stringify({errors,renderer:status.renderer}));
  }
 }
}finally{await browser.close();}
