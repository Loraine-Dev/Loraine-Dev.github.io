import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import sharp from 'sharp';
const out='artifacts/targeted/art-comparison';await mkdir(out,{recursive:true});
const browser=await chromium.launch({args:['--enable-unsafe-swiftshader']});const comparisons=[];
try{for(const viewport of [{width:1440,height:900},{width:390,height:844}]){
 const decoded=[];
 for(const [name,port] of [['before',4182],['after',4177]]){
  const page=await browser.newPage({viewport});
  await page.addInitScript(()=>document.addEventListener('DOMContentLoaded',()=>document.querySelector('#motion-toggle')?.click(),{once:true}));
  await page.goto(`http://127.0.0.1:${port}/`,{waitUntil:'networkidle'});await page.locator('.living-scene[data-state=ready]').waitFor();
  await page.evaluate(()=>{document.getAnimations().forEach(a=>{a.pause();a.currentTime=5000;});});await page.waitForTimeout(500);
  const path=`${out}/${viewport.width}-${name}.png`;await page.screenshot({path});decoded.push(await sharp(path).removeAlpha().raw().toBuffer());
  comparisons.push({width:viewport.width,version:name,renderer:await page.locator('.living-scene').getAttribute('data-renderer'),phase:await page.locator('.living-scene').getAttribute('data-time')});await page.close();
 }
 let total=0,max=0;for(let i=0;i<decoded[0].length;i++){const difference=Math.abs(decoded[0][i]-decoded[1][i]);total+=difference;max=Math.max(max,difference);}
 comparisons.push({width:viewport.width,meanChannelDifference:total/decoded[0].length,maxChannelDifference:max,note:'Internal image registration/quality guard only. Does not certify visible or natural motion.'});
}}finally{await browser.close();}
await writeFile(`${out}/comparison.json`,JSON.stringify(comparisons,null,2));console.log(comparisons);
