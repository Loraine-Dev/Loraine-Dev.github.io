import { vertex, fragment } from "./shaders";
type Effect = "water" | "light";
type Rect = { left: number; top: number; width: number; height: number };
type Init = {
  type: "init";
  effect: Effect;
  device: "desktop" | "mobile";
  canvas: OffscreenCanvas;
  rect: Rect;
  settings: {
    fps: { desktop: number; mobile: number; software: number };
    desktop: { world: number[]; source: number[] };
    mobile: { world: number[]; source: number[] };
    waterMotion: {
      displacement: number[];
      timeScale: number;
      reflectance: number;
    };
    lightMotion: { response: number };
  };
  baseURL: string;
  clouds: number[][];
};
const send = (data: object) => self.postMessage(data);
class Material {
  gl: WebGLRenderingContext;
  program: WebGLProgram;
  locations = new Map<string, WebGLUniformLocation | null>();
  ready = false;
  running = false;
  last = 0;
  time = 0;
  frames = 0;
  fps = 8;
  quality = "software";
  clouds: number[][];
  initialClouds: number[][];
  constructor(public data: Init) {
    const gl = data.canvas.getContext("webgl", {
      alpha: true,
      premultipliedAlpha: true,
      antialias: false,
      powerPreference: "low-power",
    }) as WebGLRenderingContext | null;
    if (!gl) throw Error("WebGL unavailable");
    this.gl = gl;
    this.clouds = this.initialClouds = data.clouds;
    const ext = gl.getExtension("WEBGL_debug_renderer_info");
    this.quality =
      ext &&
      /swiftshader|software|llvmpipe/i.test(
        String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)),
      )
        ? "software"
        : "hardware";
    this.fps =
      data.settings.fps[this.quality === "software" ? "software" : data.device];
    const shader = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS))
        throw Error(gl.getShaderInfoLog(s) || "Shader compilation failed");
      return s;
    };
    this.program = gl.createProgram()!;
    gl.attachShader(this.program, shader(gl.VERTEX_SHADER, vertex));
    gl.attachShader(this.program, shader(gl.FRAGMENT_SHADER, fragment));
    gl.linkProgram(this.program);
    if (!gl.getProgramParameter(this.program, gl.LINK_STATUS))
      throw Error(gl.getProgramInfoLog(this.program) || "Link failed");
    gl.useProgram(this.program);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW,
    );
    const attr = gl.getAttribLocation(this.program, "position");
    gl.enableVertexAttribArray(attr);
    gl.vertexAttribPointer(attr, 2, gl.FLOAT, false, 0, 0);
    data.canvas.addEventListener("webglcontextlost", (e) => {
      e.preventDefault();
      this.ready = false;
      this.running = false;
      send({
        type: "error",
        effect: data.effect,
        message: "Local material context lost",
      });
    });
  }
  uniform(name: string) {
    if (!this.locations.has(name))
      this.locations.set(name, this.gl.getUniformLocation(this.program, name));
    return this.locations.get(name)!;
  }
  async init() {
    const { data, gl } = this,
      root = `art/material-samples/${data.device}-${data.effect}/`;
    const paths = [
      root + "base.webp",
      root + "reflection-positive.webp",
      root + "reflection-negative.webp",
      root + "control.webp",
      ...(data.effect === "light" ? ["art/world-tree/cloud-bank-v2.avif"] : []),
    ];
    const images = await Promise.all(
      paths.map(async (p) => {
        const r = await fetch(new URL(p, data.baseURL));
        if (!r.ok || !r.headers.get("content-type")?.startsWith("image/"))
          throw Error("Invalid material " + p);
        return createImageBitmap(await r.blob(), {
          premultiplyAlpha: "none",
          imageOrientation: "none",
          colorSpaceConversion: "none",
        });
      }),
    );
    for (let i = 0; i < images.length; i++) {
      const tex = gl.createTexture();
      gl.activeTexture(gl.TEXTURE0 + i);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      for (const p of [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T])
        gl.texParameteri(gl.TEXTURE_2D, p, gl.CLAMP_TO_EDGE);
      for (const p of [gl.TEXTURE_MIN_FILTER, gl.TEXTURE_MAG_FILTER])
        gl.texParameteri(gl.TEXTURE_2D, p, gl.LINEAR);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        images[i],
      );
      gl.uniform1i(
        this.uniform(
          ["base", "positive", "negative", "controlMap", "cloud"][i],
        ),
        i,
      );
      images[i].close();
    }
    // Water does not sample clouds. Supply its unused sampler a valid texture unit.
    if (data.effect === "water") gl.uniform1i(this.uniform("cloud"), 0);
    data.canvas.width = data.rect.width;
    data.canvas.height = data.rect.height;
    gl.viewport(0, 0, data.canvas.width, data.canvas.height);
    gl.uniform2f(
      this.uniform("dimensions"),
      data.canvas.width,
      data.canvas.height,
    );
    gl.uniform2fv(this.uniform("worldSize"), data.settings[data.device].world);
    gl.uniform2fv(this.uniform("source"), data.settings[data.device].source);
    gl.uniform4f(
      this.uniform("crop"),
      data.rect.left,
      data.rect.top,
      data.rect.width,
      data.rect.height,
    );
    gl.uniform1f(this.uniform("kind"), data.effect === "water" ? 0 : 1);
    gl.uniform2fv(
      this.uniform("displacement"),
      data.settings.waterMotion.displacement,
    );
    gl.uniform1f(
      this.uniform("timeScale"),
      data.settings.waterMotion.timeScale,
    );
    gl.uniform1f(
      this.uniform("reflectance"),
      data.settings.waterMotion.reflectance,
    );
    gl.uniform1f(
      this.uniform("lightResponse"),
      data.settings.lightMotion.response,
    );
    this.ready = true;
    this.draw();
    send({
      type: "ready",
      effect: data.effect,
      quality: this.quality,
      width: data.canvas.width,
      height: data.canvas.height,
    });
  }
  draw() {
    const { gl } = this,
      t = performance.now();
    gl.useProgram(this.program);
    gl.uniform1f(this.uniform("time"), this.time);
    for (let i = 0; i < 4; i++) {
      gl.uniform4fv(
        this.uniform(`clouds[${i}]`),
        this.clouds[i] || [0, 0, 0, 0],
      );
      gl.uniform4fv(
        this.uniform(`initialClouds[${i}]`),
        this.initialClouds[i] || [0, 0, 0, 0],
      );
    }
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    send({
      type: "frame",
      effect: this.data.effect,
      time: this.time,
      frames: ++this.frames,
      drawMs: performance.now() - t,
    });
  }
}
const materials = new Map<Effect, Material>();
let timer: ReturnType<typeof setTimeout> | undefined;
function schedule() {
  clearTimeout(timer);
  const active = [...materials.values()].filter((m) => m.ready && m.running);
  if (!active.length) {
    timer = undefined;
    return;
  }
  const now = performance.now();
  for (const m of active) {
    if (m.last) m.time += (now - m.last) / 1000;
    m.last = now;
    m.draw();
  }
  timer = setTimeout(schedule, 1000 / Math.max(...active.map((m) => m.fps)));
}
self.onmessage = async ({ data }) => {
  try {
    if (data.type === "init") {
      const m = new Material(data);
      materials.set(data.effect, m);
      await m.init();
      schedule();
    }
    if (data.type === "state") {
      const m = materials.get(data.effect);
      if (m && m.running !== data.running) {
        m.running = data.running;
        m.last = 0;
        schedule();
      }
    }
    if (data.type === "clouds")
      for (const m of materials.values())
        if (m.data.effect === "light") m.clouds = data.rects;
  } catch (e) {
    send({ type: "error", message: String(e) });
  }
};
