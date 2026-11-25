// Pure helpers for the 3D cube view: no three.js and no DOM, so they test in plain Node.
// The view uses the engine's own coordinates (x right, y up, z toward the viewer), which are
// also three.js's, so a slice turn drawn on screen is the same turn the engine made.

import { applyTurn, FACES, inverseTurn } from '../engine/cube';
import type { Turn, Vec3 } from '../engine/cube';

/**
 * The direction the camera looks from to show a face: mostly straight at it, lifted and shifted
 * a little so two neighbouring faces show too and the cube reads as a solid.
 */
export function faceViewDirection(face: number): Vec3 {
  const [x, y, z] = FACES[face].normal;
  if (y !== 0) return normalize([0.3, y, 0.75]); // Top and Bottom: seen from in front, above or below
  // Side faces: lift toward Top, and shift toward the face on the right of this one.
  const right: Vec3 = [z, 0, -x];
  return normalize([x + 0.55 * right[0], 0.6, z + 0.55 * right[2]]);
}

export function normalize(v: Vec3): Vec3 {
  const len = Math.hypot(...v);
  return [v[0] / len, v[1] / len, v[2] / len];
}

/** Spherical angles of a direction: theta around the y axis from +z, phi down from +y. */
export function toAngles(v: Vec3): { theta: number; phi: number } {
  const [x, y, z] = normalize(v);
  return { theta: Math.atan2(x, z), phi: Math.acos(Math.max(-1, Math.min(1, y))) };
}

export function fromAngles(theta: number, phi: number): Vec3 {
  return [Math.sin(phi) * Math.sin(theta), Math.cos(phi), Math.sin(phi) * Math.cos(theta)];
}

/** The board as it stood before `turns` ran, given the board after them. */
export function beforeTurns<T>(after: readonly T[], turns: readonly Turn[]): T[] {
  return [...turns].reverse().reduce<T[]>((cells, t) => applyTurn(cells, inverseTurn(t)), [...after]);
}

/** The angle, in radians, a turn rotates its slice about the positive axis. */
export const turnAngle = (turn: Turn): number => (turn.quarter * Math.PI) / 2;
