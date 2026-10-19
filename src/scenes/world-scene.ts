import {
  Color,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  SRGBColorSpace,
  Texture,
  TextureLoader,
  WebGLRenderer,
} from "three";
import art from "../data/world.json";
import { cameraAt, fitLayer } from "./world-space";
export interface WorldController {
  setPaused(value: boolean): void;
  dispose(): void;
}
interface Options {
  host: HTMLElement;
  mobile: boolean;
  limited: boolean;
  signal: AbortSignal;
  onFailure: () => void;
}
export async function createWorldScene({
  host,
  mobile,
  limited,
  signal,
  onFailure,
}: Options): Promise<WorldController> {
  const cleanup: Array<() => void> = [];
  let disposed = false;
  const own = (release: () => void) => {
    if (disposed) release();
    else cleanup.push(release);
  };
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    for (const release of cleanup.reverse()) {
      try {
        release();
      } catch {}
    }
  };
  signal.addEventListener("abort", dispose, { once: true });
  own(() => signal.removeEventListener("abort", dispose));
  try {
    const loader = new TextureLoader();
    const urls = [
      mobile ? art.assets.mobile : art.assets.desktop,
      art.assets.shore,
      mobile ? art.assets.mobileGate : art.assets.gate,
    ];
    const textures = await Promise.all(
      urls.map(async (url) => {
        const t = await loader.loadAsync(url);
        own(() => t.dispose());
        t.colorSpace = SRGBColorSpace;
        if (signal.aborted || disposed)
          throw new DOMException("Cancelled", "AbortError");
        return t;
      }),
    );
    if (signal.aborted) throw new DOMException("Cancelled", "AbortError");
    const renderer = new WebGLRenderer({
      antialias: false,
      alpha: false,
      powerPreference: "low-power",
    });
    own(() => renderer.dispose());
    const canvas = renderer.domElement;
    host.append(canvas);
    own(() => canvas.remove());
    renderer.outputColorSpace = SRGBColorSpace;
    renderer.setClearColor(0x070b12, 1);
    let pixelRatio = Math.min(
      devicePixelRatio,
      limited
        ? art.quality.softwareDpr
        : mobile
          ? art.quality.mobileDpr
          : art.quality.desktopDpr,
    );
    renderer.setPixelRatio(pixelRatio);
    const scene = new Scene();
    scene.background = new Color(0x070b12);
    const camera = new PerspectiveCamera(art.camera.fov, 1, 0.1, 100);
    camera.position.z = art.camera.startZ;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    const fine = matchMedia("(pointer:fine)");
    const time = { value: 0 },
      exposure = { value: 1 };
    const worldMaterial = new ShaderMaterial({
      uniforms: {
        uMap: { value: textures[0] },
        uTime: time,
        uExposure: exposure,
        uMobile: { value: mobile ? 1 : 0 },
        uAmplitude: { value: art.motion.leafAmplitude },
      },
      vertexShader:
        "varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
      fragmentShader: `uniform sampler2D uMap;uniform float uTime;uniform float uExposure;uniform float uMobile;uniform float uAmplitude;varying vec2 vUv;
  void main(){vec2 uv=vUv;float leaves=smoothstep(.45,.64,uv.y)*smoothstep(mix(.36,.12,uMobile),mix(.48,.2,uMobile),uv.x);uv.x+=sin(uv.y*49.+uTime*.23)*uAmplitude*leaves;vec4 color=texture2D(uMap,uv);gl_FragColor=vec4(color.rgb*uExposure,1.);
  #include <colorspace_fragment>
  }`,
    });
    own(() => worldMaterial.dispose());
    const shoreMaterial = new MeshBasicMaterial({
      map: textures[1],
      transparent: true,
      depthWrite: false,
      alphaTest: 0.004,
    });
    own(() => shoreMaterial.dispose());
    const gateMaterial = new MeshBasicMaterial({
      map: textures[2],
      transparent: true,
      depthWrite: false,
      alphaTest: 0.004,
    });
    own(() => gateMaterial.dispose());
    const planes: Array<{
      mesh: Mesh;
      z: number;
      u0: number;
      u1: number;
      v0: number;
      v1: number;
      cover: boolean;
      texture: Texture;
    }> = [];
    function addPlane(
      texture: Texture,
      material: MeshBasicMaterial | ShaderMaterial,
      z: number,
      order: number,
      u0 = 0,
      u1 = 1,
      v0 = 0,
      v1 = 1,
      cover = false,
    ) {
      const geometry = new PlaneGeometry(1, 1);
      own(() => geometry.dispose());
      const uv = geometry.getAttribute("uv");
      for (let i = 0; i < uv.count; i++)
        uv.setXY(i, u0 + uv.getX(i) * (u1 - u0), v0 + uv.getY(i) * (v1 - v0));
      const mesh = new Mesh(geometry, material);
      mesh.position.z = z;
      mesh.renderOrder = order;
      scene.add(mesh);
      planes.push({ mesh, z, u0, u1, v0, v1, cover, texture });
      return mesh;
    }
    addPlane(textures[0], worldMaterial, art.layers.world, 0, 0, 1, 0, 1, true);
    addPlane(textures[1], shoreMaterial, art.layers.shore, 1, 0, 1, 0, 1, true);
    addPlane(textures[2], gateMaterial, art.layers.gate, 2, 0, 0.5, 0, 1, true);
    addPlane(textures[2], gateMaterial, art.layers.gate, 2, 0.5, 1, 0, 1, true);

    const mistMaterial = new ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: { uTime: time, uOpacity: { value: art.motion.mistOpacity } },
      vertexShader:
        "varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
      fragmentShader: `uniform float uTime;uniform float uOpacity;varying vec2 vUv;void main(){float wave=.5+.5*sin(vUv.x*12.+uTime*.09+sin(vUv.x*6.-uTime*.07));float edge=sin(vUv.y*3.14159);float alpha=pow(edge,2.)*(.3+wave*.7)*uOpacity;gl_FragColor=vec4(.22,.28,.34,alpha);
  #include <colorspace_fragment>
  }`,
    });
    own(() => mistMaterial.dispose());
    const mistGeometry = new PlaneGeometry(1, 1);
    own(() => mistGeometry.dispose());
    const mist = new Mesh(mistGeometry, mistMaterial);
    mist.position.z = -7;
    mist.renderOrder = 3;
    if (!limited) scene.add(mist);
    let raf = 0,
      ready = false,
      paused = false,
      active = true,
      lost = false,
      last = 0,
      clock = 0,
      count = 0,
      progress = 0,
      px = 0,
      py = 0,
      dirty = true;
    const frameInterval =
      1000 /
      (limited
        ? art.quality.softwareFps
        : mobile
          ? art.quality.mobileFps
          : art.quality.desktopFps);
    const experience =
      document.querySelector<HTMLElement>(".world-experience")!;
    const stage = host.parentElement!;
    const events = new AbortController();
    own(() => events.abort());
    const stop = () => {
      cancelAnimationFrame(raf);
      raf = 0;
      last = 0;
    };
    own(stop);
    function wake() {
      if (ready && !raf && !disposed && !lost && active && !document.hidden)
        raf = requestAnimationFrame(draw);
    }
    function resize() {
      const box = host.getBoundingClientRect();
      renderer.setSize(box.width, box.height, false);
      camera.aspect = box.width / box.height;
      camera.updateProjectionMatrix();
      for (const plane of planes) {
        const image = plane.texture.image as { width: number; height: number };
        const fit = fitLayer(
          art.camera.startZ - plane.z,
          camera.aspect,
          image.width / image.height,
          art.camera.fov,
        );
        const w = plane.cover ? fit.width * 1.025 : fit.viewWidth;
        const h = plane.cover ? fit.height * 1.025 : fit.viewHeight;
        plane.mesh.scale.set(
          w * (plane.u1 - plane.u0),
          h * (plane.v1 - plane.v0),
          1,
        );
        plane.mesh.position.x = w * ((plane.u0 + plane.u1) / 2 - 0.5);
        plane.mesh.position.y = h * ((plane.v0 + plane.v1) / 2 - 0.5);
      }
      const fogFit = fitLayer(13, camera.aspect, 2, art.camera.fov);
      mist.scale.set(fogFit.viewWidth * 1.2, fogFit.viewHeight * 0.2, 1);
      mist.position.y = -fogFit.viewHeight * 0.29;
      dirty = true;
      wake();
    }
    function scroll() {
      const rect = experience.getBoundingClientRect();
      progress = Math.min(
        1,
        Math.max(
          0,
          -rect.top / Math.max(1, experience.offsetHeight - stage.clientHeight),
        ),
      );
      host.dataset.progress = progress.toFixed(4);
      dirty = true;
      wake();
    }
    function draw(now: number) {
      raf = 0;
      if (disposed || lost || document.hidden || !active) return;
      const elapsed = last ? now - last : 0;
      if (elapsed < frameInterval && !dirty) {
        wake();
        return;
      }
      last = now;
      const still = paused || reduced.matches;
      const ambient = !limited && !still;
      if (ambient) clock += Math.min(elapsed / 1000, 0.1);
      const pose = cameraAt(
        reduced.matches ? 0 : progress,
        art.camera.startZ,
        art.camera.travel,
      );
      camera.position.set(
        pose.x + (still ? 0 : px * art.motion.pointer),
        pose.y + (still ? 0 : py * 0.025),
        pose.z,
      );
      camera.lookAt(camera.position.x, camera.position.y, -40);
      time.value = clock;
      exposure.value = 1 + (still ? 0 : progress * 0.022);

      const start = performance.now();
      renderer.render(scene, camera);
      const cost = performance.now() - start;
      count++;
      host.dataset.frames = String(count);
      host.dataset.cameraZ = pose.z.toFixed(4);
      host.dataset.running = String(ambient);
      host.dataset.drawCalls = String(renderer.info.render.calls);
      if (cost > 50 && count > 8 && pixelRatio > 1) {
        pixelRatio = 1;
        renderer.setPixelRatio(1);
        resize();
        host.dataset.quality = "adaptive";
      }
      dirty = false;
      if (ambient) wake();
    }
    addEventListener("scroll", scroll, {
      passive: true,
      signal: events.signal,
    });
    addEventListener(
      "pointermove",
      (event) => {
        if (!fine.matches || mobile || paused || reduced.matches) return;
        px = event.clientX / innerWidth - 0.5;
        py = event.clientY / innerHeight - 0.5;
        dirty = true;
        wake();
      },
      { passive: true, signal: events.signal },
    );
    reduced.addEventListener(
      "change",
      () => {
        stop();
        clock = 0;
        dirty = true;
        wake();
      },
      { signal: events.signal },
    );
    document.addEventListener(
      "visibilitychange",
      () => {
        if (document.hidden) stop();
        else {
          dirty = true;
          wake();
        }
      },
      { signal: events.signal },
    );
    addEventListener("pagehide", stop, { signal: events.signal });
    addEventListener(
      "pageshow",
      () => {
        scroll();
        resize();
        wake();
      },
      { signal: events.signal },
    );
    canvas.addEventListener(
      "webglcontextlost",
      (event) => {
        event.preventDefault();
        lost = true;
        stop();
        host.classList.remove("is-ready");
        host.dataset.state = "context-lost";
      },
      { signal: events.signal },
    );
    canvas.addEventListener(
      "webglcontextrestored",
      () => {
        lost = false;
        dirty = true;
        host.classList.add("is-ready");
        host.dataset.state = "live";
        resize();
        wake();
      },
      { signal: events.signal },
    );
    const observer = new IntersectionObserver(([entry]) => {
      active = entry.isIntersecting;
      if (!active) stop();
      else {
        dirty = true;
        wake();
      }
    });
    observer.observe(stage);
    own(() => observer.disconnect());
    const resizer = new ResizeObserver(resize);
    resizer.observe(host);
    own(() => resizer.disconnect());
    resize();
    scroll();
    await renderer.compileAsync(scene, camera);
    if (signal.aborted || disposed)
      throw new DOMException("Cancelled", "AbortError");
    ready = true;
    draw(performance.now());
    host.dataset.state = "live";
    host.classList.add("is-ready");
    return {
      setPaused(value) {
        paused = value;
        dirty = true;
        stop();
        wake();
      },
      dispose,
    };
  } catch (error) {
    dispose();
    if (!signal.aborted) onFailure();
    throw error;
  }
}
