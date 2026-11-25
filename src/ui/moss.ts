// The mossy lime pattern on the blocks, after the MossyBlock picture Scott chose the look from: bright
// lime with paler veins and specks. Drawn here from seeded noise, never from the picture itself.
// The pattern only ever lightens the base lime, so X and O never lose contrast against it.

import { nextRandom } from '../engine/random';

/** The base lime, #84cc16. Every pixel of the pattern is this or paler. */
export const MOSS_BASE: readonly [number, number, number] = [0x84, 0xcc, 0x16];
const VEIN: readonly [number, number, number] = [0xc8, 0xee, 0x78];

/** A grid of seeded random values that wraps at the edges, read with smooth steps between points. */
function valueNoise(cells: number, seed: number): (u: number, v: number) => number {
  const grid: number[] = [];
  let state = seed;
  for (let i = 0; i < cells * cells; i++) {
    const r = nextRandom(state);
    grid.push(r.value);
    state = r.state;
  }
  const at = (x: number, y: number) => grid[(y % cells) * cells + (x % cells)];
  const smooth = (t: number) => t * t * (3 - 2 * t);
  return (u, v) => {
    const x = u * cells;
    const y = v * cells;
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const sx = smooth(x - x0);
    const sy = smooth(y - y0);
    const top = at(x0, y0) + (at(x0 + 1, y0) - at(x0, y0)) * sx;
    const bottom = at(x0, y0 + 1) + (at(x0 + 1, y0 + 1) - at(x0, y0 + 1)) * sx;
    return top + (bottom - top) * sy;
  };
}

/** Several octaves of noise added together, 0 to 1. */
function fractal(seed: number, octaves: number, base: number): (u: number, v: number) => number {
  const layers = Array.from({ length: octaves }, (_, k) => valueNoise(base << k, seed + k * 7919));
  const total = layers.reduce((sum, _, k) => sum + 0.5 ** k, 0);
  return (u, v) => layers.reduce((sum, layer, k) => sum + layer(u, v) * 0.5 ** k, 0) / total;
}

/** RGBA pixels, `size` by `size`, the same every time for the same seed. */
export function drawMoss(size: number, seed = 20261124): Uint8Array {
  const cloud = fractal(seed, 4, 3); // broad pale patches
  const vein = fractal(seed + 1, 4, 4); // thin veins along the noise's midline
  const speck = fractal(seed + 2, 2, 48); // fine specks
  const out = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const v = y / size;
      const ridge = Math.max(0, 1 - Math.abs(vein(u, v) - 0.5) * 14); // 1 on a vein, 0 off it
      const pale = Math.min(1, 0.25 * Math.max(0, cloud(u, v) - 0.45) * 4 + 0.55 * ridge + 0.4 * Math.max(0, speck(u, v) - 0.72) * 4);
      const i = (y * size + x) * 4;
      for (let c = 0; c < 3; c++) out[i + c] = Math.round(MOSS_BASE[c] + (VEIN[c] - MOSS_BASE[c]) * pale);
      out[i + 3] = 255;
    }
  return out;
}
