import { describe, expect, it } from 'vitest';
import {
  applyTurn,
  cell,
  CELL_COUNT,
  cellIndex,
  cellName,
  cellPosition,
  cornerVs,
  describeTurn,
  facesCovered,
  inverseTurn,
  isClockwise,
  LINES,
  neighbor,
  stickerOf,
  tracks,
  TURNS,
  turnPermutation,
  whereAfter,
} from './cube';
import type { Turn } from './cube';

const identity = Array.from({ length: CELL_COUNT }, (_, i) => i);

const FRONT_CW: Turn = { axis: 2, layer: 1, quarter: -1 };
const TOP_CW: Turn = { axis: 1, layer: 1, quarter: -1 };
const MIDDLE_LR_CW: Turn = { axis: 0, layer: 0, quarter: 1 }; // seen from Left

const where = (turn: Turn, from: number) => turnPermutation(turn)[from];

describe('cells', () => {
  it('round-trips every index through face, row and column', () => {
    for (const i of identity) {
      const { face, row, col } = cellPosition(i);
      expect(cellIndex(face, row, col)).toBe(i);
    }
  });

  it('names cells by face and 1 to 9 in keypad order', () => {
    expect(cellName(cell('front', 0, 0))).toBe('Front 1');
    expect(cellName(cell('front', 0, 2))).toBe('Front 3');
    expect(cellName(cell('front', 1, 1))).toBe('Front 5');
    expect(cellName(cell('bottom', 2, 0))).toBe('Bottom 7');
    expect(cellName(cell('back', 2, 2))).toBe('Back 9');
  });
});

describe('turns', () => {
  it('has 18 turns: 9 slices, each a quarter turn either way', () => {
    expect(TURNS).toHaveLength(18);
  });

  it('moves every cell somewhere and never loses or doubles one', () => {
    for (const t of TURNS) {
      expect([...turnPermutation(t)].sort((a, b) => a - b)).toEqual(identity);
    }
  });

  it('moves 20 cells on an outer face turn and 12 on a middle slice', () => {
    for (const t of TURNS) {
      const moved = turnPermutation(t).filter((to, from) => to !== from).length;
      expect(moved).toBe(t.layer === 0 ? 12 : 20);
    }
  });

  it('returns to the start after four quarter turns, or a turn and its inverse', () => {
    for (const t of TURNS) {
      const four = [t, t, t, t].reduce((cells, turn) => applyTurn(cells, turn), identity);
      expect(four).toEqual(identity);
      expect(applyTurn(applyTurn(identity, t), inverseTurn(t))).toEqual(identity);
    }
  });

  // Worked out by hand from a real cube, independent of the code under test.
  it('turns Front clockwise like a real cube', () => {
    expect(describeTurn(FRONT_CW)).toBe('Front face, turned clockwise');
    expect(where(FRONT_CW, cell('top', 2, 0))).toBe(cell('right', 0, 0));
    expect(where(FRONT_CW, cell('top', 2, 2))).toBe(cell('right', 2, 0));
    expect(where(FRONT_CW, cell('front', 0, 0))).toBe(cell('front', 0, 2));
    expect(where(FRONT_CW, cell('front', 1, 1))).toBe(cell('front', 1, 1));
  });

  it('turns Top clockwise like a real cube: the front row goes to the left side', () => {
    expect(describeTurn(TOP_CW)).toBe('Top face, turned clockwise');
    expect(where(TOP_CW, cell('front', 0, 0))).toBe(cell('left', 0, 0));
    expect(where(TOP_CW, cell('front', 0, 2))).toBe(cell('left', 0, 2));
  });

  it('turns the middle slice too, so face centers can move', () => {
    expect(isClockwise(MIDDLE_LR_CW)).toBe(true);
    expect(where(MIDDLE_LR_CW, cell('front', 1, 1))).toBe(cell('bottom', 1, 1));
  });

  it('calls the inverse of a clockwise turn counterclockwise', () => {
    for (const t of TURNS) expect(isClockwise(inverseTurn(t))).toBe(!isClockwise(t));
  });
});

describe('neighbors across cube edges', () => {
  it('steps off a face onto the next one', () => {
    expect(neighbor(cell('front', 1, 2), 0, 1)).toBe(cell('right', 1, 0));
    expect(neighbor(cell('front', 0, 1), -1, 0)).toBe(cell('top', 2, 1));
    expect(neighbor(cell('top', 0, 1), -1, 0)).toBe(cell('back', 0, 1));
    expect(neighbor(cell('left', 1, 0), 0, -1)).toBe(cell('back', 1, 2));
  });

  it('has no diagonal step into a cube corner', () => {
    expect(neighbor(cell('front', 0, 0), -1, -1)).toBeNull();
    expect(neighbor(cell('front', 2, 2), 1, 1)).toBeNull();
  });
});

