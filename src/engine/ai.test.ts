import { describe, expect, it } from 'vitest';
import { chooseMove, seededRandom, toAiView, winningCells } from './ai';
import type { AiView, Level } from './ai';
import { CELL_COUNT, LINES } from './cube';
import { newGame, placeMark } from './game';
import type { GameState, Mark } from './game';

const LEVELS: Level[] = ['easy', 'medium', 'hard'];

function view(X: readonly number[], O: readonly number[], me: Mark = 'X'): AiView {
  const marks = Array.from({ length: CELL_COUNT }, (_, i) => (X.includes(i) ? 'X' : O.includes(i) ? 'O' : null));
  return { marks, me, chaosTriggered: 0 };
}

const RING = LINES.find(l => l.kind === 'ring')!;
// A ring line that shares no cell with RING, for the other player's marks.
const OTHER_RING = LINES.find(l => l.kind === 'ring' && l.cells.every(c => !RING.cells.includes(c)))!;

/** Plays one whole game between two levels, with real hidden chaos. */
function play(x: Level, o: Level, seed: number): GameState {
  let g = newGame(seed);
  const random = seededRandom(seed * 7 + 1);
  while (g.status === 'playing') {
    const move = chooseMove(toAiView(g), g.turn === 'X' ? x : o, random);
    expect(move).not.toBeNull();
    expect(g.cells[move!].mark).toBeNull();
    g = placeMark(g, move!);
  }
  return g;
}

describe('what the AI can see', () => {
  it('gets the marks, whose turn it is, and the public chaos count, and nothing else', () => {
    const g = placeMark(newGame(5), 0);
    const v = toAiView(g);
    expect(Object.keys(v).sort()).toEqual(['chaosTriggered', 'marks', 'me']);
    expect(v.marks).toEqual(g.cells.map(c => c.mark));
    expect(v.me).toBe('O');
    // @ts-expect-error The AI view has no cells, so no chaos flags.
    void v.cells;
    // @ts-expect-error The AI view has no seed, so the AI can't predict chaos turns.
    void v.seed;
  });

  it('chooses the same move whatever the hidden chaos cells and seed are', () => {
    for (let seed = 1; seed <= 20; seed++) {
      // The same marks, under two games with different hidden chaos and seeds.
      let a = newGame(seed);
      let b = newGame(seed + 1000);
      const random = seededRandom(seed);
      for (let k = 0; k < 6; k++) {
        const free = a.cells.findIndex((c, i) => c.mark === null && !c.chaos && !b.cells[i].chaos);
        a = placeMark(a, free);
        b = placeMark(b, free);
      }
      for (const level of LEVELS) {
        const r = random();
        expect(a.cells.map(c => c.chaos)).not.toEqual(b.cells.map(c => c.chaos));
        expect(chooseMove(toAiView(a), level, () => r)).toBe(chooseMove(toAiView(b), level, () => r));
      }
    }
  });
});

describe('every level', () => {
  // Lines run around loops, so 4 in a row can often be finished at either end: there may be
  // more than one winning cell.
  it('takes a win when it has one', () => {
    const v = view(RING.cells.slice(1), OTHER_RING.cells.slice(0, 2));
    for (const level of LEVELS) {
      for (let seed = 1; seed <= 10; seed++) {
        expect(winningCells(v.marks, 'X')).toContain(chooseMove(v, level, seededRandom(seed)));
      }
    }
  });

  it('takes its own win rather than blocking', () => {
    const v = view(RING.cells.slice(1), OTHER_RING.cells.slice(1));
    const mine = winningCells(v.marks, 'X');
    const blocksOnly = winningCells(v.marks, 'O').filter(c => !mine.includes(c));
    expect(blocksOnly.length).toBeGreaterThan(0);
    for (const level of LEVELS) {
      for (let seed = 1; seed <= 10; seed++) {
        expect(mine).toContain(chooseMove(v, level, seededRandom(seed)));
      }
    }
  });

  it('returns null on a full board', () => {
    const all = Array.from({ length: CELL_COUNT }, (_, i) => i);
    for (const level of LEVELS) {
      expect(chooseMove(view(all.filter(i => i % 2), all.filter(i => !(i % 2))), level, seededRandom(1))).toBeNull();
    }
  });

  it('only ever picks an empty cell, through whole games', () => {
    for (const x of LEVELS) for (const o of LEVELS) play(x, o, 3);
  });
});

describe('blocking', () => {
  it('is always done by Medium and Hard', () => {
    // O has 4 in a row. X already holds one end, so exactly one cell blocks.
    const theirFour = OTHER_RING.cells.slice(1);
    const ends = winningCells(view([], theirFour).marks, 'O');
    expect(ends).toHaveLength(2);
    const [gap, held] = ends;
    const v = view([held, ...RING.cells.slice(0, 2)], theirFour);
    expect(winningCells(v.marks, 'O')).toEqual([gap]);
    expect(winningCells(v.marks, 'X')).toEqual([]);
    for (const level of ['medium', 'hard'] as const) {
      for (let seed = 1; seed <= 10; seed++) {
        expect(chooseMove(v, level, seededRandom(seed))).toBe(gap);
      }
    }
  });
});

describe('Hard', () => {
  it('sets up two threats at once, which can only be blocked one at a time', () => {
    // Two lines that cross at one cell. X has 3 on each, and their crossing is empty.
    let fork: { cross: number; X: number[] } | undefined;
    search: for (const a of LINES) {
      for (const b of LINES) {
        const shared = a.cells.filter(c => b.cells.includes(c));
        if (a === b || shared.length !== 1) continue;
        const cross = shared[0];
        const X = [...a.cells.filter(c => c !== cross).slice(0, 3), ...b.cells.filter(c => c !== cross).slice(0, 3)];
        const v = view(X, []);
        if (new Set(X).size === 6 && winningCells(v.marks, 'X').length === 0) {
          fork = { cross, X };
          break search;
        }
      }
    }
    expect(fork).toBeDefined();
    const { cross, X } = fork!;
    const before = view(X, []);
    const withCross = before.marks.map((m, i) => (i === cross ? 'X' : m));
    expect(winningCells(withCross, 'X').length).toBeGreaterThanOrEqual(2);
    // Playing the crossing is one such move. On looping lines there can be others, so the test
    // checks the result, not the cell.
    for (let seed = 1; seed <= 10; seed++) {
      const move = chooseMove(before, 'hard', seededRandom(seed))!;
      const after = before.marks.map((m, i) => (i === move ? 'X' : m));
      expect(winningCells(after, 'X').length).toBeGreaterThanOrEqual(2);
    }
  });
});

// Whole games with real chaos. Seeded, so each run plays the same games. Thresholds sit below
// the rates measured on 2026-11-24 over 30 games a pairing: Medium and Hard won 30 of 30 against
// Easy; Hard won 27 of 30 as X and 21 of 30 as O against Medium.
describe('strength', () => {
  const wins = (strong: Level, weak: Level, games: number) => {
    let won = 0;
    for (let seed = 1; seed <= games; seed++) {
      if (play(strong, weak, seed).winner === 'X') won++;
      if (play(weak, strong, seed).winner === 'O') won++;
    }
    return won / (2 * games);
  };

  it('Medium beats Easy', () => {
    expect(wins('medium', 'easy', 10)).toBeGreaterThanOrEqual(0.9);
  });

  it('Hard beats Easy', () => {
    expect(wins('hard', 'easy', 10)).toBeGreaterThanOrEqual(0.9);
  });

  it('Hard beats Medium most of the time', () => {
    expect(wins('hard', 'medium', 10)).toBeGreaterThanOrEqual(0.6);
  });
});
