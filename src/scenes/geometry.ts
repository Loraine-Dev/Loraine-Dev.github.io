export interface Petal {
  height: number;
  lean: number;
  bow: number;
  depth: number;
  twist: number;
  phase: number;
  width: number;
}
export const petals: readonly Petal[] = [
  {
    height: 4.6,
    lean: 1.65,
    bow: -0.6,
    depth: 0.45,
    twist: 2.8,
    phase: -0.8,
    width: 0.98,
  },
  {
    height: 3.85,
    lean: -1.55,
    bow: 0.4,
    depth: -0.15,
    twist: -2.6,
    phase: 0.9,
    width: 1.02,
  },
  {
    height: 4.35,
    lean: 0.12,
    bow: 0.65,
    depth: -0.8,
    twist: 2.1,
    phase: 1.4,
    width: 0.78,
  },
];
/** A tapered, cupped sheet. u follows growth; v travels across the folded shell. */
export function samplePetal(
  p: Petal,
  u: number,
  v: number,
  ribs = 29,
): [number, number, number] {
  const envelope = Math.pow(Math.max(0, Math.sin(Math.PI * u)), 0.78);
  const width = p.width * envelope;
  const angle = p.phase + p.twist * u;
  const cup = (v * v - 0.18) * width * 0.75;
  const rib = Math.sin((v + 1) * Math.PI * ribs) * 0.009 * envelope;
  return [
    p.lean * u * u +
      Math.sin(Math.PI * u) * p.bow +
      v * width * Math.cos(angle) -
      (cup + rib) * Math.sin(angle),
    -2.05 + p.height * u + Math.sin(Math.PI * u) * v * v * 0.22,
    p.depth * Math.sin(Math.PI * u * 0.85) +
      v * width * Math.sin(angle) +
      (cup + rib) * Math.cos(angle),
  ];
}
export function buildPetalData(p: Petal, along = 112, across = 72) {
  const positions = new Float32Array((along + 1) * (across + 1) * 3);
  const uvs = new Float32Array((along + 1) * (across + 1) * 2);
  const indices = new Uint32Array(along * across * 6);
  for (let i = 0; i <= along; i++)
    for (let j = 0; j <= across; j++) {
      const index = i * (across + 1) + j;
      positions.set(
        samplePetal(
          p,
          i / along,
          (j / across) * 2 - 1,
          Math.min(29, across / 4),
        ),
        index * 3,
      );
      uvs.set([j / across, i / along], index * 2);
    }
  let k = 0;
  for (let i = 0; i < along; i++)
    for (let j = 0; j < across; j++) {
      const a = i * (across + 1) + j,
        b = a + across + 1;
      indices.set([a, b, a + 1, b, b + 1, a + 1], k);
      k += 6;
    }
  return { positions, uvs, indices };
}
