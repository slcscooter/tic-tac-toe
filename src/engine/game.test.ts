import { describe, expect, it } from 'vitest';
import { applyTurn, cell, CELL_COUNT, cellPosition, inverseTurn, LINES, turnPermutation } from './cube';
import type { Line, Turn } from './cube';
import { completedLines, newGame, outcome, placeMark } from './game';
import type { Cell, GameState, Mark, PickTurn } from './game';

const FRONT_CW: Turn = { axis: 2, layer: 1, quarter: -1 };
const always = (turn: Turn): PickTurn => seed => ({ turn, seed });

const empty = (): Cell[] => Array.from({ length: CELL_COUNT }, () => ({ mark: null, chaos: false }));
const withMarks = (X: readonly number[], O: readonly number[]): Cell[] =>
  empty().map((c, i) => ({ ...c, mark: X.includes(i) ? 'X' : O.includes(i) ? 'O' : null }));

/** A game in progress with exactly the marks and hidden chaos cells given. */
function board(opts: { X?: number[]; O?: number[]; chaos?: number[]; turn?: Mark; chaosTriggered?: number }): GameState {
  const cells = empty().map((_, i) => ({
    mark: opts.X?.includes(i) ? 'X' : opts.O?.includes(i) ? 'O' : null,
    chaos: opts.chaos?.includes(i) ?? false,
  })) as Cell[];
  return { ...newGame(1), cells, turn: opts.turn ?? 'X', chaosTriggered: opts.chaosTriggered ?? 0 };
}

const FRONT_MIDDLE_ROW: Line = LINES.find(
  l => l.kind === 'ring' && [cell('front', 1, 0), cell('front', 1, 1), cell('right', 1, 1)].every(c => l.cells.includes(c)),
)!;

const marksOf = (s: GameState, m: Mark) => s.cells.filter(c => c.mark === m).length;
const chaosCount = (s: GameState) => s.cells.filter(c => c.chaos).length;

describe('a new game', () => {
  it('is an empty board with X to move', () => {
    const g = newGame(42);
    expect(g.cells.every(c => c.mark === null)).toBe(true);
    expect(g.turn).toBe('X');
    expect(g.status).toBe('playing');
    expect(g.chaosTriggered).toBe(0);
  });

  it('hides exactly one chaos cell on each face', () => {
    for (let seed = 0; seed < 50; seed++) {
      const g = newGame(seed);
      const faces = g.cells.flatMap((c, i) => (c.chaos ? [cellPosition(i).face] : []));
      expect(faces.sort()).toEqual([0, 1, 2, 3, 4, 5]);
    }
  });

  it('places chaos the same way for the same seed', () => {
    expect(newGame(7).cells).toEqual(newGame(7).cells);
    expect(newGame(7).cells).not.toEqual(newGame(8).cells);
  });

  it('can hide chaos in any of a face\'s 9 cells, centers included', () => {
    const used = new Set<number>();
    for (let seed = 0; seed < 300; seed++) {
      newGame(seed).cells.forEach((c, i) => c.chaos && cellPosition(i).face === 0 && used.add(i));
    }
    expect(used.size).toBe(9);
  });
});

describe('placing a mark', () => {
  it('fills the cell and passes the turn', () => {
    const g = placeMark(newGame(3), cell('front', 0, 0));
    expect(g.cells[cell('front', 0, 0)].mark).toBe('X');
    expect(g.turn).toBe('O');
  });

  it('refuses a taken cell, a cell off the board, and any move after the game ends', () => {
    const g = board({ X: [0] });
    expect(placeMark(g, 0)).toBe(g);
    expect(placeMark(g, -1)).toBe(g);
    expect(placeMark(g, CELL_COUNT)).toBe(g);
    const over = { ...g, status: 'won' as const };
    expect(placeMark(over, 5)).toBe(over);
  });

  it('wins with 5 in a row along a ring', () => {
    const [last, ...four] = FRONT_MIDDLE_ROW.cells;
    const g = placeMark(board({ X: four }), last);
    expect(g.status).toBe('won');
    expect(g.winner).toBe('X');
    expect(g.winningLines).toEqual([FRONT_MIDDLE_ROW]);
  });

  it('wins with 5 in a row along a diagonal', () => {
    const line = LINES.find(l => l.kind === 'diagonal')!;
    const [last, ...four] = line.cells;
    const g = placeMark(board({ O: four, turn: 'O' }), last);
    expect(g.winner).toBe('O');
  });

  it('is a draw when the board fills with no line', () => {
    // Found by a seeded search: 27 X and 27 O with no 5 in a row anywhere, corner Vs included.
    const full = 'OXOOXXXOOOXOXOXXOXOOXXXOOOOOXXOOXXXXOOXOXXOXXXOXOXOOOX';
    const X = [...full].flatMap((m, i) => (m === 'X' ? [i] : []));
    const O = [...full].flatMap((m, i) => (m === 'O' ? [i] : []));
    const last = X.pop()!;
    const g = placeMark(board({ X, O }), last);
    expect(completedLines(g.cells)).toEqual([]);
    expect(g.status).toBe('draw');
    expect(g.winner).toBeNull();
  });
});

