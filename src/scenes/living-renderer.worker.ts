import { vertex, fragment } from "./living-shaders";
import settings from "../data/living-scene.json";
import placements from "../data/godray-assets.json";
type Mode = "all" | "off" | "rays" | "water" | "tree" | "clouds";
type Device = "desktop" | "mobile";
const channel = self as unknown as {
  postMessage(value: unknown): void;
  onmessage: ((event: MessageEvent) => void) | null;
};
let canvas: OffscreenCanvas, gl: WebGLRenderingContext, program: WebGLProgram;
let textures: WebGLTexture[] = [],
  device: Device = "desktop",
  mode: Mode = "all",
  ready = false,
  software = false,
  running = false,
  time = 0,
  last = 0,
  timer: ReturnType<typeof setTimeout> | undefined,
  drawCount = 0;
let assetTicket = 0;
const locations = new Map<string, WebGLUniformLocation | null>();
const uniform = (name: string) => {
  if (!locations.has(name))
    locations.set(name, gl.getUniformLocation(program, name));
  return locations.get(name)!;
};
function compile(type: number, source: string) {
  const shader = gl.createShader(type)!;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
    throw Error(gl.getShaderInfoLog(shader) || "shader compilation");
  return shader;
}
function initialize(target: OffscreenCanvas) {
  canvas = target;
  gl = canvas.getContext("webgl", {
    alpha: true,
    premultipliedAlpha: true,
    antialias: false,
    powerPreference: "low-power",
  }) as WebGLRenderingContext;
  if (!gl) throw Error("Worker WebGL unavailable");
  const info = gl.getExtension("WEBGL_debug_renderer_info");
  software =
    !!info &&
    /swiftshader|llvmpipe|software|microsoft basic render/i.test(
      String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)),
    );
  program = gl.createProgram()!;
  const v = compile(gl.VERTEX_SHADER, vertex),
    f = compile(gl.FRAGMENT_SHADER, fragment);
  gl.attachShader(program, v);
  gl.attachShader(program, f);
  gl.linkProgram(program);
  gl.deleteShader(v);
  gl.deleteShader(f);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS))
    throw Error(gl.getProgramInfoLog(program) || "program link");
  gl.useProgram(program);
  gl.uniform1f(uniform("textureTopDown"), 1);
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
    gl.STATIC_DRAW,
  );
  const p = gl.getAttribLocation(program, "position");
  gl.enableVertexAttribArray(p);
  gl.vertexAttribPointer(p, 2, gl.FLOAT, false, 0, 0);
  canvas.addEventListener("webglcontextlost", (e) => {
    e.preventDefault();
    ready = false;
    stop();
    channel.postMessage({ type: "lost" });
  });
  channel.postMessage({
    type: "initialized",
    quality: software ? "software" : "hardware",
  });
}
function upload(bitmaps: ImageBitmap[], next: Device, ticket: number) {
  stop();
  ready = false;
  device = next;
  textures.forEach((t) => gl.deleteTexture(t));
  textures = [];
  gl.useProgram(program);
  for (const [i, image] of bitmaps.entries()) {
    const texture = gl.createTexture()!;
    textures.push(texture);
    gl.activeTexture(gl.TEXTURE0 + i);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    gl.uniform1i(uniform(["painting", "regions", "rayA", "rayB"][i]), i);
  }
  const width = settings[device].width;
  canvas.width = width;
  canvas.height = Math.round((width * bitmaps[0].height) / bitmaps[0].width);
  gl.viewport(0, 0, canvas.width, canvas.height);
  bitmaps.forEach((b) => b.close());
  ready = true;
  draw();
  channel.postMessage({
    type: "ready",
    ticket,
    width: canvas.width,
    height: canvas.height,
  });
  if (running) schedule();
}
function stop() {
  if (timer !== undefined) clearTimeout(timer);
  timer = undefined;
  last = 0;
}
function draw() {
  if (!ready) return;
  const p = placements[device].bounds,
    profile = settings[device];
  gl.useProgram(program);
  gl.uniform1f(uniform("time"), time);
  gl.uniform2f(
    uniform("size"),
    device === "mobile" ? 780 : 1536,
    device === "mobile" ? 1386 : 864,
  );
  gl.uniform4f(uniform("bounds"), p.x, p.y, p.width, p.height);
  gl.uniform3f(
    uniform("enabled"),
    +(mode === "all" || mode === "rays"),
    +(mode === "all" || mode === "water"),
    +(mode === "all" || mode === "tree"),
  );
  gl.uniform3f(
    uniform("gain"),
    profile.rayGain,
    profile.waterPixels,
    profile.treeGain,
  );
  gl.uniform1f(uniform("lightPeriod"), settings.lightSeconds);
  gl.uniform1f(uniform("waterPeriod"), settings.waterSeconds);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.drawArrays(gl.TRIANGLES, 0, 6);
  drawCount++;
}
function schedule() {
  if (timer !== undefined || !running || !ready) return;
  const fps = software ? settings.softwareFps : settings[device].fps;
  timer = setTimeout(tick, 1000 / fps);
}
function tick() {
  timer = undefined;
  if (!running || !ready) return;
  const now = performance.now();
  if (last) time += (now - last) / 1000;
  last = now;
  draw();
  channel.postMessage({ type: "progress", time, drawCount });
  schedule();
}
channel.onmessage = async ({ data }) => {
  try {
    if (data.type === "initialize") initialize(data.canvas);
    if (data.type === "assets") upload(data.bitmaps, data.device, data.ticket);
    if (data.type === "sources") {
      const current = (assetTicket = data.ticket);
      const bitmaps = await Promise.all(
        data.sources.map(async (url: string) => {
          const response = await fetch(url);
          if (!response.ok)
            throw Error(`Material source ${response.status}: ${url}`);
          return createImageBitmap(await response.blob(), {
            imageOrientation: "none",
            premultiplyAlpha: "none",
            colorSpaceConversion: "none",
          });
        }),
      );
      if (current !== assetTicket)
        bitmaps.forEach((b: ImageBitmap) => b.close());
      else upload(bitmaps, data.device, current);
    }
    if (data.type === "state") {
      mode = data.mode;
      running = data.running;
      if (!running) {
        stop();
        draw();
        channel.postMessage({ type: "progress", time });
      } else schedule();
    }
  } catch (error) {
    stop();
    ready = false;
    channel.postMessage({ type: "error", message: String(error) });
  }
};
