// A small seeded random source (mulberry32). The state is a plain number kept in the game state,
// so every game, chaos rotations included, replays exactly from its seed.

export function nextRandom(state: number): { value: number; state: number } {
  const next = (state + 0x6d2b79f5) >>> 0;
  let t = next;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  return { value, state: next };
}

/** A whole number from 0 up to, but not including, `limit`. */
export function nextInt(state: number, limit: number): { value: number; state: number } {
  const r = nextRandom(state);
  return { value: Math.floor(r.value * limit), state: r.state };
}
