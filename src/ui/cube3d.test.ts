import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { applyTurn, cellAt, CELL_COUNT, FACES, stickerOf, TURNS, turnPermutation } from '../engine/cube';
import type { Vec3 } from '../engine/cube';
import { beforeTurns, faceViewDirection, fromAngles, toAngles, turnAngle } from './cube3d';

const AXES = [new Vector3(1, 0, 0), new Vector3(0, 1, 0), new Vector3(0, 0, 1)];
const round = (v: Vector3): Vec3 => [Math.round(v.x), Math.round(v.y), Math.round(v.z)];
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

describe('the 3D view and the engine agree', () => {
  it('turns every slice the way the engine does: three.js rotation lands each cell where the engine says', () => {
    for (const turn of TURNS) {
      const perm = turnPermutation(turn);
      for (let i = 0; i < CELL_COUNT; i++) {
        const { p, n } = stickerOf(i);
        if (p[turn.axis] !== turn.layer) continue;
        const angle = turnAngle(turn);
        const p2 = round(new Vector3(...p).applyAxisAngle(AXES[turn.axis], angle));
        const n2 = round(new Vector3(...n).applyAxisAngle(AXES[turn.axis], angle));
        expect(cellAt(p2, n2)).toBe(perm[i]);
      }
    }
  });

  it('finds each cell from where it sits, and nothing inside the cube', () => {
    for (let i = 0; i < CELL_COUNT; i++) expect(cellAt(stickerOf(i).p, stickerOf(i).n)).toBe(i);
    expect(cellAt([0, 0, 1], [0, 0, -1])).toBeNull(); // the inward side of Front 5's cubie
  });

  it('rebuilds the board from before a chaos run', () => {
    const before = Array.from({ length: CELL_COUNT }, (_, i) => (i % 7 === 0 ? 'X' : i % 5 === 0 ? 'O' : null));
    const turns = [TURNS[0], TURNS[7], TURNS[13], TURNS[7]];
    const after = turns.reduce((cells, t) => applyTurn(cells, t), before);
    expect(after).not.toEqual(before);
    expect(beforeTurns(after, turns)).toEqual(before);
  });
});

describe('the camera', () => {
  it('looks at each face mostly head on, with neighbouring faces in view', () => {
    FACES.forEach((face, f) => {
      const d = faceViewDirection(f);
      expect(dot(d, face.normal)).toBeGreaterThan(0.7);
      expect(dot(d, face.normal)).toBeLessThan(0.95);
    });
  });

  it('converts directions to angles and back', () => {
    for (let f = 0; f < FACES.length; f++) {
      const d = faceViewDirection(f);
      const { theta, phi } = toAngles(d);
      fromAngles(theta, phi).forEach((c, k) => expect(c).toBeCloseTo(d[k], 9));
    }
  });
});
