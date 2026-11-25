// Everything the game says out loud, as plain text. The live log reads these to screen readers,
// and sighted players see the same words. Rules of record: docs/game-rules.md.

import { cellName, describeTurn, whereAfter } from '../engine/cube';
import type { HintReason } from '../engine/ai';
import type { GameState, Mark } from '../engine/game';

export type Mode = 'ai' | 'two';

export interface Players {
  readonly mode: Mode;
  /** The human's mark against the AI. Not used in two-player mode. */
  readonly human: Mark;
}

const isAi = (mark: Mark, p: Players) => p.mode === 'ai' && mark !== p.human;

function name(mark: Mark, p: Players): string {
  if (p.mode === 'two') return mark;
  return mark === p.human ? 'You' : 'AI';
}

/** "Your turn." or "O to move." Empty when the AI is about to move. */
export function turnPrompt(state: GameState, p: Players): string {
  if (state.status !== 'playing') return '';
  if (p.mode === 'two') return `${state.turn} to move.`;
  return state.turn === p.human ? 'Your turn.' : '';
}

export function startMessage(state: GameState, p: Players): string {
  if (p.mode === 'two') return 'New game, two players. X moves first.';
  const you = `New game against the AI. You are ${p.human}.`;
  return state.turn === p.human ? `${you} Your turn.` : `${you} The AI moves first.`;
}

export interface MoveText {
  /** What the live region reads. After chaos it gives only a count of the other marks that moved. */
  readonly spoken: string;
  /** The Moves list entry. After chaos it also names each other mark that moved, and where to. */
  readonly logged: string;
}

/** Marks already on the board whose cell ended somewhere else after the turns, X first. */
function marksMoved(prev: GameState, turns: Parameters<typeof whereAfter>[1]) {
  return prev.cells
    .map((c, from) => ({ mark: c.mark, from, to: whereAfter(from, turns) }))
    .filter((m): m is { mark: Mark; from: number; to: number } => m.mark !== null && m.to !== m.from)
    .sort((a, b) => (a.mark === b.mark ? a.from - b.from : a.mark === 'X' ? -1 : 1));
}

/** What happened on the move that turned `prev` into `next`. Scott chose the split on 2026-11-24. */
export function describeMove(prev: GameState, next: GameState, p: Players): MoveText {
  const move = next.lastMove;
  if (!move || next === prev) return { spoken: '', logged: '' };
  const who = name(move.player, p);
  const parts = [
    p.mode === 'two'
      ? `${move.player} played ${cellName(move.index)}.`
      : `${who} played ${move.player} at ${cellName(move.index)}.`,
  ];
  let count = '';
  let list = '';

  if (move.chaos) {
    const { number, turns } = move.chaos;
    parts.push(`Chaos cell ${number}! ${number === 1 ? '1 turn' : `${number} turns`}:`);
    parts.push(...turns.map(t => `${describeTurn(t)}.`));
    const landed = whereAfter(move.index, turns);
    parts.push(landed === move.index ? 'That mark ended where it started.' : `That mark moved to ${cellName(landed)}.`);
    const moved = marksMoved(prev, turns);
    const n = moved.length;
    count = n === 0 ? 'No other marks moved.' : `${n} other ${n === 1 ? 'mark' : 'marks'} moved`;
    list = n === 0 ? count : `${count}: ${moved.map(m => `${m.mark} from ${cellName(m.from)} to ${cellName(m.to)}`).join(', ')}.`;
    if (n > 0) count += '.';
  }

  const result = resultMessage(next, p);
  const join = (extra: string) => [...parts, extra, result].filter(Boolean).join(' ');
  return { spoken: join(count), logged: join(list) };
}

export function resultMessage(state: GameState, p: Players): string {
  if (state.status === 'playing') return turnPrompt(state, p);
  if (state.status === 'draw') {
    return state.winningLines.length > 0
      ? 'Draw: chaos gave both players 5 in a row.'
      : 'Draw: the board is full.';
  }
  const winner = state.winner!;
  const line = state.winningLines.find(l => state.cells[l.cells[0]].mark === winner)!;
  const cells = line.cells.map(cellName).join(', ');
  const byChaos = state.lastMove?.chaos && state.lastMove.player !== winner ? 'Chaos finished the line. ' : '';
  const headline =
    p.mode === 'two' ? `${winner} wins` : isAi(winner, p) ? 'The AI wins' : 'You win';
  return `${byChaos}${headline} with ${cells}.`;
}

/** The visible status line, and what S speaks. */
export function statusLine(state: GameState, p: Players): string {
  const chaos = `Chaos cells fired: ${state.chaosTriggered} of 6.`;
  if (state.status !== 'playing') return `Game over. ${resultMessage(state, p)}`;
  if (p.mode === 'two') return `${state.turn} to move. ${chaos}`;
  const whose = state.turn === p.human ? `Your turn, you are ${p.human}.` : 'The AI is thinking.';
  return `${whose} ${chaos}`;
}

const REASONS: Record<HintReason, string> = {
  win: 'win now at',
  block: 'block their line at',
  build: 'build toward a line at',
};

export function hintMessage(reason: HintReason, cell: number): string {
  return `Hint: ${REASONS[reason]} ${cellName(cell)}.`;
}

export const BOARD_HELP =
  'Arrow keys move across the cube and over its edges. Enter or Space places your mark. ' +
  'Digits 1 to 9 jump within a face. T, D, F, B, L and R jump to Top, Bottom (down), Front, Back, ' +
  'Left and Right. S speaks the status and H gives a hint.';
