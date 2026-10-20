import {
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  SRGBColorSpace,
  Texture,
  TextureLoader,
  WebGLRenderer,
} from "three";
import art from "../data/world.json";
import { cameraAt, fitLayer } from "./world-space";
export interface WorldController {
  setPaused(value: boolean): void;
  setStatic(value: boolean): void;
  dispose(): void;
}
interface Options {
  host: HTMLElement;
  mobile: boolean;
  limited: boolean;
  signal: AbortSignal;
  onFailure: () => void;
  onPose: (pose: { x: number; y: number; z: number }) => void;
}
export async function createWorldScene({
  host,
  mobile,
  limited,
  signal,
  onFailure,
  onPose,
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
    await Promise.all(
      [".shore-art img", ".gate-art img"].map(async (selector) => {
        try {
          await document.querySelector<HTMLImageElement>(selector)?.decode();
        } catch {
          /* Existing static fallback remains visible. */
        }
      }),
    );
    const urls = [
      document.querySelector<HTMLImageElement>(".shore-art img")?.currentSrc ||
        art.assets.shore,
      document.querySelector<HTMLImageElement>(".gate-art img")?.currentSrc ||
        (mobile ? art.assets.mobileGate : art.assets.gate),
    ];
    host.dataset.shoreSource = urls[0];
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
      alpha: true,
      powerPreference: "low-power",
    });
    own(() => renderer.dispose());
    const canvas = renderer.domElement;
    host.append(canvas);
    own(() => canvas.remove());
    renderer.outputColorSpace = SRGBColorSpace;
    renderer.setClearColor(0x070b12, 0);
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

    const camera = new PerspectiveCamera(art.camera.fov, 1, 0.1, 100);
    camera.position.z = art.camera.startZ;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    const fine = matchMedia("(pointer:fine)");
    const shoreMaterial = new MeshBasicMaterial({
      map: textures[0],
      transparent: true,
      depthWrite: false,
      alphaTest: 0.004,
    });
    own(() => shoreMaterial.dispose());
    const gateMaterial = new MeshBasicMaterial({
      map: textures[1],
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
      material: MeshBasicMaterial,
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
    addPlane(textures[0], shoreMaterial, art.layers.shore, 1, 0, 1, 0, 1, true);
    addPlane(textures[1], gateMaterial, art.layers.gate, 2, 0, 0.5, 0, 1, true);
    addPlane(textures[1], gateMaterial, art.layers.gate, 2, 0.5, 1, 0, 1, true);

    let raf = 0,
      ready = false,
      paused = false,
      comparisonStatic = false,
      active = true,
      lost = false,
      last = 0,
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
      const still = paused || reduced.matches || comparisonStatic;
      const ambient = false;
      const pose = cameraAt(
        reduced.matches ||
          comparisonStatic ||
          !art.camera.enabled ||
          new URLSearchParams(location.search).get("camera") === "off"
          ? 0
          : progress,
        art.camera.startZ,
        mobile ? art.camera.mobileTravel : art.camera.travel,
      );
      camera.position.set(
        pose.x + (still ? 0 : px * art.motion.pointer),
        pose.y + (still ? 0 : py * 0.025),
        pose.z,
      );
      camera.lookAt(camera.position.x, camera.position.y, -40);
      onPose({
        x: camera.position.x,
        y: camera.position.y,
        z: camera.position.z,
      });

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
        if (
          !fine.matches ||
          mobile ||
          paused ||
          comparisonStatic ||
          reduced.matches ||
          !art.motion.pointerEnabled ||
          new URLSearchParams(location.search).get("pointer") === "off"
        )
          return;
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
        onPose({ x: 0, y: 0, z: art.camera.startZ });
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
      setStatic(value) {
        comparisonStatic = value;
        dirty = true;
        stop();
        wake();
      },
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
