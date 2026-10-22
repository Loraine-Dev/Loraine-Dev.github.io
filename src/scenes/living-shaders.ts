export const vertex = `attribute vec2 position;varying vec2 uv;void main(){uv=position*.5+.5;gl_Position=vec4(position,0.,1.);}`;
export const fragment = `precision highp float;
 varying vec2 uv;
 uniform sampler2D painting;uniform sampler2D regions;uniform sampler2D optics;
 uniform float time;uniform vec2 size;uniform vec2 lightSource;uniform float waterHorizon;
 uniform vec3 enabled;uniform vec3 gain;uniform float lightPeriod;uniform float waterPeriod;uniform float textureTopDown;
 vec2 sampleCoord(vec2 p){return vec2(p.x,mix(1.-p.y,p.y,textureTopDown));}
 vec3 art(vec2 p){return texture2D(painting,sampleCoord(p)).rgb;}
 vec3 field(vec2 p){return texture2D(optics,sampleCoord(fract(p))).rgb;}
 float transmission(vec2 p,float t){
   // The same drifting optical-density field shadows foliage and valley air.
   vec2 q=(p-lightSource)*vec2(size.x/size.y,1.)*3.2;
   return smoothstep(.18,.78,field(q+vec2(t*.032,-t*.018)).r);
 }
 void main(){
  vec2 p=vec2(uv.x,1.-uv.y);
  vec3 mask=texture2D(regions,sampleCoord(p)).rgb*vec3(enabled.y,enabled.z,enabled.x);
  if(max(max(mask.r,mask.g),mask.b)<.002)discard;
  vec3 original=art(p),color=original;
  float alpha=0.,lightTime=time*16./lightPeriod;
  float sun=transmission(p,lightTime);
  if(mask.r>.002){
   float depth=clamp((p.y-waterHorizon)/(1.-waterHorizon),0.,1.);
   // Project two oblique wave-normal fields onto a horizontal plane. Waves
   // compress toward the horizon; the lake texture never translates as a sheet.
   vec2 q=vec2(p.x*3.1,.32/(depth+.12));
   float t=time*7.3/waterPeriod;
   vec2 a=field(q+vec2(t*.027,t*.019)).gb*2.-1.;
   vec2 b=field(q*vec2(1.67,.81)+vec2(-t*.019,t*.031)+.27).gb*2.-1.;
   vec2 normal=(a+b*.65)*1.5;
   vec2 offset=vec2(normal.x,normal.y*.62)*gain.y/size*mask.r*mask.r*(.65+depth*1.4);
   vec3 reflection=art(p+offset);
   float reflectedSun=smoothstep(.18,.7,dot(reflection,vec3(.2126,.7152,.0722)));
   float facet=normal.y*.35*reflectedSun+normal.x*.12;
   color=reflection*(1.+facet*mask.r);alpha=mask.r;
  }
  if(mask.g>.002){
   // Existing leaf texture receives travelling light/shadow. No leaf cutout,
   // trunk movement, silhouette warp or unrepaired background is introduced.
   float shade=(sun-.64)*gain.z;
   color=mix(color,original*(1.+shade*mask.g),mask.g);
   alpha=max(alpha,mask.g);
  }
  if(mask.b>.002){
   vec2 r=(p-lightSource)*vec2(size.x/size.y,1.);
   vec2 direction=normalize(vec2(-1.,.20));
   float along=dot(r,direction),across=dot(r,vec2(-direction.y,direction.x));
   float spread=.013+max(along,0.)*.055;
   float a=(across+.013)/spread,b=(across-.063)/(spread*.55);
   float beam=exp(-a*a*1.6);
   beam+=.45*exp(-b*b*1.7);
   // Clouds cross the aperture: fixed sunlight direction, travelling shaft
   // shadows and changing penetration, instead of two static glow crossfades.
   float aperture=smoothstep(.26,.72,field(vec2(across/(max(along,.05)+.18)*3.7+lightTime*.026,.21)).r);
   float reach=smoothstep(.045,.15,along)*(1.-smoothstep(.7,1.2,along));
   float opticalDepth=beam*reach*mask.b*(.24+.76*aperture)*(.45+.55*sun)*gain.x*.105;
   float transmittance=exp(-opticalDepth);
   vec3 scattered=original*transmittance+vec3(1.,.86,.64)*(1.-transmittance);
   scattered*=1.-.055*(1.-sun)*mask.b;
   color+=scattered-original;alpha=max(alpha,mask.b);
  }
  if(alpha<.003)discard;
  vec3 resolved=clamp(original+(color-original)/max(alpha,.003),0.,1.);
  gl_FragColor=vec4(resolved*alpha,alpha);
 }`;
