// Region safety, not an artistic acceptance test.
import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
for (const device of ['desktop','mobile']) {
  test(`${device}: optical response separates air, foliage and water`, async () => {
    const {data,info}=await sharp(`public/art/world-tree/living/${device}-regions-lossless.webp`).removeAlpha().raw().toBuffer({resolveWithObject:true});
    const at=(x,y,c)=>data[(Math.floor(y*info.height)*info.width+Math.floor(x*info.width))*3+c];
    assert(at(device==='mobile'?.15:.3,device==='mobile'?.40:.54,2)>40,'air must have its own terrain-bounded response matte');
    assert.equal(at(.2,.1,1),0,'sky cannot be treated as leaves');
    assert.equal(at(.2,device==='mobile'?.62:.90,0),0,'foreground stone must not refract');
    assert(at(.72,device==='mobile'?.70:.74,0)>200,'open water needs continuous texture response');
  });
}
