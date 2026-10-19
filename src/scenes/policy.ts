export interface DeviceHints {
  width: number;
  cores: number;
  memory: number;
  saveData: boolean;
}
export function chooseQuality(d: DeviceHints) {
  if (d.saveData || d.cores <= 2 || d.memory <= 2)
    return { mode: "poster" as const, dpr: 1, along: 0, across: 0, fps: 0 };
  if (d.width < 760)
    return {
      mode: "mobile" as const,
      dpr: 1.25,
      along: 64,
      across: 36,
      fps: 24,
    };
  return {
    mode: "desktop" as const,
    dpr: 1.5,
    along: 112,
    across: 72,
    fps: 30,
  };
}
export function cameraPose(progress: number, mobile: boolean) {
  const p = Math.min(1, Math.max(0, progress));
  const ease = p * p * (3 - 2 * p);
  return mobile
    ? {
        x: 0.8 - ease * 0.45,
        y: 0.75 + ease * 0.2,
        z: 15 - ease * 1.1,
        targetX: 0,
        targetY: 0.65 + ease * 0.25,
        offsetX: 0,
        offsetY: 2 - ease * 0.3,
        open: ease,
      }
    : {
        x: 2.7 - ease * 1.1,
        y: 0.7 + ease * 0.6,
        z: 10.6 - ease * 1.2,
        targetX: 0,
        targetY: 0.15,
        offsetX: 1.6 - ease * 3,
        offsetY: 0,
        open: ease,
      };
}
