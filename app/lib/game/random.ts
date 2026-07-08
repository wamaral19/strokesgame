// Mulberry32 gives the game repeatable randomness for a completed build while
// staying tiny enough to run directly in the browser.
export function createRandom(seed: number) {
  let state = seed >>> 0;

  return () => {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randomBetween(random: () => number, min: number, max: number) {
  return min + (max - min) * random();
}

export function randomNormal(random: () => number) {
  // Box-Muller transform; clamp inputs away from zero to avoid infinite tails.
  const u = Math.max(random(), Number.EPSILON);
  const v = Math.max(random(), Number.EPSILON);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
