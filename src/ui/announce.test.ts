import { describe, expect, it } from 'vitest';
import { cell, CELL_COUNT, cellName, LINES } from '../engine/cube';
import type { Turn } from '../engine/cube';
import { newGame, placeMark } from '../engine/game';
import type { Cell, GameState, Mark } from '../engine/game';
import { describeMove, hintMessage, resultMessage, startMessage, statusLine } from './announce';
import type { Players } from './announce';

const FRONT_CW: Turn = { axis: 2, layer: 1, quarter: -1 };
const YOU_X: Players = { mode: 'ai', human: 'X' };
const YOU_O: Players = { mode: 'ai', human: 'O' };
const TWO: Players = { mode: 'two', human: 'X' };

/** A game with the marks and chaos cells given, and no other chaos. */
function game(opts: { X?: number[]; O?: number[]; chaos?: number[]; turn?: Mark } = {}): GameState {
  const cells: Cell[] = newGame(1).cells.map((_, i) => ({
    mark: opts.X?.includes(i) ? 'X' : opts.O?.includes(i) ? 'O' : null,
    chaos: opts.chaos?.includes(i) ?? false,
  }));
  return { ...newGame(1), cells, turn: opts.turn ?? 'X' };
}

const FRONT_ROW = LINES.find(l => [cell('front', 1, 0), cell('front', 1, 1), cell('right', 1, 1)].every(c => l.cells.includes(c)))!;

describe('describeMove', () => {
  it('says what you played, then hands over to the AI quietly', () => {
    const prev = game();
    expect(describeMove(prev, placeMark(prev, cell('front', 2, 0)), YOU_X)).toEqual({ spoken: 'You played X at Front 7.', logged: 'You played X at Front 7.' });
  });

  it('says what the AI played, then that it is your turn', () => {
    const prev = game();
    expect(describeMove(prev, placeMark(prev, cell('left', 0, 2)), YOU_O)).toEqual({ spoken: 'AI played X at Left 3. Your turn.', logged: 'AI played X at Left 3. Your turn.' });
  });

  it('names the mark and whose move is next for two players', () => {
    const prev = game();
    expect(describeMove(prev, placeMark(prev, cell('top', 1, 1)), TWO)).toEqual({ spoken: 'X played Top 5. O to move.', logged: 'X played Top 5. O to move.' });
  });

  it('reads out each chaos turn and where the mark ended up', () => {
    const prev = game({ chaos: [cell('front', 0, 0)] });
    const next = placeMark(prev, cell('front', 0, 0), seed => ({ turn: FRONT_CW, seed }));
    const said = 'You played X at Front 1. Chaos cell 1! 1 turn: Front face, turned clockwise. That mark moved to Front 3. No other marks moved.';
    expect(describeMove(prev, next, YOU_X)).toEqual({ spoken: said, logged: said });
  });

  it('counts the other marks chaos moved, and names them only in the move list', () => {
    const prev = game({
      X: [cell('front', 2, 0), cell('front', 1, 1)], // Front 7 moves; the center Front 5 stays put
      O: [cell('top', 2, 1), cell('back', 1, 1)], // Top 8 moves; Back 5 is off the turned slice
      chaos: [cell('front', 0, 0)],
    });
    const next = placeMark(prev, cell('front', 0, 0), seed => ({ turn: FRONT_CW, seed }));
    const start = 'You played X at Front 1. Chaos cell 1! 1 turn: Front face, turned clockwise. That mark moved to Front 3.';
    expect(describeMove(prev, next, YOU_X)).toEqual({
      spoken: `${start} 2 other marks moved.`,
      logged: `${start} 2 other marks moved: X from Front 7 to Front 1, O from Top 8 to Right 4.`,
    });
  });

  it('announces a win with the cells of the line', () => {
    const [last, ...four] = FRONT_ROW.cells;
    const prev = game({ X: four });
    const names = 'Front 4, Front 5, Front 6, Right 4, Right 5';
    const said = describeMove(prev, placeMark(prev, last), YOU_X).spoken;
    expect(said).toMatch(/^You played X at .*\. You win with /);
    for (const n of names.split(', ')) expect(said).toContain(n);
  });

  it('names the whole run when a move makes 6 in a row, not just the first 5', () => {
    // Scott's win on 2026-11-24, across a cube edge, with Left 1 played last.
    const six = ['Left 9', 'Left 5', 'Left 1', 'Back 3', 'Back 5', 'Back 7'];
    const at = (name: string) => Array.from({ length: CELL_COUNT }, (_, i) => i).find(i => cellName(i) === name)!;
    const prev = game({ X: six.filter(n => n !== 'Left 1').map(at) });
    const said = describeMove(prev, placeMark(prev, at('Left 1')), YOU_X).spoken;
    expect([six, [...six].reverse()].map(r => `You win with ${r.join(', ')}.`)).toContain(said.slice(said.indexOf('You win')));
  });
});

describe('resultMessage', () => {
  const won = (winner: Mark, mover: Mark, chaos: boolean): GameState => ({
    ...game(winner === 'X' ? { X: FRONT_ROW.cells as number[] } : { O: FRONT_ROW.cells as number[] }),
    status: 'won',
    winner,
    winningLines: [FRONT_ROW],
    lastMove: { player: mover, index: 0, chaos: chaos ? { number: 1, turns: [FRONT_CW] } : null },
  });

  it('says when chaos finished the other player\'s line', () => {
    expect(resultMessage(won('O', 'X', true), YOU_X)).toMatch(/^Chaos finished the line\. The AI wins with /);
  });

  it('does not blame chaos when the mover won', () => {
    expect(resultMessage(won('X', 'X', false), YOU_X)).toMatch(/^You win with /);
    expect(resultMessage(won('O', 'O', false), TWO)).toMatch(/^O wins with /);
  });

  it('tells the two kinds of draw apart', () => {
    expect(resultMessage({ ...game(), status: 'draw', winningLines: [FRONT_ROW] }, YOU_X)).toBe(
      'Draw: chaos gave both players 5 in a row.',
    );
    expect(resultMessage({ ...game(), status: 'draw', winningLines: [] }, YOU_X)).toBe('Draw: the board is full.');
  });
});

describe('start, status and hints', () => {
  it('says who you are and who moves first', () => {
    expect(startMessage(game(), YOU_X)).toBe('New game against the AI. You are X. Your turn.');
    expect(startMessage(game(), YOU_O)).toBe('New game against the AI. You are O. The AI moves first.');
    expect(startMessage(game(), TWO)).toBe('New game, two players. X moves first.');
  });

  it('gives the turn and the public chaos count, never chaos positions', () => {
    const g = { ...game({ chaos: [0, 9] }), chaosTriggered: 2 };
    expect(statusLine(g, YOU_X)).toBe('Your turn, you are X. Chaos cells fired: 2 of 6.');
    expect(statusLine(g, YOU_O)).toBe('The AI is thinking. Chaos cells fired: 2 of 6.');
  });

  it('words each kind of hint', () => {
    expect(hintMessage('win', cell('back', 0, 0))).toBe('Hint: win now at Back 1.');
    expect(hintMessage('block', cell('bottom', 1, 1))).toBe('Hint: block their line at Bottom 5.');
    expect(hintMessage('build', cell('right', 2, 2))).toBe('Hint: build toward a line at Right 9.');
    expect(hintMessage('trap', cell('top', 1, 1))).toBe('Hint: set a trap with two ways to win at Top 5.');
    expect(hintMessage('stop-trap', cell('left', 0, 2))).toBe('Hint: stop their trap at Left 3.');
  });
});
