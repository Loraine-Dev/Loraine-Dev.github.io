import sharp from 'sharp';
import {readFile,writeFile,mkdir,stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const config=JSON.parse(await readFile('src/data/materials.json','utf8'));
const polygons=JSON.parse(await readFile('src/data/living-regions.json','utf8'));
const clamp=x=>Math.max(0,Math.min(1,x));
const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t)};
const hash=b=>createHash('sha256').update(b).digest('hex');
function distance(x,y,p,w,h){let hit=false,d=1e9;for(let i=0,j=p.length-1;i<p.length;j=i++){
 const[a,b]=p[j],[c,e]=p[i];if((b>y)!==(e>y)&&x<(c-a)*(y-b)/(e-b)+a)hit=!hit;
 const vx=(c-a)*w,vy=(e-b)*h,px=(x-a)*w,py=(y-b)*h,t=clamp((px*vx+py*vy)/(vx*vx+vy*vy));d=Math.min(d,Math.hypot(px-vx*t,py-vy*t));
}return hit?d:0}
const records=[];
for(const device of ['desktop','mobile'])for(const kind of ['water','light']){
 const p=config[device],rect=p[kind],dir=`public/art/material-samples/${device}-${kind}`;
 await mkdir(dir,{recursive:true});
 const source=await readFile(`public/art/world-tree/world-${device}.webp`);
 const original=await sharp(source).extract(rect).removeAlpha().raw().toBuffer();
 const generatedPath=`art-source/material-samples/${device}-${kind}-generated.png`,generatedBytes=await readFile(generatedPath);
 let generated=await sharp(generatedBytes).resize(rect.width,rect.height,{fit:'fill'}).removeAlpha().raw().toBuffer();
 // AI plates are not geometry-registered. For air use only a broad colour
 // repair field; ALL original high-frequency clouds/terrain remain unchanged.
 if(kind==='light'){
  const lowO=await sharp(original,{raw:{width:rect.width,height:rect.height,channels:3}}).blur(18).raw().toBuffer();
  const lowG=await sharp(generated,{raw:{width:rect.width,height:rect.height,channels:3}}).blur(18).raw().toBuffer();
  generated=Buffer.from(original.map((v,i)=>Math.max(0,Math.min(255,v+Math.max(-22,Math.min(0,lowG[i]-lowO[i]))))));
  // Bake the one authored source-colour air-light component, instead of
  // inventing a white glow in the runtime shader. Its complementary clean
  // plate exactly removes this same component from the original painting.
  for(let y=0;y<rect.height;y++)for(let x=0;x<rect.width;x++){
   const nx=(x+rect.left+.5)/p.world[0],ny=(y+rect.top+.5)/p.world[1];
   const rx=(nx-p.source[0])*p.world[0]/p.world[1],ry=ny-p.source[1],length=Math.hypot(1,.20),along=(-rx+.20*ry)/length,cross=(-.20*rx-ry)/length;
   const width=.014+Math.max(along,0)*.05;
   const shaft=Math.exp(-cross*cross/(width*width))*smooth(.03,.18,along)*(1-smooth(.65,1.15,along));
   for(let c=0;c<3;c++){const i=(y*rect.width+x)*3+c,repair=Math.max(0,original[i]-generated[i]),light=Math.min(30,(original[i]*.28+repair*.45)*shaft);generated[i]=original[i]-Math.round(light)}
  }
 }
 const base=generated,pos=Buffer.alloc(original.length),neg=Buffer.alloc(original.length),data=Buffer.alloc(rect.width*rect.height*4),matte=Buffer.alloc(rect.width*rect.height);
 for(let i=0;i<original.length;i++){const delta=original[i]-base[i];pos[i]=Math.max(0,delta);neg[i]=Math.max(0,-delta)}
 let count=0;
 for(let y=0;y<rect.height;y++)for(let x=0;x<rect.width;x++){
  const i=y*rect.width+x,nx=(x+rect.left+.5)/p.world[0],ny=(y+rect.top+.5)/p.world[1];
  const groups=kind==='water'?polygons[device].water:[polygons[device].air];
  const edge=Math.max(...groups.map(poly=>distance(nx,ny,poly,p.world[0],p.world[1])));
  const outer=Math.min(x,y,rect.width-1-x,rect.height-1-y);
  const alpha=smooth(0,kind==='water'?12:24,Math.min(edge,outer));
  matte[i]=Math.round(alpha*255);count+=alpha;
  const depth=kind==='water'?clamp((ny-(device==='mobile'?.49:.685))/(1-(device==='mobile'?.49:.685))):clamp(Math.hypot((nx-p.source[0])*p.world[0]/p.world[1],ny-p.source[1]));
  const lum=(original[i*3]*.2126+original[i*3+1]*.7152+original[i*3+2]*.0722)/255;
  data[i*4]=Math.round(depth*255);
  data[i*4+1]=Math.round((kind==='water'?.5:smooth(.10,.5,lum))*255);
  data[i*4+2]=kind==='water'?Math.round(clamp(.55+nx*.25)*255):Math.round(alpha*255);
  data[i*4+3]=matte[i];
 }
 const saveRGB=async(name,bytes)=>sharp(bytes,{raw:{width:rect.width,height:rect.height,channels:3}}).webp({lossless:true,effort:6}).toFile(`${dir}/${name}.webp`);
 await saveRGB('original',original);await saveRGB('base',base);await saveRGB('reflection-positive',pos);await saveRGB('reflection-negative',neg);
 await sharp(data,{raw:{width:rect.width,height:rect.height,channels:4}}).webp({lossless:true,effort:6}).toFile(`${dir}/control.webp`);
 await sharp(matte,{raw:{width:rect.width,height:rect.height,channels:1}}).png().toFile(`${dir}/boundary.png`);
 // Uncompressed material masters are delivered independently of web encodings.
 const masters=`art-source/material-samples/${device}-${kind}`;await mkdir(masters,{recursive:true});
 for(const[name,bytes]of[['original',original],['base',base],['reflection-positive',pos],['reflection-negative',neg]])await sharp(bytes,{raw:{width:rect.width,height:rect.height,channels:3}}).png().toFile(`${masters}/${name}.png`);
 await sharp(data,{raw:{width:rect.width,height:rect.height,channels:4}}).png().toFile(`${masters}/control.png`);
 let error=0;for(let i=0;i<original.length;i++)error=Math.max(error,Math.abs(base[i]+pos[i]-neg[i]-original[i]));
 const files=await Promise.all(['base.webp','reflection-positive.webp','reflection-negative.webp','control.webp','original.webp'].map(async name=>({name,bytes:(await stat(`${dir}/${name}`)).size})));
 records.push({device,kind,rect,sourceSha256:hash(source),generatedPath,generatedSha256:hash(generatedBytes),validPixels:Math.round(count),reconstructionMaxByteError:error,method:kind==='water'?'Generated clean-water texture; signed original-minus-base reflection passes, no second baked reflection below opaque interior.':'Registered source-colour air-light decomposition; neutral AI candidate supplies low-frequency repair guidance only. Original geometry retained.',control:'R distance / G density or roughness / B flow or visibility / A precise inset region',files});
}
await writeFile('art-source/material-samples/manifest.json',JSON.stringify({records,tool:'Built-in image_gen; original generated PNG retained. Technical processing via scripts/prepare-sample-materials.mjs.',limitations:'AI outputs are NOT pixel-perfect geometry plates. Only water inside inset masks, and low-frequency air colour repair, are used. Original foreground is composited above both samples. No physical 3D reflection/volume claim.'},null,2)+'\n');
console.log(records.map(r=>({device:r.device,kind:r.kind,exactReconstruction:r.reconstructionMaxByteError===0,validPixels:r.validPixels})));
