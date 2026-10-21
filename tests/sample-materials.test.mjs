import test from 'node:test';import assert from 'node:assert/strict';import sharp from 'sharp';import{readFile}from'node:fs/promises';import{createHash}from'node:crypto';
const manifest=JSON.parse(await readFile('art-source/material-samples/manifest.json','utf8'));
for(const record of manifest.records)test(`${record.device} ${record.kind}: independent passes reconstruct unchanged source, with bounded alpha`,async()=>{
 const dir=`public/art/material-samples/${record.device}-${record.kind}/`;
 const raw=async name=>sharp(dir+name+'.webp').removeAlpha().raw().toBuffer();
 const [o,c,p,n]=await Promise.all(['original','base','reflection-positive','reflection-negative'].map(raw));
 assert.equal(o.length,c.length);for(let i=0;i<o.length;i++)assert.equal(c[i]+p[i]-n[i],o[i],'flat optical state must reconstruct the source, not double its reflection');
 const data=await sharp(dir+'control.webp').ensureAlpha().raw().toBuffer();let active=0;
 for(let i=3;i<data.length;i+=4)active+=data[i]>0;assert(active>0&&active<record.rect.width*record.rect.height*.8);
 const world=record.device==='desktop'?[1536,864]:[780,1386];
 const at=(nx,ny)=>{const x=Math.floor(nx*world[0])-record.rect.left,y=Math.floor(ny*world[1])-record.rect.top;if(x<0||y<0||x>=record.rect.width||y>=record.rect.height)return 0;return data[(y*record.rect.width+x)*4+3]};
 for(const point of record.device==='desktop'?[[.65,.56],[.2,.80],[.75,.12]]:[[.4,.45],[.25,.60],[.75,.12]])assert.equal(at(...point),0,'bridge, wet stone and canopy must not receive the sample material');
 const source=await readFile(`public/art/world-tree/world-${record.device}.webp`);assert.equal(createHash('sha256').update(source).digest('hex'),record.sourceSha256);
});
test('water reflection displacement stays within the inward boundary feather',()=>{
 for(let distance=.01;distance<=12;distance+=.01){const t=Math.min(1,distance/12),a=t*t*(3-2*t),maximumOffset=2.4*1.47*1.65*a*a;assert(maximumOffset<distance,'sampling must not reach stone outside the inset water region')}
});
