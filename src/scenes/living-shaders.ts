export const vertex = `attribute vec2 position;varying vec2 uv;void main(){uv=position*.5+.5;gl_Position=vec4(position,0.,1.);}`;
export const fragment = `precision highp float;
 varying vec2 uv;uniform sampler2D painting;uniform sampler2D regions;uniform sampler2D rayA;uniform sampler2D rayB;
 uniform float time;uniform vec2 size;uniform vec4 bounds;uniform vec3 enabled;uniform vec3 gain;uniform float lightPeriod;uniform float waterPeriod;uniform float textureTopDown;
 vec2 sampleCoord(vec2 p){return vec2(p.x,mix(1.-p.y,p.y,textureTopDown));}
 vec4 art(vec2 p){return texture2D(painting,sampleCoord(p));}
 void main(){
  vec2 p=vec2(uv.x,1.-uv.y);vec2 mask=texture2D(regions,sampleCoord(p)).rg;
  float wind=time*6.283185/lightPeriod;
  vec2 rayPosition=(p-bounds.xy)/bounds.zw;
  bool inRay=enabled.x>.5&&rayPosition.x>0.&&rayPosition.x<1.&&rayPosition.y>0.&&rayPosition.y<1.;
  if(mask.r*enabled.y<.002&&mask.g*enabled.z<.002&&!inRay)discard;
  vec3 original=art(p).rgb, color=original;float alpha=0.;
  float water=mask.r*enabled.y;
  if(water>.002){
   float phase=time*6.283185/waterPeriod;
   float depth=smoothstep(.48,.88,p.y);
   // Two travelling waves have different wavelengths/directions, no moving sheet.
   vec2 wave=vec2(sin(p.y*245.-phase*2.4+p.x*13.)+.45*sin(p.y*411.+phase*1.3),.30*sin(p.y*191.-phase*1.7+p.x*37.));
   vec2 offset=wave*gain.y/size*water*(.45+depth);
   color=art(p+offset).rgb;
   float glint=sin(p.y*440.-phase*2.1+p.x*16.)*.035*water;
   color*=1.+glint+.018*sin(wind)*water;alpha=water;
  }
  float foliage=mask.g*enabled.z;
  if(foliage>.002){
   // Moving leaf-scale light windows; the trunk and canopy contour never warp.
   float window=.5+.5*sin(p.x*39.+p.y*17.-wind);
   float secondary=.5+.5*sin(p.x*73.-p.y*29.+wind*.73);
   float illumination=(window*.75+secondary*.25-.35)*gain.z*foliage;
   color+=original*vec3(1.,.85,.61)*illumination;
   alpha=max(alpha,foliage);
  }
  vec2 q=(p-bounds.xy)/bounds.zw;
  if(inRay){
   float drift=.5+.5*sin(wind);
   vec4 a=texture2D(rayA,sampleCoord(q)), b=texture2D(rayB,sampleCoord(q));
   vec4 ray=mix(a,b,drift);
   // Branch-shadow lanes travel within the existing terrain-occluded shaft.
   float lane=.58+.42*sin(q.x*28.+q.y*8.-wind*1.35);
   float energy=ray.a*gain.x*(.35+.65*lane);
   vec3 lit=1.-(1.-original)*(1.-ray.rgb*energy);
   color+=lit-original;alpha=max(alpha,clamp(energy*2.,0.,1.));
  }
  if(alpha<.003)discard;
  // Straight-alpha overlay mathematically reconstructs the relit/refracted
  // source, rather than crossfading a second shifted landscape on top of it.
  vec3 resolved=clamp(original+(color-original)/max(alpha,.003),0.,1.);
  gl_FragColor=vec4(resolved*alpha,alpha);
 }`;