describe('winning lines', () => {
  const rings = LINES.filter(l => l.kind === 'ring');
  const diagonals = LINES.filter(l => l.kind === 'diagonal');
  const corners = LINES.filter(l => l.kind === 'corner');
  const has = (cells: number[]) =>
    LINES.some(l => cells.every(c => l.cells.includes(c)));

  it('has 9 rings of 12 cells, giving 108 lines over 2 or 3 faces', () => {
    expect(tracks('ring').map(t => [t.cells.length, t.closed])).toEqual(Array(9).fill([12, true]));
    expect(rings).toHaveLength(108);
    expect(rings.filter(l => facesCovered(l) === 2)).toHaveLength(72);
    expect(rings.filter(l => facesCovered(l) === 3)).toHaveLength(36);
  });

  it('has 8 diagonal loops of 9 cells, giving 72 lines over 3 or 4 faces', () => {
    const loops = tracks('diagonal').filter(t => t.closed);
    expect(loops.map(t => t.cells.length)).toEqual(Array(8).fill(9));
    expect(diagonals).toHaveLength(72);
    expect(diagonals.filter(l => facesCovered(l) === 3)).toHaveLength(24);
    expect(diagonals.filter(l => facesCovered(l) === 4)).toHaveLength(48);
  });

  it('stops each face corner-to-corner diagonal at the cube corners, 3 cells long', () => {
    const dead = tracks('diagonal').filter(t => !t.closed);
    expect(dead.map(t => t.cells.length)).toEqual(Array(12).fill(3));
  });

  it('carries each corner-to-corner diagonal through the corner into a V: 24 Vs, giving 48 lines over 2 faces', () => {
    const vs = cornerVs();
    expect(vs).toHaveLength(24);
    for (const v of vs) {
      expect(v).toHaveLength(6);
      // The two halves meet on one corner block: all three coordinates are +-1.
      const [a, b] = [stickerOf(v[2]).p, stickerOf(v[3]).p];
      expect(a).toEqual(b);
      expect(a.every(x => Math.abs(x) === 1)).toBe(true);
    }
    expect(corners).toHaveLength(48);
    expect(corners.every(l => facesCovered(l) === 2)).toBe(true);
  });

  it('puts face centers on rings and corner Vs, never on a diagonal that crosses an edge', () => {
    const centers = [0, 1, 2, 3, 4, 5].map(f => cellIndex(f, 1, 1));
    expect(diagonals.some(l => l.cells.some(c => centers.includes(c)))).toBe(false);
    for (const c of centers) {
      expect(rings.some(l => l.cells.includes(c))).toBe(true);
      expect(corners.some(l => l.cells.includes(c))).toBe(true);
    }
  });

  it('has 228 different lines of 5 different cells', () => {
    expect(LINES).toHaveLength(228);
    const ids = new Set(LINES.map(l => [...l.cells].sort((a, b) => a - b).join(',')));
    expect(ids.size).toBe(228);
    for (const l of LINES) expect(new Set(l.cells).size).toBe(5);
  });

  it('steps one cell at a time along each line', () => {
    const steps = (kind: 'ring' | 'diagonal' | 'corner') =>
      kind === 'ring' ? [[0, 1], [0, -1], [1, 0], [-1, 0]] : [[1, 1], [1, -1], [-1, 1], [-1, -1]];
    for (const l of LINES) {
      for (let k = 1; k < l.cells.length; k++) {
        const reachable = steps(l.kind).map(([r, c]) => neighbor(l.cells[k - 1], r, c));
        // A V's one turn goes between two faces of the same corner block, not by a step.
        const sameBlock = String(stickerOf(l.cells[k - 1]).p) === String(stickerOf(l.cells[k]).p);
        if (l.kind === 'corner' && sameBlock) continue;
        expect(reachable).toContain(l.cells[k]);
      }
    }
  });

  // Scott's V, from his play test on 2026-11-24, worked out on a real cube.
  it("counts Scott's V: Left 1, 5, 9 turning through the corner onto Bottom 1, 5, 9", () => {
    expect(has([cell('left', 0, 0), cell('left', 1, 1), cell('left', 2, 2), cell('bottom', 0, 0), cell('bottom', 1, 1)])).toBe(true);
    expect(has([cell('left', 1, 1), cell('left', 2, 2), cell('bottom', 0, 0), cell('bottom', 1, 1), cell('bottom', 2, 2)])).toBe(true);
    // A V of two diagonals that meet at no corner block is still not a line.
    expect(has([cell('left', 0, 2), cell('left', 1, 1), cell('left', 2, 0), cell('bottom', 0, 0), cell('bottom', 1, 1)])).toBe(false);
  });

  // Worked out by hand from a real cube, independent of the code under test.
  it('counts the Front middle row continuing onto Right', () => {
    expect(has([cell('front', 1, 0), cell('front', 1, 1), cell('front', 1, 2), cell('right', 1, 0), cell('right', 1, 1)])).toBe(true);
  });

  it('counts a diagonal that crosses from Top over Front onto Right', () => {
    expect(has([cell('top', 2, 0), cell('front', 0, 1), cell('front', 1, 2), cell('right', 2, 0)])).toBe(true);
  });
});

describe('whereAfter', () => {
  it('follows a cell through several turns', () => {
    const turns = [FRONT_CW, TOP_CW];
    const start = cell('top', 2, 0);
    // Front clockwise takes Top 7 to Right 1, then Top clockwise takes Right 1 to Front 1.
    expect(whereAfter(start, [FRONT_CW])).toBe(cell('right', 0, 0));
    expect(whereAfter(start, turns)).toBe(cell('front', 0, 0));
    expect(whereAfter(start, [])).toBe(start);
  });
});
