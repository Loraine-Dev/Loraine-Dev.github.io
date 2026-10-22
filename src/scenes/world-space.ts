export function clampProgress(value: number) {
  return Math.min(1, Math.max(0, value));
}
export function cameraAt(progress: number, start = 6, travel = 4.1) {
  const p = clampProgress(progress);
  const eased = p * p * (3 - 2 * p);
  return { x: 0, y: eased * 0.06, z: start - eased * travel };
}
export function projectedExpansion(layerZ: number, fromZ: number, toZ: number) {
  return (fromZ - layerZ) / (toZ - layerZ);
}
export function fitLayer(
  distance: number,
  aspect: number,
  imageAspect: number,
  fov = 42,
) {
  const viewHeight = 2 * Math.tan((fov * Math.PI) / 360) * distance,
    viewWidth = viewHeight * aspect;
  const width = Math.max(viewWidth, viewHeight * imageAspect),
    height = width / imageAspect;
  return { width, height, viewWidth, viewHeight };
}
