import '../src/styles/site.css';
import '../src/styles/editorial.css';
import {createEnvironment} from '../src/scenes/environment.ts';
import settings from './assets.json';
const query=new URLSearchParams(location.search),effect=query.get('effect')==='light'?'light':'water';
let mode=query.get('motion')||'on',worker,ready=false,timer;
const mobile=matchMedia('(max-width:759px), (max-aspect-ratio:4/5)'),reduced=matchMedia('(prefers-reduced-motion:reduce)');
const html=await fetch('/').then(r=>r.text()),source=new DOMParser().parseFromString(html,'text/html');
const scene=source.querySelector('.world-experience');
for(const node of scene.querySelectorAll('[src],[srcset],[href]'))for(const attr of ['src','srcset','href']){
 const value=node.getAttribute(attr);if(value?.startsWith('./'))node.setAttribute(attr,new URL(value,location.origin+'/').href);
}
document.body.replaceChildren(scene);
const world=scene.querySelector('.world-layer'),stage=scene.querySelector('.world-stage');
const environment=createEnvironment(world,stage);
const canvas=document.createElement('canvas');canvas.className='sample-material';canvas.ariaHidden='true';
Object.assign(canvas.style,{position:'absolute',pointerEvents:'none',visibility:'hidden'});
world.insertBefore(canvas,world.querySelector('.environment'));
document.body.dataset.effect=effect;document.body.dataset.sample='local-materials.1';
const toggle=scene.querySelector('#motion-toggle');toggle.hidden=false;
let paused=false;
toggle.addEventListener('click',()=>{paused=!paused;environment.setPaused(paused);toggle.setAttribute('aria-pressed',String(paused));toggle.textContent=paused?'继续动态 ▷':'暂停动态 Ⅱ';state()});
function policy(){return reduced.matches||navigator.connection?.saveData||(navigator.deviceMemory&&navigator.deviceMemory<=2)}
function state(){
 const on=ready&&mode==='on'&&!policy();
 canvas.style.visibility=on?'visible':'hidden';
 canvas.dataset.mode=mode;canvas.dataset.running=String(on&&!document.hidden&&!paused);
 environment.setComparisonStatic(mode==='static'||canvas.dataset.state==='static-fallback');
 worker?.postMessage({type:'state',running:on&&!document.hidden&&!paused});
 if(effect==='light'){clearTimeout(timer);timer=undefined;if(on&&!document.hidden&&!paused)syncClouds()}
}
function cloudPoses(){
 const r=world.getBoundingClientRect();
 return [...world.querySelectorAll('.cloud-billow')].slice(0,4).map(node=>{
  const b=node.getBoundingClientRect();return[(b.x-r.x)/r.width,(b.y-r.y)/r.height,b.width/r.width,b.height/r.height];
 });
}
function syncClouds(){
 if(ready&&!document.hidden&&!paused&&mode==='on'){worker.postMessage({type:'clouds',rects:cloudPoses()});timer=setTimeout(syncClouds,100)}
}
function start(){
 if(worker)return;
 if(policy()){canvas.dataset.state='static-policy';return}
 if(mode==='static'){canvas.dataset.state='static-mode';return}
 if(typeof Worker==='undefined'||!canvas.transferControlToOffscreen){canvas.dataset.state='static-fallback';environment.setComparisonStatic(true);return}
 const device=mobile.matches?'mobile':'desktop',p=settings[device],rect=p[effect];
 Object.assign(canvas.style,{left:`${rect.left/p.world[0]*100}%`,top:`${rect.top/p.world[1]*100}%`,width:`${rect.width/p.world[0]*100}%`,height:`${rect.height/p.world[1]*100}%`});
 try{
  worker=new Worker(new URL('./worker.js',import.meta.url),{type:'module'});
  worker.onerror=()=>{ready=false;canvas.dataset.state='static-fallback';canvas.style.visibility='hidden';clearTimeout(timer);environment.setComparisonStatic(true);worker.terminate()};
  worker.onmessage=({data})=>{
   if(data.type==='ready'){ready=true;canvas.dataset.state='ready';canvas.dataset.renderer='worker';canvas.dataset.quality=data.quality;canvas.dataset.width=String(data.width);canvas.dataset.height=String(data.height);state()}
   if(data.type==='frame'){canvas.dataset.time=data.time.toFixed(2);canvas.dataset.frames=String(data.frames);canvas.dataset.drawMs=data.drawMs.toFixed(2)}
   if(data.type==='error'){ready=false;clearTimeout(timer);canvas.dataset.state='static-fallback';canvas.style.visibility='hidden';environment.setComparisonStatic(true);console.error(data.message)}
  };
  const offscreen=canvas.transferControlToOffscreen();
  worker.postMessage({type:'init',canvas:offscreen,effect,device,settings,baseURL:location.origin+'/',rect,clouds:cloudPoses()},[offscreen]);
 }catch(e){canvas.dataset.state='static-fallback';console.warn(e)}
}
document.addEventListener('visibilitychange',state);
reduced.addEventListener('change',()=>{if(!worker)start();state()});
mobile.addEventListener('change',()=>location.reload());
addEventListener('pagehide',()=>{clearTimeout(timer);worker?.postMessage({type:'state',running:false})});
addEventListener('pageshow',()=>{state()});
addEventListener('message',event=>{if(event.origin===location.origin&&event.data?.type==='sample-mode'){mode=event.data.mode;if(!worker)start();state()}});
await Promise.all([...scene.querySelectorAll('img')].map(i=>i.decode().catch(()=>{})));
start();state();
