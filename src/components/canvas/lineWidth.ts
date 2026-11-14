/**
 * Line thickness by how many relations a line stands for.
 * Big steps from 1 to 2 to 3 so the difference reads at a glance, then gentle growth up to 9.
 */
const BY_COUNT = [1.6, 3.4, 5.4, 6.4, 7.1, 7.7, 8.2, 8.6, 9];

export function lineWidth(count: number, derived: boolean): number {
  if (count <= 1) return derived ? 2.2 : 1.6;
  return BY_COUNT[Math.min(count, BY_COUNT.length) - 1];
}

/** Arrowhead size in pixels; grows with the line but much more slowly. */
export function arrowSize(width: number): number {
  return 20 + width * 2.6;
}
