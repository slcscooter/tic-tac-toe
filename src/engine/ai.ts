// The computer player. Rules of record: docs/game-rules.md.
//
// The AI never sees where the hidden chaos cells are, and never sees the random seed, which would
// let it predict chaos turns. It only gets an AiView, built by toAiView. The number of chaos
// triggers so far is public, because every trigger is announced to the players.

import { CELL_COUNT, LINES, WIN_LENGTH } from './cube';
import type { GameState, Mark } from './game';
import { nextRandom } from './random';

export type Level = 'easy' | 'medium' | 'hard';

export interface AiView {
  readonly marks: readonly (Mark | null)[];
  readonly me: Mark;
  readonly chaosTriggered: number;
}

/** What the AI is allowed to know: the marks on the board, whose turn it is, and nothing hidden. */
export function toAiView(state: GameState): AiView {
  return { marks: state.cells.map(c => c.mark), me: state.turn, chaosTriggered: state.chaosTriggered };
}

/** A seeded source of numbers from 0 up to 1, for move choice. */
export type Random = () => number;

export function seededRandom(seed: number): Random {
  let s = seed >>> 0;
  return () => {
    const r = nextRandom(s);
    s = r.state;
    return r.value;
  };
}

const other = (m: Mark): Mark => (m === 'X' ? 'O' : 'X');

/** For each cell, the indexes of the lines through it. */
const CELL_LINES: readonly (readonly number[])[] = Array.from({ length: CELL_COUNT }, (_, c) =>
  LINES.flatMap((l, i) => (l.cells.includes(c) ? [i] : [])),
);

function emptyCells(marks: readonly (Mark | null)[]): number[] {
  return marks.flatMap((m, i) => (m === null ? [i] : []));
}

function countIn(marks: readonly (Mark | null)[], line: number, who: Mark): { mine: number; theirs: number } {
  let mine = 0;
  let theirs = 0;
  for (const c of LINES[line].cells) {
    if (marks[c] === who) mine++;
    else if (marks[c] !== null) theirs++;
  }
  return { mine, theirs };
}

/** Empty cells where `who` completes 5 in a row by playing there. */
export function winningCells(marks: readonly (Mark | null)[], who: Mark): number[] {
  return emptyCells(marks).filter(c =>
    CELL_LINES[c].some(l => {
      const { mine, theirs } = countIn(marks, l, who);
      return theirs === 0 && mine === WIN_LENGTH - 1;
    }),
  );
}

/**
 * Empty cells where `who` would make two winning cells at once, a trap the other player can only
 * block half of. Meant for when `who` has no winning cell yet; with one, they would just win.
 */
export function forkCells(marks: readonly (Mark | null)[], who: Mark): number[] {
  return emptyCells(marks).filter(f => {
    const wins = new Set<number>();
    for (const l of CELL_LINES[f]) {
      const { mine, theirs } = countIn(marks, l, who);
      if (theirs !== 0 || mine !== WIN_LENGTH - 2) continue;
      for (const c of LINES[l].cells) if (c !== f && marks[c] === null) wins.add(c);
    }
    return wins.size >= 2;
  });
}

/** The empty cells that leave the opponent the fewest traps (forkCells) once `me` plays there. */
function defenses(marks: readonly (Mark | null)[], me: Mark): Set<number> {
  const open = emptyCells(marks);
  if (forkCells(marks, other(me)).length === 0) return new Set(open);
  const board = [...marks];
  const left = new Map<number, number>();
  for (const c of open) {
    board[c] = me;
    left.set(c, forkCells(board, other(me)).length);
    board[c] = null;
  }
  const fewest = Math.min(...left.values());
  return new Set(open.filter(c => left.get(c) === fewest));
}

// Value of a line holding k of one player's marks and none of the other's.
const LINE_VALUE = [0, 1, 8, 64, 512, 1_000_000];

/** How good a cell is to play, for attack and defense together. Higher is better. */
function cellValue(marks: readonly (Mark | null)[], cell: number, me: Mark): number {
  let v = 0;
  for (const l of CELL_LINES[cell]) {
    const { mine, theirs } = countIn(marks, l, me);
    if (theirs === 0) v += LINE_VALUE[mine + 1];
    if (mine === 0) v += LINE_VALUE[theirs + 1] * 0.9;
  }
  return v;
}

/** Board score from `me`'s side: open lines for me count for me, open lines for them against. */
function evaluate(marks: readonly (Mark | null)[], me: Mark): number {
  let score = 0;
  for (let l = 0; l < LINES.length; l++) {
    const { mine, theirs } = countIn(marks, l, me);
    if (theirs === 0) score += LINE_VALUE[mine];
    else if (mine === 0) score -= LINE_VALUE[theirs];
  }
  return score;
}

