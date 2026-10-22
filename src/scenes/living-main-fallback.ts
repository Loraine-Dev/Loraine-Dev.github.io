import type { createEnvironment } from "./environment";
import settings from "../data/living-scene.json";
import { vertex, fragment } from "./living-shaders";
type Mode = "all" | "off" | "rays" | "water" | "tree" | "clouds";
const yieldToBrowser = () =>
  new Promise<void>((resolve) => setTimeout(resolve, 0));
export async function initializeLivingScene(
  controller: ReturnType<typeof createEnvironment>,
  world: HTMLElement,
) {
  const canvas = document.createElement("canvas");
  canvas.className = "living-scene";
  canvas.ariaHidden = "true";
  Object.assign(canvas.style, {
    position: "absolute",
    inset: "0",
    width: "100%",
    height: "100%",
    pointerEvents: "none",
  });
  world.append(canvas);
  const gl = canvas.getContext("webgl", {
    alpha: true,
    premultipliedAlpha: true,
    antialias: false,
    powerPreference: "low-power",
  });
  if (!gl) {
    canvas.dataset.state = "no-webgl";
    return { setMode: (_mode: Mode) => {} };
  }
  await yieldToBrowser();
  const rendererInfo = gl.getExtension("WEBGL_debug_renderer_info");
  const software = rendererInfo
    ? /swiftshader|llvmpipe|software|microsoft basic render/i.test(
        String(gl.getParameter(rendererInfo.UNMASKED_RENDERER_WEBGL)),
      )
    : false;
  canvas.dataset.quality = software ? "software" : "hardware";
  function shader(type: number, source: string) {
    const s = gl!.createShader(type)!;
    gl!.shaderSource(s, source);
    gl!.compileShader(s);
    if (!gl!.getShaderParameter(s, gl!.COMPILE_STATUS))
      throw Error(gl!.getShaderInfoLog(s) || "Shader compile");
    return s;
  }
  const program = gl.createProgram()!;
  try {
    const v = shader(gl.VERTEX_SHADER, vertex),
      f = shader(gl.FRAGMENT_SHADER, fragment);
    gl.attachShader(program, v);
    gl.attachShader(program, f);
    gl.linkProgram(program);
    gl.deleteShader(v);
    gl.deleteShader(f);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS))
      throw Error(gl.getProgramInfoLog(program) || "Shader link");
  } catch (error) {
    canvas.dataset.state = "error";
    console.error(error);
    canvas.remove();
    return { setMode: (_mode: Mode) => {} };
  }
  await yieldToBrowser();
  gl.useProgram(program);
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
    gl.STATIC_DRAW,
  );
  const loc = gl.getAttribLocation(program, "position");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const locations = new Map<string, WebGLUniformLocation | null>();
  const uniform = (name: string) => {
    if (!locations.has(name))
      locations.set(name, gl.getUniformLocation(program, name));
    return locations.get(name)!;
  };
  const media = matchMedia("(max-width:759px), (max-aspect-ratio:4/5)");
  let mode: Mode = "all",
    ready = false,
    ticket = 0,
    time = 0,
    last = 0,
    frame = 0,
    textures: WebGLTexture[] = [],
    lost = false;
  function draw() {
    if (!ready || lost) return;
    const s = controller.motionState(),
      on = mode !== "off" && !s.reduced && !s.saveData && !s.comparisonStatic;
    canvas.style.visibility = on ? "visible" : "hidden";
    if (!on) return;
    const profile = media.matches ? settings.mobile : settings.desktop;
    gl!.useProgram(program);
    gl!.uniform1f(uniform("time"), time);
    gl!.uniform2f(
      uniform("size"),
      media.matches ? 780 : 1536,
      media.matches ? 1386 : 864,
    );
    gl!.uniform2f(uniform("lightSource"), profile.source[0], profile.source[1]);
    gl!.uniform1f(uniform("waterHorizon"), profile.waterHorizon);
    gl!.uniform3f(
      uniform("enabled"),
      +(mode === "all" || mode === "rays"),
      +(mode === "all" || mode === "water"),
      +(mode === "all" || mode === "tree"),
    );
    gl!.uniform3f(
      uniform("gain"),
      profile.rayGain,
      profile.waterPixels,
      profile.treeGain,
    );
    gl!.uniform1f(uniform("lightPeriod"), settings.lightSeconds);
    gl!.uniform1f(uniform("waterPeriod"), settings.waterSeconds);
    gl!.clear(gl!.COLOR_BUFFER_BIT);
    gl!.drawArrays(gl!.TRIANGLES, 0, 6);
    canvas.dataset.time = time.toFixed(2);
  }
  function tick(now: number) {
    frame = 0;
    const s = controller.motionState();
    if (
      document.hidden ||
      s.hidden ||
      !s.active ||
      s.paused ||
      s.reduced ||
      s.saveData ||
      s.comparisonStatic ||
      mode === "off" ||
      mode === "clouds" ||
      !ready ||
      lost
    ) {
      canvas.dataset.running = "false";
      last = 0;
      draw();
      return;
    }
    canvas.dataset.running = "true";
    const fps = software
      ? settings.softwareFps
      : (media.matches ? settings.mobile : settings.desktop).fps;
    if (!last || now - last >= 1000 / fps) {
      if (last) time += (now - last) / 1000;
      last = now;
      draw();
    }
    frame = requestAnimationFrame(tick);
  }
  function wake() {
    draw();
    if (!frame) frame = requestAnimationFrame(tick);
  }
  async function rebuild() {
    const n = ++ticket;
    ready = false;
    canvas.style.visibility = "hidden";
    const device = media.matches ? "mobile" : "desktop";
    const policy = controller.motionState();
    if (policy.reduced || policy.saveData) {
      canvas.dataset.state = "policy";
      return;
    }
    try {
      const paths = [
        `./art/world-tree/world-${device}.webp`,
        `./art/world-tree/living/${device}-regions-lossless.webp`,
        settings.opticalField,
      ];
      const images = await Promise.all(
        paths.map(async (src) => {
          const image = new Image();
          image.src = src;
          await image.decode();
          return image;
        }),
      );
      if (n !== ticket) return;
      textures.forEach((t) => gl!.deleteTexture(t));
      textures = [];
      gl!.useProgram(program);
      for (const [i, image] of images.entries()) {
        if (n !== ticket) return;
        const tex = gl!.createTexture()!;
        textures.push(tex);
        gl!.activeTexture(gl!.TEXTURE0 + i);
        gl!.bindTexture(gl!.TEXTURE_2D, tex);
        gl!.pixelStorei(gl!.UNPACK_FLIP_Y_WEBGL, true);
        gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MIN_FILTER, gl!.LINEAR);
        gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MAG_FILTER, gl!.LINEAR);
        gl!.texParameteri(
          gl!.TEXTURE_2D,
          gl!.TEXTURE_WRAP_S,
          gl!.CLAMP_TO_EDGE,
        );
        gl!.texParameteri(
          gl!.TEXTURE_2D,
          gl!.TEXTURE_WRAP_T,
          gl!.CLAMP_TO_EDGE,
        );
        gl!.texImage2D(
          gl!.TEXTURE_2D,
          0,
          gl!.RGBA,
          gl!.RGBA,
          gl!.UNSIGNED_BYTE,
          image,
        );
        gl!.uniform1i(uniform(["painting", "regions", "optics"][i]), i);
        // Keep uploads as separate browser tasks, without delaying the art or
        // starting animation before all registered textures are ready.
        await yieldToBrowser();
      }
      if (n !== ticket) return;
      const w = (media.matches ? settings.mobile : settings.desktop).width;
      canvas.width = w;
      canvas.height = Math.round(
        (w * images[0].naturalHeight) / images[0].naturalWidth,
      );
      gl!.viewport(0, 0, canvas.width, canvas.height);
      ready = true;
      canvas.dataset.state = "ready";
      wake();
    } catch (error) {
      if (n !== ticket) return;
      canvas.dataset.state = "asset-error";
      canvas.style.visibility = "hidden";
      console.error("Local scene material unavailable", error);
    }
  }
  const observer = new MutationObserver(wake);
  observer.observe(world.querySelector(".environment")!, {
    attributes: true,
    attributeFilter: ["data-paused", "data-running", "data-comparison"],
  });
  document.addEventListener("visibilitychange", wake);
  media.addEventListener("change", rebuild);
  matchMedia("(prefers-reduced-motion:reduce)").addEventListener(
    "change",
    () => {
      if (!ready) void rebuild();
      wake();
    },
  );
  canvas.addEventListener("webglcontextlost", (e) => {
    e.preventDefault();
    lost = true;
    canvas.style.visibility = "hidden";
    canvas.dataset.state = "context-lost";
  });
  // Keep the original picture and clouds if this optional context is lost.
  // Never reload the visitor's page or interrupt their scroll position.
  canvas.addEventListener("webglcontextrestored", () => {
    canvas.dataset.state = "context-restored-static";
  });
  addEventListener("pagehide", () => {
    cancelAnimationFrame(frame);
    frame = 0;
    last = 0;
  });
  addEventListener("pageshow", wake);
  void rebuild();
  return {
    setMode(value: Mode) {
      mode = value;
      canvas.dataset.mode = value;
      wake();
    },
  };
}
