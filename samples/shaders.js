export const vertex=`attribute vec2 position;varying vec2 uv;void main(){uv=position*.5+.5;gl_Position=vec4(position,0.,1.);}`;
export const fragment=`precision highp float;
varying vec2 uv;uniform sampler2D base;uniform sampler2D positive;uniform sampler2D negative;uniform sampler2D controlMap;uniform sampler2D cloud;
uniform vec2 dimensions;uniform vec2 worldSize;uniform vec4 crop;uniform vec2 source;uniform float time;uniform float kind;
uniform vec4 clouds[4];uniform vec4 initialClouds[4];
float alphaAt(vec2 world,vec4 r){vec2 q=(world-r.xy)/r.zw;if(q.x<0.||q.y<0.||q.x>1.||q.y>1.)return 0.;return texture2D(cloud,q).a;}
float density(vec2 p,bool initial){
 float d=0.;for(int i=0;i<4;i++){vec4 r=initial?initialClouds[i]:clouds[i];d=max(d,alphaAt(p,r)*(i==1||i==3?.75:1.));}return d;
}
float shadow(vec2 p,bool initial){
 // Sample the actual moving cloud silhouettes along the source-to-air path.
 float d=0.;for(int j=0;j<3;j++){float f=.40+float(j)*.25;d+=density(mix(source,p,f),initial);}return exp(-d*.66);
}
void main(){
 vec2 q=vec2(uv.x,1.-uv.y);vec4 data=texture2D(controlMap,q);float a=data.a;if(a<.002)discard;
 vec3 c=texture2D(base,q).rgb,p=texture2D(positive,q).rgb,n=texture2D(negative,q).rgb;
 vec3 original=c+p-n,result=original;
 vec2 world=(crop.xy+q*crop.zw)/worldSize;
 if(kind<.5){
  float depth=data.r,z=1./(depth+.16);
  // Multi-direction wave slopes projected into the water plane, not movement
  // of the painting. Only the separated signed reflection is resampled.
  float a1=world.x*27.+z*2.7-time*1.1,a2=world.x*49.-z*1.8+time*.83,a3=world.x*13.+z*4.2-time*.61;
  vec2 normal=vec2(cos(a1)+.47*cos(a2),.46*cos(a1)+.28*cos(a3));
  vec2 offset=normal*vec2(2.4,1.8)/dimensions*(.65+depth)*a*a;
  vec3 reflection=texture2D(positive,q+offset).rgb-texture2D(negative,q+offset).rgb;
  float fresnel=1.+normal.y*.045;
  result=c+reflection*fresnel;
 }else{
  float current=shadow(world,false),reference=shadow(world,true);
  // Keep the original mean light: redistribute a bounded air-light component
  // around its initial cloud transmission, never a whole-frame brightness loop.
  float change=(current-reference)*(.55+.45*data.g);
  result=original+(p-n)*change*1.3;
 }
 gl_FragColor=vec4(clamp(result,0.,1.)*a,a);
}`;