function completesLine(marks: readonly (Mark | null)[], cell: number, who: Mark): boolean {
  return CELL_LINES[cell].some(l => LINES[l].cells.every(c => marks[c] === who));
}

/** Picks from items with equal best score at random, so the AI is not predictable. */
function pickBest(cells: number[], score: (c: number) => number, random: Random): number {
  let best = -Infinity;
  let ties: number[] = [];
  for (const c of cells) {
    const s = score(c);
    if (s > best) {
      best = s;
      ties = [c];
    } else if (s === best) {
      ties.push(c);
    }
  }
  return ties[Math.floor(random() * ties.length)];
}

const pickAny = (cells: number[], random: Random) => cells[Math.floor(random() * cells.length)];

function ranked(marks: readonly (Mark | null)[], me: Mark): number[] {
  const values = new Map(emptyCells(marks).map(c => [c, cellValue(marks, c, me)]));
  return [...values.keys()].sort((a, b) => values.get(b)! - values.get(a)! || a - b);
}

const SEARCH_DEPTH = 3;
const SEARCH_WIDTH = 10;
const WIN_SCORE = 1e9;

/** Negamax with alpha-beta over the most promising cells. Chaos is unknown, so it is ignored. */
function search(marks: (Mark | null)[], toMove: Mark, depth: number, alpha: number, beta: number): number {
  if (depth === 0) return evaluate(marks, toMove);
  const moves = ranked(marks, toMove).slice(0, SEARCH_WIDTH);
  if (moves.length === 0) return 0;
  let best = -Infinity;
  for (const c of moves) {
    marks[c] = toMove;
    const score = completesLine(marks, c, toMove) ? WIN_SCORE + depth : -search(marks, other(toMove), depth - 1, -beta, -alpha);
    marks[c] = null;
    if (score > best) best = score;
    if (best > alpha) alpha = best;
    if (alpha >= beta) break;
  }
  return best;
}

/**
 * The AI's move: a cell index, or null if the board is full.
 *
 * - Easy takes a win when it has one, and otherwise plays anywhere. It never blocks.
 * - Medium takes a win, always blocks, and otherwise picks among its 3 best cells.
 * - Hard takes a win, blocks, sets a trap of two winning cells when it can, stops the opponent's
 *   traps, and otherwise looks 3 moves ahead.
 */
export function chooseMove(view: AiView, level: Level, random: Random): number | null {
  const { marks, me } = view;
  const open = emptyCells(marks);
  if (open.length === 0) return null;

  const wins = winningCells(marks, me);
  if (wins.length > 0) return pickAny(wins, random);
  if (level === 'easy') return pickAny(open, random);

  const blocks = winningCells(marks, other(me));
  if (blocks.length > 0) return pickBest(blocks, c => cellValue(marks, c, me), random);

  if (level === 'medium') {
    const top = ranked(marks, me).slice(0, 3);
    const roll = random();
    return top[roll < 0.6 || top.length < 2 ? 0 : roll < 0.85 || top.length < 3 ? 1 : 2];
  }

  const traps = forkCells(marks, me);
  if (traps.length > 0) return pickBest(traps, c => cellValue(marks, c, me), random);

  // The 3-move search can't see a trap coming: it is set on their next move and sprung 2 later.
  const safe = defenses(marks, me);
  const board = [...marks];
  const candidates = ranked(marks, me)
    .filter(c => safe.has(c))
    .slice(0, SEARCH_WIDTH);
  return pickBest(
    candidates,
    c => {
      board[c] = me;
      const score = -search(board, other(me), SEARCH_DEPTH - 1, -Infinity, Infinity);
      board[c] = null;
      return score;
    },
    random,
  );
}

export type HintReason = 'win' | 'block' | 'trap' | 'stop-trap' | 'build';

export interface Hint {
  readonly cell: number;
  /**
   * win: completes your line now. block: stops their line. trap: makes two winning cells, and
   * they can block only one. stop-trap: stops them making two winning cells. build: Hard's best
   * move.
   */
  readonly reason: HintReason;
}

/** A suggested move for the player to move, from Hard's point of view. Never sees chaos. */
export function hint(view: AiView, random: Random): Hint | null {
  const wins = winningCells(view.marks, view.me);
  const cellChoice = chooseMove(view, 'hard', random);
  if (cellChoice === null) return null;
  if (wins.includes(cellChoice)) return { cell: cellChoice, reason: 'win' };
  if (winningCells(view.marks, other(view.me)).includes(cellChoice)) return { cell: cellChoice, reason: 'block' };
  if (forkCells(view.marks, view.me).includes(cellChoice)) return { cell: cellChoice, reason: 'trap' };
  if (forkCells(view.marks, other(view.me)).length > 0) return { cell: cellChoice, reason: 'stop-trap' };
  return { cell: cellChoice, reason: 'build' };
}
