import { Quaternion, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { CELL_COUNT, cornerVs, FACES, LINES, stickerOf, tracks } from '../engine/cube';
import { completedLines, newGame, winningRun } from '../engine/game';
import type { GameState } from '../engine/game';
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

  /** Lays the net for `cells` flat and checks it is flat, has no overlaps, and `cells` run straight. */
  function expectStraightNet(cells: readonly number[]) {
    const net = buildNet(cells);
    net.setProgress(1);
    const normal = new Vector3(...FACES[net.plan.root].normal);
    const at = net.anchors.map(worldPos);

    // Flat: every square lies in the root face's plane and faces the same way.
    const facing = net.anchors.map(a => new Vector3(0, 0, 1).applyQuaternion(a.getWorldQuaternion(new Quaternion())));
    expect(at.every(p => Math.abs(p.dot(normal) - 1.5) < 1e-9)).toBe(true);
    expect(facing.every(f => Math.abs(f.dot(normal) - 1) < 1e-9)).toBe(true);
    // No two squares in the same place: squares sit on a grid of 1, so rounding tells them apart.
    expect(new Set(at.map(p => p.toArray().map(Math.round).join(','))).size).toBe(CELL_COUNT);

    // The line: each step the same length and direction as the first, 1 square (or a diagonal) apart.
    const pts = cells.map(c => at[c]);
    const step = pts[1].clone().sub(pts[0]);
    expect([1, Math.SQRT2].some(len => Math.abs(step.length() - len) < 1e-9)).toBe(true);
    expect(pts.every((p, k) => k === 0 || p.clone().sub(pts[k - 1]).distanceTo(step) < 1e-9)).toBe(true);
  }

  it(`lays every one of the ${LINES.length} lines flat in one straight, unbroken run, with no squares overlapping`, () => {
    for (const line of LINES) expectStraightNet(line.cells);
  });

  it('lays every longer run flat and straight too, as winningRun finds them', () => {
    // Every stretch of 6 or more along every ring, diagonal loop and V, from every starting cell.
    const loops = [...tracks('ring'), ...tracks('diagonal').filter(t => t.closed)];
    const stretches = [
      ...loops.flatMap(({ cells: t }) =>
        t.flatMap((_, s) => Array.from({ length: t.length - 5 }, (_, k) => Array.from({ length: 6 + k }, (_, j) => t[(s + j) % t.length]))),
      ),
      ...cornerVs(),
    ];
    const seen = new Set<string>();
    for (const stretch of stretches) {
      const cells = newGame(1).cells.map((c, i) => ({ ...c, mark: stretch.includes(i) ? ('X' as const) : null }));
      const state: GameState = { ...newGame(1), cells, status: 'won', winner: 'X', winningLines: completedLines(cells) };
      const run = winningRun(state)!;
      // The run lies along the stretch.
      expect(run.every(c => stretch.includes(c))).toBe(true);
      // Up to 10 the run is the whole stretch. An 11 on a ring can lose a cell rather than come back
      // onto the face it started on.
      expect(run.length).toBe(stretch.length === 11 ? run.length : stretch.length);
      expect(run.length).toBeGreaterThanOrEqual(Math.min(stretch.length, 10));
      const id = run.join(',');
      if (seen.has(id)) continue;
      seen.add(id);
      expectStraightNet(run);
    }
    expect(seen.size).toBeGreaterThan(200);
  });
});