describe('chaos cells', () => {
  it('runs one more turn on each trigger: 1 for the first, up to 6 for the sixth', () => {
    for (let k = 1; k <= 6; k++) {
      const target = cell('back', 1, 1);
      const g = placeMark(board({ chaos: [target], chaosTriggered: k - 1 }), target);
      expect(g.lastMove?.chaos?.number).toBe(k);
      expect(g.lastMove?.chaos?.turns).toHaveLength(k);
      expect(g.chaosTriggered).toBe(k);
    }
  });

  it('places the mark first, then turns, keeping every mark', () => {
    const target = cell('front', 0, 0);
    const g = placeMark(board({ X: [cell('top', 0, 0)], O: [cell('left', 2, 2)], chaos: [target], turn: 'O' }), target, always(FRONT_CW));
    expect(g.cells[target].mark).toBeNull();
    expect(g.cells[turnPermutation(FRONT_CW)[target]].mark).toBe('O');
    expect(marksOf(g, 'X')).toBe(1);
    expect(marksOf(g, 'O')).toBe(2);
  });

  it('spends the triggered chaos cell, and the others travel with their cells', () => {
    const target = cell('back', 1, 1);
    const rider = cell('front', 0, 0); // moved by a Front turn
    const g = placeMark(board({ chaos: [target, rider] }), target, always(FRONT_CW));
    expect(chaosCount(g)).toBe(1);
    expect(g.cells[turnPermutation(FRONT_CW)[rider]].chaos).toBe(true);
  });

  it('replays the same turns from the same seed', () => {
    const start = board({ chaos: [cell('back', 1, 1)], chaosTriggered: 5 });
    const a = placeMark(start, cell('back', 1, 1));
    const b = placeMark(start, cell('back', 1, 1));
    expect(a.lastMove?.chaos?.turns).toEqual(b.lastMove?.chaos?.turns);
    expect(a.seed).not.toBe(start.seed);
  });

  it('leaves the random source alone on a normal move', () => {
    const start = board({});
    expect(placeMark(start, 0).seed).toBe(start.seed);
  });

  it('skips the chaos when the mark itself completes 5 in a row', () => {
    const [last, ...four] = FRONT_MIDDLE_ROW.cells;
    const other = cell('back', 0, 0);
    const g = placeMark(board({ X: four, chaos: [last, other] }), last, always(FRONT_CW));
    expect(g.winner).toBe('X');
    expect(g.lastMove?.chaos).toBeNull();
    expect(g.chaosTriggered).toBe(0);
    expect(g.cells[other].chaos).toBe(true);
    expect(g.cells[last].mark).toBe('X');
  });

  // Builds the board as it should look after the turn, then turns it back to get the start.
  const before = (after: Cell[], turn: Turn) => applyTurn(after, inverseTurn(turn));

  it('gives the win to the other player when chaos completes their line', () => {
    const line = LINES.find(l => completedLines(before(withMarks([], l.cells), FRONT_CW)).length === 0)!;
    const start = before(withMarks([], line.cells), FRONT_CW);
    const target = start.findIndex(c => c.mark === null);
    start[target] = { mark: null, chaos: true };
    expect(completedLines(start)).toEqual([]);

    const g = placeMark({ ...board({}), cells: start, turn: 'X' }, target, always(FRONT_CW));
    expect(g.status).toBe('won');
    expect(g.winner).toBe('O');
  });

  it('is a draw when chaos completes a line for both players at once', () => {
    let pair: [Line, Line] | undefined;
    search: for (const a of LINES) {
      for (const b of LINES) {
        if (a.cells.some(c => b.cells.includes(c))) continue;
        if (completedLines(before(withMarks(a.cells, b.cells), FRONT_CW)).length === 0) {
          pair = [a, b];
          break search;
        }
      }
    }
    expect(pair).toBeDefined();
    const [a, b] = pair!;
    const start = before(withMarks(a.cells, b.cells), FRONT_CW);
    const target = start.findIndex(c => c.mark === null);
    start[target] = { mark: null, chaos: true };

    const g = placeMark({ ...board({}), cells: start, turn: 'O' }, target, always(FRONT_CW));
    expect(g.status).toBe('draw');
    expect(g.winner).toBeNull();
    expect(new Set(g.winningLines.map(l => g.cells[l.cells[0]].mark))).toEqual(new Set(['X', 'O']));
  });
});

describe('outcome', () => {
  it('is still playing on an empty board', () => {
    expect(outcome(empty()).status).toBe('playing');
  });

  it('is a draw with a line for each player', () => {
    const a = LINES.find(l => l.cells.every(c => cellPosition(c).face !== 5))!;
    const b = LINES.find(l => l.cells.every(c => !a.cells.includes(c)))!;
    expect(outcome(withMarks(a.cells, b.cells)).status).toBe('draw');
  });
});

