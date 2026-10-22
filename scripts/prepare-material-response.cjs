// Reproducible technical maps derived from unchanged art, never image layers
// cut out and translated. No inpainting or hidden background is claimed.
const sharp = require('sharp');
const fs = require('node:fs/promises');
const crypto = require('node:crypto');
const regions = require('../src/data/living-regions.json');
const clamp = x => Math.max(0,Math.min(1,x));
const smooth = (a,b,x) => { const t=clamp((x-a)/(b-a));return t*t*(3-2*t); };
function distanceToPolygon(x,y,poly,w,h) {
  let hit=false, distance=Infinity;
  for(let i=0,j=poly.length-1;i<poly.length;j=i++) {
    const [ax,ay]=poly[j], [bx,by]=poly[i];
    if((ay>y)!==(by>y) && x<(bx-ax)*(y-ay)/(by-ay)+ax) hit=!hit;
    const vx=(bx-ax)*w, vy=(by-ay)*h, px=(x-ax)*w, py=(y-ay)*h;
    const t=clamp((px*vx+py*vy)/(vx*vx+vy*vy));
    distance=Math.min(distance,Math.hypot(px-vx*t,py-vy*t));
  }
  return hit?distance:0;
}
async function main() {
  const directory='public/art/world-tree/living';
  const records=[];
  for(const device of ['desktop','mobile']) {
    const source=`public/art/world-tree/world-${device}.webp`, bytes=await fs.readFile(source);
    const {data,info}=await sharp(bytes).resize({width:device==='mobile'?576:1024}).removeAlpha().raw().toBuffer({resolveWithObject:true});
    const raw=Buffer.alloc(info.width*info.height*3), zones=regions[device];
    for(let y=0;y<info.height;y++) for(let x=0;x<info.width;x++) {
      const nx=(x+.5)/info.width,ny=(y+.5)/info.height,i=(y*info.width+x)*3;
      const distance=polygons=>Math.max(...polygons.map(p=>distanceToPolygon(nx,ny,p,info.width,info.height)));
      raw[i]=Math.round(255*smooth(0,7,distance(zones.water)));
      const luminance=(data[i]*.2126+data[i+1]*.7152+data[i+2]*.0722)/255;
      raw[i+1]=Math.round(255*smooth(0,5,distance(zones.foliage))*smooth(.18,.42,luminance));
      raw[i+2]=Math.round(255*smooth(0,18,distance([zones.air])));
    }
    const base=`${directory}/${device}-regions`;
    await sharp(raw,{raw:{width:info.width,height:info.height,channels:3}}).png().toFile(base+'.png');
    await sharp(raw,{raw:{width:info.width,height:info.height,channels:3}}).webp({lossless:true,effort:6}).toFile(base+'-lossless.webp');
    records.push({device,source,sourceSha256:crypto.createHash('sha256').update(bytes).digest('hex'),output:base+'-lossless.webp',channels:{red:'inset water response; stone excluded',green:'bounded luminance-qualified foliage; no contour displacement',blue:'air optical depth; buildings excluded'}});
  }
  // Periodic Fourier field: R = slow cloud transmission, GB = water slopes.
  // Integer harmonics match value AND derivative at every tile boundary.
  const side=128, field=Buffer.alloc(side*side*3), tau=Math.PI*2;
  for(let y=0;y<side;y++) for(let x=0;x<side;x++) {
    const u=x/side*tau,v=y/side*tau,i=(y*side+x)*3;
    const cloud=.5+.19*Math.sin(u+v+.9)+.15*Math.cos(2*u-v+1.7)+.09*Math.sin(u-2*v+.4)+.055*Math.cos(3*u+2*v);
    let dx=0,dy=0;
    for(const [kx,ky,a,p] of [[1,3,.12,.2],[2,-5,.09,1.2],[4,7,.07,2.3],[7,-11,.05,.5]]) {
      const slope=Math.cos(kx*u+ky*v+p)*a;
      dx+=slope*kx/Math.hypot(kx,ky);dy+=slope*ky/Math.hypot(kx,ky);
    }
    field[i]=Math.round(255*clamp(cloud));field[i+1]=Math.round(255*clamp(.5+dx));field[i+2]=Math.round(255*clamp(.5+dy));
  }
  await sharp(field,{raw:{width:side,height:side,channels:3}}).webp({lossless:true,effort:6}).toFile(`${directory}/optical-field.webp`);
  await fs.writeFile('art-source/world-tree/material-response-manifest.json',JSON.stringify({generator:'scripts/prepare-material-response.cjs',regions:'src/data/living-regions.json',records,field:{output:`${directory}/optical-field.webp`,source:'Original periodic analytical cloud-transmission and wave-slope field. No third-party material.',channels:'R cloud transmission / G slope x / B slope y'},limitations:'No separate foliage, waterfall, clean background, depth or surface-normal pass exists. Only masked image-space optical response is supported.'},null,2)+'\n');
  console.log('Built terrain-bounded response mattes and seamless optical field. Original paintings unchanged.');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
