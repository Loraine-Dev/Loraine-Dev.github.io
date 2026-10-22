import {
  ACESFilmicToneMapping,
  BackSide,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  CatmullRomCurve3,
  Color,
  DirectionalLight,
  DoubleSide,
  Fog,
  FrontSide,
  Group,
  HemisphereLight,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  PMREMGenerator,
  Scene,
  SRGBColorSpace,
  TubeGeometry,
  Vector3,
  WebGLRenderer,
} from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { buildPetalData, petals, samplePetal } from "./geometry";
import { cameraPose, chooseQuality } from "./policy";

export interface SceneController {
  setPaused(paused: boolean): void;
  dispose(): void;
}
interface Options {
  host: HTMLElement;
  experience: HTMLElement;
  onFailure: () => void;
  cancellation: AbortSignal;
  limited?: boolean;
}
type ExtendedNavigator = Navigator & {
  deviceMemory?: number;
  connection?: { saveData?: boolean };
};

/** One scene, no external model/HDR requests, bounded geometry and pixel density. */
export async function createLivingForm({
  host,
  experience,
  onFailure,
  cancellation,
  limited = false,
}: Options): Promise<SceneController> {
  const cleanup: Array<() => void> = [];
  let disposed = false;
  function dispose() {
    if (disposed) return;
    disposed = true;
    for (const release of cleanup.reverse()) {
      try {
        release();
      } catch {
        /* Continue releasing other resources. */
      }
    }
  }
  cancellation.addEventListener("abort", dispose, { once: true });
  cleanup.push(() => cancellation.removeEventListener("abort", dispose));
  try {
    if (cancellation.aborted) throw new DOMException("Cancelled", "AbortError");
    const nav = navigator as ExtendedNavigator;
    const quality = chooseQuality({
      width: innerWidth,
      cores: nav.hardwareConcurrency || 8,
      memory: nav.deviceMemory || 8,
      saveData: !!nav.connection?.saveData,
    });
    if (quality.mode === "poster") throw new Error("Static quality policy");
    if (limited && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
      quality.dpr = 0.75;
      quality.fps = 8;
    }
    const mobile = quality.mode === "mobile";
    const reduce = matchMedia("(prefers-reduced-motion: reduce)");
    const fine = matchMedia("(pointer: fine)");
    const renderer = new WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: "low-power",
      failIfMajorPerformanceCaveat: false,
    });
    cleanup.push(() => renderer.dispose());
    renderer.setPixelRatio(Math.min(devicePixelRatio, quality.dpr));
    renderer.outputColorSpace = SRGBColorSpace;
    renderer.toneMapping = ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.02;
    renderer.setClearColor(0x07090e, 1);
    const canvas = renderer.domElement;
    canvas.setAttribute("aria-hidden", "true");
    host.append(canvas);
    cleanup.push(() => canvas.remove());
    const scene = new Scene();
    scene.background = new Color(0x07090e);
    scene.fog = new Fog(0x07090e, 12, 30);
    const camera = new PerspectiveCamera(mobile ? 36 : 33, 1, 0.1, 60);
    const environment = new RoomEnvironment();
    const pmrem = new PMREMGenerator(renderer);
    cleanup.push(
      () => pmrem.dispose(),
      () => environment.dispose(),
    );
    let target = pmrem.fromScene(environment, 0.05);
    cleanup.push(() => target.dispose());
    scene.environment = target.texture;
    scene.environmentIntensity = 0.48;
    environment.dispose();
    pmrem.dispose();
    const sculpture = new Group();
    scene.add(sculpture);
    const materials: MeshStandardMaterial[] = [];
    const geometries: BufferGeometry[] = [];
    cleanup.push(
      () => geometries.forEach((g) => g.dispose()),
      () => materials.forEach((m) => m.dispose()),
    );
    const uniforms = { uLivingTime: { value: 0 }, uUnfurl: { value: 0 } };
    function livingMaterial<T extends MeshStandardMaterial>(material: T): T {
      material.onBeforeCompile = (shader) => {
        Object.assign(shader.uniforms, uniforms);
        shader.vertexShader =
          "uniform float uLivingTime;\nuniform float uUnfurl;\n" +
          shader.vertexShader;
        shader.vertexShader = shader.vertexShader.replace(
          "#include <begin_vertex>",
          `#include <begin_vertex>
    float growth = smoothstep(-1.9, 2.3, position.y);
    transformed.x += sin(position.y * 1.4 + uLivingTime * .55) * .025 * growth;
    transformed.z += cos(position.y * 1.1 + uLivingTime * .45) * .022 * growth;
    transformed.x += position.x * uUnfurl * growth * .18;`,
        );
      };
      material.customProgramCacheKey = () => "miloqen-living-form-1";
      materials.push(material);
      return material;
    }
    const silver = livingMaterial(
      new MeshPhysicalMaterial({
        color: 0x929fae,
        metalness: 0.88,
        roughness: 0.23,
        clearcoat: 0.7,
        clearcoatRoughness: 0.26,
        side: FrontSide,
        envMapIntensity: 1.15,
      }),
    );
    const porcelain = livingMaterial(
      new MeshPhysicalMaterial({
        color: 0xc6d2d9,
        metalness: 0.35,
        roughness: 0.27,
        clearcoat: 0.85,
        clearcoatRoughness: 0.18,
        side: FrontSide,
        envMapIntensity: 0.9,
      }),
    );
    const inner = livingMaterial(
      new MeshPhysicalMaterial({
        color: 0x6c9ab8,
        metalness: 0.45,
        roughness: 0.19,
        clearcoat: 0.8,
        side: BackSide,
        transmission: 0,
        thickness: 0.12,
        ior: 1.42,
        envMapIntensity: 1.1,
      }),
    );
    const gold = livingMaterial(
      new MeshStandardMaterial({
        color: 0xbfa079,
        metalness: 0.83,
        roughness: 0.3,
      }),
    );
    petals.forEach((petal, index) => {
      const data = buildPetalData(petal, quality.along, quality.across);
      const geometry = new BufferGeometry();
      geometry.setAttribute("position", new BufferAttribute(data.positions, 3));
      geometry.setAttribute("uv", new BufferAttribute(data.uvs, 2));
      geometry.setIndex(new BufferAttribute(data.indices, 1));
      geometry.computeVertexNormals();
      geometries.push(geometry);
      sculpture.add(new Mesh(geometry, index === 1 ? porcelain : silver));
      sculpture.add(new Mesh(geometry, inner));
      const edge = [];
      for (let i = 0; i <= 96; i++)
        edge.push(
          new Vector3(...samplePetal(petal, i / 96, index === 1 ? -1 : 1)),
        );
      const rim = new TubeGeometry(
        new CatmullRomCurve3(edge),
        mobile ? 64 : 112,
        0.008,
        5,
        false,
      );
      geometries.push(rim);
      sculpture.add(new Mesh(rim, gold));
    });
    const floorGeometry = new PlaneGeometry(200, 200);
    geometries.push(floorGeometry);
    const floorMaterial = new MeshStandardMaterial({
      color: 0x0b1017,
      metalness: 0.18,
      roughness: 0.75,
    });
    materials.push(floorMaterial);
    const floor = new Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -2.1;
    scene.add(floor);
    const shadowCanvas = document.createElement("canvas");
    shadowCanvas.width = 128;
    shadowCanvas.height = 128;
    const ctx = shadowCanvas.getContext("2d")!;
    const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    gradient.addColorStop(0, "rgba(0,0,0,.7)");
    gradient.addColorStop(0.4, "rgba(0,0,0,.25)");
    gradient.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 128, 128);
    const shadowTexture = new CanvasTexture(shadowCanvas);
    const shadowMaterial = new MeshBasicMaterial({
      map: shadowTexture,
      transparent: true,
      depthWrite: false,
    });
    cleanup.push(
      () => shadowMaterial.dispose(),
      () => shadowTexture.dispose(),
    );
    const shadowGeometry = new PlaneGeometry(3.8, 2.6);
    geometries.push(shadowGeometry);
    const shadow = new Mesh(shadowGeometry, shadowMaterial);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = -2.095;
    scene.add(shadow);
    const key = new DirectionalLight(0xe5f2ff, 2.8);
    key.position.set(-3, 6, 5);
    scene.add(key);
    const rimLight = new DirectionalLight(0x8bcbfa, 3.4);
    rimLight.position.set(4, 2, -4);
    scene.add(rimLight);
    const warm = new DirectionalLight(0xd5b38a, 1.2);
    warm.position.set(-4, 0.8, -2);
    scene.add(warm);
    scene.add(new HemisphereLight(0x8b9fb7, 0x080a10, 0.5));
    host.dataset.quality = quality.mode;
    let frame = 0,
      ready = false,
      lost = false,
      visible = true,
      paused = false,
      needsFrame = true;
    let lastFrame = 0,
      clock = 0,
      progress = 0,
      pointerX = 0,
      pointerY = 0,
      renderCount = 0;
    let dpr = Math.min(devicePixelRatio, quality.dpr),
      slowFrames = 0,
      renderTime = 0;
    const abort = new AbortController();
    const { signal } = abort;
    cleanup.push(
      () => abort.abort(),
      () => stop(),
    );
    const isPaused = () => paused || reduce.matches;
    function updateProgress() {
      const rect = experience.getBoundingClientRect();
      progress = Math.min(
        1,
        Math.max(
          0,
          -rect.top / Math.max(1, experience.offsetHeight - innerHeight),
        ),
      );
      experience.style.setProperty("--progress", String(progress));
      host.dataset.progress = progress.toFixed(3);
      needsFrame = true;
      wake();
    }
    function resize() {
      const rect = host.getBoundingClientRect();
      renderer.setSize(rect.width, rect.height, false);
      camera.aspect = rect.width / Math.max(1, rect.height);
      camera.updateProjectionMatrix();
      needsFrame = true;
      wake();
    }
    function draw(now: number) {
      frame = 0;
      if (disposed || lost || document.hidden || !visible) return;
      const interval = lastFrame ? now - lastFrame : 0;
      const delta = Math.min(interval / 1000, 0.1);
      if (now - lastFrame < 1000 / quality.fps && !needsFrame) {
        wake();
        return;
      }
      lastFrame = now;
      if (!isPaused()) clock += delta;
      const p = isPaused() ? 0 : progress;
      const pose = cameraPose(p, mobile);
      camera.position.set(
        pose.x + pointerX * 0.13,
        pose.y + pointerY * 0.09,
        pose.z,
      );
      camera.lookAt(pose.targetX, pose.targetY, 0);
      sculpture.position.set(pose.offsetX, pose.offsetY, 0);
      sculpture.rotation.y = -0.2 + Math.sin(clock * 0.22) * 0.018;
      shadow.position.x = pose.offsetX;
      shadow.position.z = 0;
      uniforms.uLivingTime.value = clock;
      uniforms.uUnfurl.value = pose.open;
      key.position.x = -3 + p * 4;
      rimLight.intensity = 3.4 + p * 0.7;
      const before = performance.now();
      renderer.render(scene, camera);
      renderTime = performance.now() - before;
      renderCount++;
      host.dataset.renderCount = String(renderCount);
      host.dataset.state = isPaused() ? "still" : "running";
      needsFrame = false;
      if (renderCount > 20 && (renderTime > 45 || interval > 90)) slowFrames++;
      else slowFrames = Math.max(0, slowFrames - 1);
      if (slowFrames === 12 && dpr > 1) {
        dpr = 1;
        renderer.setPixelRatio(1);
        resize();
        host.dataset.adaptive = "lower-resolution";
      }
      if (slowFrames > 70) {
        host.dataset.adaptive = "poster";
        onFailure();
        dispose();
        return;
      }
      if (!isPaused()) wake();
    }
    function wake() {
      if (ready && !frame && !disposed && !lost && visible && !document.hidden)
        frame = requestAnimationFrame(draw);
    }
    function stop() {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      lastFrame = 0;
    }
    function pointer(e: PointerEvent) {
      if (!fine.matches || mobile || isPaused()) return;
      pointerX = e.clientX / innerWidth - 0.5;
      pointerY = e.clientY / innerHeight - 0.5;
      needsFrame = true;
      wake();
    }
    addEventListener("scroll", updateProgress, { passive: true, signal });
    addEventListener("pointermove", pointer, { passive: true, signal });
    document.addEventListener(
      "visibilitychange",
      () => {
        if (document.hidden) {
          stop();
          host.dataset.state = "hidden";
        } else {
          needsFrame = true;
          wake();
        }
      },
      { signal },
    );
    addEventListener("pagehide", stop, { signal });
    addEventListener(
      "pageshow",
      () => {
        updateProgress();
        resize();
        wake();
      },
      { signal },
    );
    reduce.addEventListener(
      "change",
      () => {
        clock = 0;
        needsFrame = true;
        stop();
        wake();
      },
      { signal },
    );
    canvas.addEventListener(
      "webglcontextlost",
      (e) => {
        e.preventDefault();
        lost = true;
        stop();
        host.dataset.sceneState = "context-lost";
        host.classList.remove("live");
      },
      { signal },
    );
    canvas.addEventListener(
      "webglcontextrestored",
      () => {
        try {
          const room = new RoomEnvironment();
          const generator = new PMREMGenerator(renderer);
          target.dispose();
          target = generator.fromScene(room, 0.05);
          scene.environment = target.texture;
          room.dispose();
          generator.dispose();
          lost = false;
          needsFrame = true;
          host.classList.add("live");
          host.dataset.sceneState = "live";
          resize();
          wake();
        } catch {
          onFailure();
          dispose();
        }
      },
      { signal },
    );
    const observer = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        if (!visible) {
          stop();
          host.dataset.state = "offscreen";
        } else {
          needsFrame = true;
          wake();
        }
      },
      { threshold: 0 },
    );
    observer.observe(experience);
    cleanup.push(() => observer.disconnect());
    const resizer = new ResizeObserver(resize);
    resizer.observe(host);
    cleanup.push(() => resizer.disconnect());
    updateProgress();
    resize();
    await renderer.compileAsync(scene, camera);
    if (disposed || cancellation.aborted)
      throw new DOMException("Cancelled", "AbortError");
    ready = true;
    draw(performance.now());
    host.classList.add("live");
    host.dataset.sceneState = "live";
    wake();
    return {
      setPaused(value) {
        paused = value;
        needsFrame = true;
        stop();
        wake();
      },
      dispose,
    };
  } catch (error) {
    dispose();
    throw error;
  }
}
