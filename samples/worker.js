import {vertex,fragment} from './shaders.js';
let gl,program,canvas,ready=false,running=false,timer,last=0,time=0,frames=0,quality,fps,initialClouds,clouds;
const locations=new Map();const uniform=n=>{if(!locations.has(n))locations.set(n,gl.getUniformLocation(program,n));return locations.get(n)};
function shader(type,src){const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s}
function setClouds(name,values){for(let i=0;i<4;i++)gl.uniform4fv(uniform(name+'['+i+']'),values[i]||[0,0,0,0])}
function stop(){clearTimeout(timer);timer=undefined;last=0}
function schedule(){if(ready&&running&&!timer)timer=setTimeout(tick,1000/fps)}
function draw(){const t=performance.now();gl.useProgram(program);gl.uniform1f(uniform('time'),time);setClouds('clouds',clouds);setClouds('initialClouds',initialClouds);gl.clear(gl.COLOR_BUFFER_BIT);gl.drawArrays(gl.TRIANGLES,0,6);frames++;postMessage({type:'frame',time,frames,drawMs:performance.now()-t})}
function tick(){timer=undefined;if(!running||!ready)return;const now=performance.now();if(last)time+=(now-last)/1000;last=now;draw();schedule()}
async function init(data){
 canvas=data.canvas;gl=canvas.getContext('webgl',{alpha:true,premultipliedAlpha:true,antialias:false,powerPreference:'low-power'});if(!gl)throw Error('WebGL unavailable');
 const ext=gl.getExtension('WEBGL_debug_renderer_info');quality=ext&&/swiftshader|software|llvmpipe/i.test(String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)))?'software':'hardware';fps=data.settings.fps[quality==='software'?'software':data.device];
 program=gl.createProgram();gl.attachShader(program,shader(gl.VERTEX_SHADER,vertex));gl.attachShader(program,shader(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));gl.useProgram(program);
 const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);const attr=gl.getAttribLocation(program,'position');gl.enableVertexAttribArray(attr);gl.vertexAttribPointer(attr,2,gl.FLOAT,false,0,0);
 const root='art/material-samples/'+data.device+'-'+data.effect+'/';
 const paths=[root+'base.webp',root+'reflection-positive.webp',root+'reflection-negative.webp',root+'control.webp', 'art/world-tree/cloud-bank-v2.avif'];
 const images=await Promise.all(paths.map(async p=>{const r=await fetch(new URL(p,data.baseURL));if(!r.ok)throw Error('Asset '+r.status+' '+p);return createImageBitmap(await r.blob(),{premultiplyAlpha:'none',imageOrientation:'none',colorSpaceConversion:'none'})}));
 for(let i=0;i<images.length;i++){const tex=gl.createTexture();gl.activeTexture(gl.TEXTURE0+i);gl.bindTexture(gl.TEXTURE_2D,tex);for(const p of[gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T])gl.texParameteri(gl.TEXTURE_2D,p,gl.CLAMP_TO_EDGE);for(const p of[gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER])gl.texParameteri(gl.TEXTURE_2D,p,gl.LINEAR);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,images[i]);gl.uniform1i(uniform(['base','positive','negative','controlMap','cloud'][i]),i);images[i].close()}
 canvas.width=data.rect.width;canvas.height=data.rect.height;gl.viewport(0,0,canvas.width,canvas.height);
 gl.uniform2f(uniform('dimensions'),canvas.width,canvas.height);gl.uniform2fv(uniform('worldSize'),data.settings[data.device].world);gl.uniform2fv(uniform('source'),data.settings[data.device].source);gl.uniform4f(uniform('crop'),data.rect.left,data.rect.top,data.rect.width,data.rect.height);gl.uniform1f(uniform('kind'),data.effect==='water'?0:1);
 clouds=initialClouds=data.clouds;ready=true;draw();postMessage({type:'ready',quality,width:canvas.width,height:canvas.height});schedule();
 canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();stop();ready=false;postMessage({type:'error',message:'Material context lost; original picture retained'})});
}
self.onmessage=async({data})=>{try{if(data.type==='init')await init(data);if(data.type==='state'){running=data.running;if(running)schedule();else stop()}if(data.type==='clouds'){clouds=data.rects}}catch(e){stop();postMessage({type:'error',message:String(e)})}};
