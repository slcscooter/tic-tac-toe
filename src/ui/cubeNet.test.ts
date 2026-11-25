import { Quaternion, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { CELL_COUNT, FACES, LINES, stickerOf } from '../engine/cube';
import { buildNet } from './cubeNet';

const worldPos = (o: { getWorldPosition(v: Vector3): Vector3 }) => o.getWorldPosition(new Vector3());

describe('unfolding the cube to show a winning line', () => {
  it('matches the cube exactly when folded', () => {
    const net = buildNet(LINES[0].cells);
    net.setProgress(0);
    net.anchors.forEach((a, i) => {
      const { p, n } = stickerOf(i);
      const rest = new Vector3(...p).addScaledVector(new Vector3(...n), 0.5);
      expect(worldPos(a).distanceTo(rest)).toBeLessThan(1e-9);
    });
  });

  it(`lays every one of the ${LINES.length} lines flat in one straight, unbroken run, with no squares overlapping`, () => {
    for (const line of LINES) {
      const net = buildNet(line.cells);
      net.setProgress(1);
      const normal = new Vector3(...FACES[net.plan.root].normal);
      const at = net.anchors.map(worldPos);

      // Flat: every square lies in the root face's plane and faces the same way.
      for (let i = 0; i < CELL_COUNT; i++) {
        expect(at[i].dot(normal)).toBeCloseTo(1.5, 9);
        const facing = new Vector3(0, 0, 1).applyQuaternion(net.anchors[i].getWorldQuaternion(new Quaternion()));
        expect(facing.dot(normal)).toBeCloseTo(1, 9);
      }
      // No two squares in the same place.
      for (let i = 0; i < CELL_COUNT; i++)
        for (let j = i + 1; j < CELL_COUNT; j++) expect(at[i].distanceTo(at[j])).toBeGreaterThan(0.99);

      // The line: each step the same length and direction as the first, 1 square (or a diagonal) apart.
      const pts = line.cells.map(c => at[c]);
      const step = pts[1].clone().sub(pts[0]);
      expect([1, Math.SQRT2].some(len => Math.abs(step.length() - len) < 1e-9)).toBe(true);
      for (let k = 1; k < pts.length; k++) expect(pts[k].clone().sub(pts[k - 1]).distanceTo(step)).toBeLessThan(1e-9);
    }
  });
});
