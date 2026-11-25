// The game screen with the 3D cube on. jsdom can't draw WebGL, so CubeScene is a stand-in that
// records what it is told. These prove the wiring only; the real drawing is checked in a browser.

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { seededRandom } from '../engine/ai';
import { cell, LINES } from '../engine/cube';
import { newGame, placeMark } from '../engine/game';
import App from './App';
import { DEFAULT_SETTINGS, saveGame, saveSettings } from './storage';
import { memoryStorage } from './testStorage';

const scene = vi.hoisted(() => ({
  pick: null as ((index: number) => void) | null,
  /** How many chaos turns each playMove call was given. */
  plays: [] as number[],
  boards: [] as { marks: readonly unknown[] }[],
  /** Each setWin call: the line (or null), unfolded, animate. */
  wins: [] as [readonly number[] | null, boolean, boolean][],
}));

vi.mock('./webgl', () => ({ hasWebGL: () => true }));
vi.mock('./cubeScene', () => ({
  CubeScene: class {
    constructor(_canvas: HTMLCanvasElement, onPick: (index: number) => void) {
      scene.pick = onPick;
    }
    playMove(board: { marks: readonly unknown[] }, turns: readonly unknown[]) {
      scene.plays.push(turns.length);
      scene.boards.push(board);
    }
    update(board: { marks: readonly unknown[] }) {
      scene.boards.push(board);
    }
    setWin(line: readonly number[] | null, unfolded: boolean, animate: boolean) {
      scene.wins.push([line, unfolded, animate]);
    }
    showFace() {}
    resize() {}
    dispose() {}
  },
}));

beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
});

beforeEach(() => {
  scene.pick = null;
  scene.plays = [];
  scene.boards = [];
  scene.wins = [];
});

const F5 = cell('front', 1, 1);

function setup(accessible: boolean, seed: number, mode: 'ai' | 'two' = 'ai') {
  const storage = memoryStorage();
  saveSettings(storage, { ...DEFAULT_SETTINGS, mode, accessible });
  render(<App storage={storage} newSeed={() => seed} random={seededRandom(1)} aiDelayMs={0} />);
  return userEvent.setup();
}

const seedWhere = (chaosAtF5: boolean) => {
  for (let s = 1; ; s++) if (newGame(s).cells[F5].chaos === chaosAtF5) return s;
};

describe('the 3D cube', () => {
  it('is the board by default: a click on it places a mark, with no cell buttons or announcer', async () => {
    const user = setup(false, seedWhere(false));
    await user.click(screen.getByRole('button', { name: 'New game' }));
    expect(await screen.findByRole('img', { name: /^The cube\./ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Front 5,/ })).not.toBeInTheDocument();
    expect(screen.queryByTestId('announcer')).not.toBeInTheDocument();

    scene.pick!(F5);
    // Yours, then the AI's reply.
    await waitFor(() => expect(scene.boards.at(-1)!.marks.filter(Boolean)).toHaveLength(2));
    expect(scene.boards.at(-1)!.marks[F5]).toBe('X');
    expect(screen.getByText('Your turn, you are X. Chaos cells fired: 0 of 6.')).toBeInTheDocument();
  });

  it('in accessible mode, hides the picture from screen readers and keeps the cells as hidden buttons', async () => {
    const user = setup(true, seedWhere(false));
    await user.click(screen.getByRole('button', { name: 'New game' }));
    await waitFor(() => expect(document.querySelector('.cube-view canvas')).toHaveAttribute('aria-hidden', 'true'));
    expect(screen.queryByRole('img', { name: /^The cube\./ })).not.toBeInTheDocument();
    const f5 = screen.getByRole('button', { name: 'Front 5, empty' });
    expect(f5.closest('.board')).toHaveClass('visually-hidden');
    expect(f5).toHaveFocus();
    expect(screen.getByTestId('announcer')).toHaveTextContent('New game against the AI. You are X. Your turn.');
  });

  it('replays the chaos turns of a new move, but not of the board it opened with', async () => {
    const user = setup(false, seedWhere(true), 'two');
    await user.click(screen.getByRole('button', { name: 'New game' }));
    await waitFor(() => expect(scene.pick).not.toBeNull());
    scene.pick!(F5); // a chaos cell: the first chaos makes 1 turn
    await screen.findByText('O to move. Chaos cells fired: 1 of 6.');
    expect(scene.plays).toEqual([0, 1]);
  });

  it('does not replay the last chaos when a saved game is continued', async () => {
    const game = placeMark(newGame(seedWhere(true)), F5); // X set off chaos cell 1
    expect(game.lastMove?.chaos?.turns).toHaveLength(1);
    const storage = memoryStorage();
    saveSettings(storage, { ...DEFAULT_SETTINGS, mode: 'two' });
    saveGame(storage, { version: 1, game, mode: 'two', level: 'medium', human: 'X', log: ['New game.'] });
    render(<App storage={storage} newSeed={() => 1} random={seededRandom(1)} aiDelayMs={0} />);
    await userEvent.setup().click(screen.getByRole('button', { name: 'Continue game' }));
    await waitFor(() => expect(scene.plays).toEqual([0]));
  });

  it('unfolds to show the winning line, folds back and unfolds again on request, and resets for a new game', async () => {
    // X holds 4 of a line and plays the 5th; no chaos cells anywhere near it.
    const line = LINES.find(l => l.kind === 'ring')!.cells;
    const seed = (() => {
      for (let s = 1; ; s++) if (line.every(c => !newGame(s).cells[c].chaos)) return s;
    })();
    const start = newGame(seed);
    const O = [cell('back', 1, 1), cell('bottom', 1, 1), cell('left', 0, 0), cell('back', 0, 0)].filter(c => !line.includes(c));
    const game = {
      ...start,
      cells: start.cells.map((c, i) => ({ ...c, mark: line.slice(0, 4).includes(i) ? ('X' as const) : O.includes(i) ? ('O' as const) : null })),
    };
    const storage = memoryStorage();
    saveSettings(storage, { ...DEFAULT_SETTINGS, mode: 'two' });
    saveGame(storage, { version: 1, game, mode: 'two', level: 'medium', human: 'X', log: ['New game.'] });
    render(<App storage={storage} newSeed={() => seed} random={seededRandom(1)} aiDelayMs={0} />);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Continue game' }));
    await waitFor(() => expect(scene.pick).not.toBeNull());
    expect(scene.wins).toEqual([[null, true, false]]);

    scene.pick!(line[4]);
    await screen.findByText(/^Game over\. X wins/);
    expect(scene.wins.at(-1)).toEqual([line, true, true]);

    await user.click(screen.getByRole('button', { name: 'Fold back' }));
    expect(scene.wins.at(-1)).toEqual([line, false, true]);
    await user.click(screen.getByRole('button', { name: 'Unfold' }));
    expect(scene.wins.at(-1)).toEqual([line, true, true]);

    // Back from How to play: the net shows at once, with no replay.
    await user.click(screen.getByRole('button', { name: 'How to play' }));
    await user.click(screen.getByRole('button', { name: 'Back' }));
    await waitFor(() => expect(scene.wins.at(-1)).toEqual([line, true, false]));

    await user.click(screen.getByRole('button', { name: 'Play again' }));
    await waitFor(() => expect(scene.wins.at(-1)).toEqual([null, true, true]));
    expect(screen.queryByRole('button', { name: /Fold back|Unfold/ })).not.toBeInTheDocument();
  });
});
