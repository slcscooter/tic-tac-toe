// Game rules for the Chaos Cube. Rules of record: docs/game-rules.md.
// Every function here is pure: it returns a new state and never changes the one it was given.

import { applyTurn, CELL_COUNT, cellIndex, FACES, LINES, TURNS } from './cube';
import type { Line, Turn } from './cube';
import { nextInt } from './random';

export type Mark = 'X' | 'O';
export type Status = 'playing' | 'won' | 'draw';

export interface Cell {
  readonly mark: Mark | null;
  /** A hidden chaos cell that nobody has triggered yet. Never show this to a player or the AI. */
  readonly chaos: boolean;
}

export interface ChaosEvent {
  /** Which chaos trigger this was in the game, 1 to 6. It is also the number of turns made. */
  readonly number: number;
  readonly turns: readonly Turn[];
}

export interface MoveEvent {
  readonly player: Mark;
  /** Where the mark was placed, before any chaos turns moved it. */
  readonly index: number;
  readonly chaos: ChaosEvent | null;
}

export interface GameState {
  readonly cells: readonly Cell[];
  /** Whose move it is. Once the game ends, the player who made the last move. */
  readonly turn: Mark;
  readonly status: Status;
  readonly winner: Mark | null;
  /** Completed lines when the game ended, for every player who has one. */
  readonly winningLines: readonly Line[];
  readonly chaosTriggered: number;
  readonly lastMove: MoveEvent | null;
  /** State of the seeded random source. */
  readonly seed: number;
}

export const CHAOS_PER_FACE = 1;

const other = (m: Mark): Mark => (m === 'X' ? 'O' : 'X');

/** A new game: an empty board with one hidden chaos cell on each face, X to move. */
export function newGame(seed: number): GameState {
  let s = seed >>> 0;
  const chaos = new Set<number>();
  for (let face = 0; face < FACES.length; face++) {
    const pick = nextInt(s, 9);
    s = pick.state;
    chaos.add(cellIndex(face, Math.floor(pick.value / 3), pick.value % 3));
  }
  return {
    cells: Array.from({ length: CELL_COUNT }, (_, i) => ({ mark: null, chaos: chaos.has(i) })),
    turn: 'X',
    status: 'playing',
    winner: null,
    winningLines: [],
    chaosTriggered: 0,
    lastMove: null,
    seed: s,
  };
}

/** Every line that is filled by one player. */
export function completedLines(cells: readonly Cell[]): Line[] {
  return LINES.filter(line => {
    const m = cells[line.cells[0]].mark;
    return m !== null && line.cells.every(c => cells[c].mark === m);
  });
}

export interface Outcome {
  readonly status: Status;
  readonly winner: Mark | null;
  readonly winningLines: readonly Line[];
}

/** Who has won, if anyone. A line for both players at once is a draw, and so is a full board. */
export function outcome(cells: readonly Cell[]): Outcome {
  const lines = completedLines(cells);
  const players = [...new Set(lines.map(l => cells[l.cells[0]].mark as Mark))];
  if (players.length === 2) return { status: 'draw', winner: null, winningLines: lines };
  if (players.length === 1) return { status: 'won', winner: players[0], winningLines: lines };
  if (cells.every(c => c.mark !== null)) return { status: 'draw', winner: null, winningLines: [] };
  return { status: 'playing', winner: null, winningLines: [] };
}

/** Picks one random turn. Tests replace this to force a particular turn. */
export type PickTurn = (seed: number) => { turn: Turn; seed: number };

export const randomTurn: PickTurn = seed => {
  const r = nextInt(seed, TURNS.length);
  return { turn: TURNS[r.value], seed: r.state };
};

/**
 * The current player places a mark on `index`. Returns the same state, unchanged, when the move
 * is not allowed: the game is over, the index is off the board, or the cell is taken.
 */
export function placeMark(state: GameState, index: number, pickTurn: PickTurn = randomTurn): GameState {
  if (state.status !== 'playing') return state;
  if (!Number.isInteger(index) || index < 0 || index >= CELL_COUNT) return state;
  const target = state.cells[index];
  if (target.mark !== null) return state;

  const player = state.turn;
  let cells: readonly Cell[] = state.cells.map((c, i) => (i === index ? { mark: player, chaos: false } : c));

  // A line made by the placement wins at once, and the chaos never runs.
  const afterPlacement = outcome(cells);
  if (afterPlacement.status === 'won' || !target.chaos) {
    return finish(cells, afterPlacement, { player, index, chaos: null }, state.chaosTriggered, state.seed);
  }

  const number = state.chaosTriggered + 1;
  const turns: Turn[] = [];
  let seed = state.seed;
  for (let k = 0; k < number; k++) {
    const pick = pickTurn(seed);
    seed = pick.seed;
    turns.push(pick.turn);
    cells = applyTurn(cells, pick.turn);
  }
  return finish(cells, outcome(cells), { player, index, chaos: { number, turns } }, number, seed);
}

function finish(
  cells: readonly Cell[],
  result: Outcome,
  lastMove: MoveEvent,
  chaosTriggered: number,
  seed: number,
): GameState {
  return {
    cells,
    turn: result.status === 'playing' ? other(lastMove.player) : lastMove.player,
    status: result.status,
    winner: result.winner,
    winningLines: result.winningLines,
    chaosTriggered,
    lastMove,
    seed,
  };
}
