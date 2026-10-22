export interface MotionPolicy {
  reduced: boolean;
  paused: boolean;
  hidden: boolean;
  active: boolean;
  saveData: boolean;
}
export function maskPlacement(b: {
  x: number;
  y: number;
  width: number;
  height: number;
}) {
  return {
    left: b.x * 100,
    top: b.y * 100,
    width: b.width * 100,
    height: b.height * 100,
    driftLeft: ((-0.05 - b.x) / b.width) * 100,
    driftTop: ((-0.05 - b.y) / b.height) * 100,
    driftWidth: 110 / b.width,
    driftHeight: 110 / b.height,
  };
}
export function motionEnabled(enabled: boolean, p: MotionPolicy) {
  return (
    enabled && !p.reduced && !p.paused && !p.hidden && p.active && !p.saveData
  );
}
/** Equivalent projection of the parallel Three.js far plane, in CSS pixels. */
export function projectWorldLayer(
  width: number,
  height: number,
  aspect: number,
  fov: number,
  layerZ: number,
  camera: { x: number; y: number; z: number },
  startZ: number,
) {
  const baseWidth = Math.max(width, height * aspect) * 1.025;
  const distance = Math.max(0.1, camera.z - layerZ);
  const pixels = height / (2 * Math.tan((fov * Math.PI) / 360) * distance);
  return {
    width: baseWidth,
    height: baseWidth / aspect,
    scale: (startZ - layerZ) / distance,
    x: -camera.x * pixels,
    y: camera.y * pixels,
  };
}
