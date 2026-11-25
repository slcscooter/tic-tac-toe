import { StrictMode } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import { describe, expect, it } from 'vitest';
import { seededRandom } from '../engine/ai';
import { cell, LINES } from '../engine/cube';
import { newGame, placeMark } from '../engine/game';
import type { GameState } from '../engine/game';
import App from './App';
import { describeMove } from './announce';
import { GameScreen } from './GameScreen';
import { saveGame } from './storage';
import { memoryStorage } from './testStorage';
import type { Session } from './useChaosGame';

const F5 = cell('front', 1, 1);
const F6 = cell('front', 1, 2);

/** A seed whose hidden chaos cells avoid the cells a test plays, so no chaos interferes. */
function seedWithoutChaosAt(cells: number[]): number {
  for (let s = 1; ; s++) if (cells.every(c => !newGame(s).cells[c].chaos)) return s;
}

function setup(storage: Storage = memoryStorage(), aiDelayMs = 0, seed = seedWithoutChaosAt([F5, F6])) {
  const user = userEvent.setup();
  const view = render(
    <StrictMode>
      <App storage={storage} newSeed={() => seed} random={seededRandom(1)} aiDelayMs={aiDelayMs} />
    </StrictMode>,
  );
  return { user, storage, ...view };
}

/** A cell button by its spoken name, such as "Front 5". */
const cellButton = (name: string) => screen.getByRole('button', { name: new RegExp(`^${name},`) });
const announcer = () => screen.getByTestId('announcer');
const movesList = () => within(screen.getByRole('region', { name: 'Moves' }));
const moves = () => movesList().queryAllByRole('listitem');
/** Waits for the AI's reply in the move list. The announcer says it too, so search only the list. */
const aiMoved = () => movesList().findByText(/^AI played O at .*Your turn\.$/);

// axe probes a canvas, which jsdom doesn't implement and complains about in the log. Report it
// as unavailable, as a browser without canvas support would.
HTMLCanvasElement.prototype.getContext = (() => null) as typeof HTMLCanvasElement.prototype.getContext;

async function noAxeViolations(container: HTMLElement) {
  // jsdom has no layout, so color contrast can't be measured here. The colors are checked by
  // hand against WCAG ratios instead.
  const results = await axe.run(container, { rules: { 'color-contrast': { enabled: false } } });
  expect(results.violations.map(v => `${v.id}: ${v.help} (${v.nodes.length})`)).toEqual([]);
}

describe('menu', () => {
  it('opens with its heading focused, so a screen reader starts there', () => {
    setup();
    expect(screen.getByRole('heading', { name: 'Chaos Cube' })).toHaveFocus();
    expect(screen.queryByRole('button', { name: 'Continue game' })).not.toBeInTheDocument();
  });

  it('hides AI choices in two-player mode', async () => {
    const { user } = setup();
    expect(screen.getByRole('group', { name: 'AI level' })).toBeInTheDocument();
    await user.click(screen.getByRole('radio', { name: 'Two players on this device' }));
    expect(screen.queryByRole('group', { name: 'AI level' })).not.toBeInTheDocument();
  });

  it('passes an automated accessibility check', async () => {
    const { container } = setup();
    await noAxeViolations(container);
  });
});

describe('playing against the AI', () => {
  it('starts with focus on Front 5 and says who you are', async () => {
    const { user } = setup();
    await user.click(screen.getByRole('button', { name: 'New game' }));
    expect(cellButton('Front 5')).toHaveFocus();
    expect(announcer()).toHaveTextContent('New game against the AI. You are X. Your turn.');
  });

  it('places your mark, then the AI answers and it is your turn again', async () => {
    const { user } = setup();
    await user.click(screen.getByRole('button', { name: 'New game' }));
    await user.keyboard('{Enter}');
    expect(screen.getByRole('button', { name: 'Front 5, X' })).toBeInTheDocument();
    expect(await aiMoved()).toBeInTheDocument();
    expect(announcer()).toHaveTextContent(/^AI played O at .*Your turn\.$/);
    expect(moves()).toHaveLength(3);
  });

  it('refuses a taken cell', async () => {
    const { user } = setup();
    await user.click(screen.getByRole('button', { name: 'New game' }));
    await user.keyboard('{Enter}');
    await aiMoved();
    await user.keyboard('{Enter}');
    expect(cellButton('Front 5')).toHaveAttribute('aria-disabled', 'true');
    expect(moves()).toHaveLength(3);
  });

  it('ignores your moves while the AI is thinking', async () => {
    const { user } = setup(memoryStorage(), 60_000);
    await user.click(screen.getByRole('button', { name: 'New game' }));
    await user.keyboard('{Enter}{ArrowRight}{Enter}');
    expect(cellButton('Front 6')).toHaveAccessibleName('Front 6, empty');
    expect(cellButton('Front 6')).toHaveAttribute('aria-disabled', 'true');
    expect(moves()).toHaveLength(2);
  });

  it('speaks the status on S', async () => {
    const { user } = setup();
    await user.click(screen.getByRole('button', { name: 'New game' }));
    await user.keyboard('s');
    expect(announcer()).toHaveTextContent('Your turn, you are X. Chaos cells fired: 0 of 6.');
  });

  it('gives a hint on H and moves focus to the suggested cell', async () => {
    const { user } = setup();
    await user.click(screen.getByRole('button', { name: 'New game' }));
    await user.keyboard('h');
    const said = announcer().textContent ?? '';
    const name = said.match(/^Hint: .* at (\w+ \d)\.$/)?.[1];
    expect(name).toBeDefined();
    expect(cellButton(name!)).toHaveFocus();
  });

  it('passes an automated accessibility check', async () => {
    const { user, container } = setup();
    await user.click(screen.getByRole('button', { name: 'New game' }));
    await user.keyboard('{Enter}');
    await aiMoved();
    await noAxeViolations(container);
  });
});

describe('moving around the board', () => {
  it('walks with the arrows over cube edges, and jumps with digits and face letters', async () => {
    const { user } = setup();
    await user.click(screen.getByRole('button', { name: 'New game' }));
    const path: [string, string][] = [
      ['{ArrowRight}', 'Front 6'],
      ['{ArrowRight}', 'Right 4'], // over the edge onto Right
      ['{ArrowUp}', 'Right 1'],
      ['{ArrowUp}', 'Top 9'], // Right's top edge touches Top's right column
      ['1', 'Top 1'],
      ['b', 'Back 1'],
      ['d', 'Bottom 1'],
      ['{ArrowLeft}', 'Left 9'], // Bottom's left edge touches Left's bottom row
      ['f', 'Front 9'],
      ['5', 'Front 5'],
    ];
    for (const [key, name] of path) {
      await user.keyboard(key);
      expect(cellButton(name), `after ${key}`).toHaveFocus();
    }
  });

  it('keeps exactly one cell in the Tab order', async () => {
    const { user } = setup();
    await user.click(screen.getByRole('button', { name: 'New game' }));
    await user.keyboard('{ArrowDown}');
    const board = screen.getByRole('group', { name: 'Cube board' });
    const tabbable = within(board).getAllByRole('button').filter(b => b.tabIndex === 0);
    expect(tabbable).toEqual([cellButton('Front 8')]);
  });
});

describe('two players', () => {
  it('takes turns with no AI', async () => {
    const { user } = setup();
    await user.click(screen.getByRole('radio', { name: 'Two players on this device' }));
    await user.click(screen.getByRole('button', { name: 'New game' }));
    await user.keyboard('{Enter}');
    expect(announcer()).toHaveTextContent('X played Front 5. O to move.');
    await user.keyboard('{ArrowRight}{Enter}');
    expect(announcer()).toHaveTextContent('O played Front 6. X to move.');
    expect(moves()).toHaveLength(3);
  });

  it('speaks a count of the marks chaos moved, and names them only in the move list', async () => {
    // X plays Front 5, O plays Front 4, then X plays Front 6, a chaos cell. Pick a seed whose chaos
    // turn moves at least one of the first two marks, so the count and the names differ.
    const F4 = cell('front', 1, 0);
    const TWO = { mode: 'two', human: 'X' } as const;
    let seed = 0;
    let expected = { spoken: '', logged: '' };
    for (let s = 1; expected.spoken === expected.logged; s++) {
      const g = newGame(s);
      if (!g.cells[F6].chaos || g.cells[F5].chaos || g.cells[F4].chaos) continue;
      const before = placeMark(placeMark(g, F5), F4);
      expected = describeMove(before, placeMark(before, F6), TWO);
      seed = s;
    }
    expect(expected.logged).toMatch(/ other marks? moved: [XO] from /);

    const { user } = setup(memoryStorage(), 0, seed);
    await user.click(screen.getByRole('radio', { name: 'Two players on this device' }));
    await user.click(screen.getByRole('button', { name: 'New game' }));
    await user.keyboard('{Enter}{ArrowLeft}{Enter}{ArrowRight}{ArrowRight}{Enter}');
    expect(announcer()).toHaveTextContent(expected.spoken, { normalizeWhitespace: false });
    expect(announcer().textContent).toMatch(/ other marks? moved\. O to move\.$/);
    expect(moves().at(-1)).toHaveTextContent(expected.logged, { normalizeWhitespace: false });
  });
});

describe('saving', () => {
  it('continues an unfinished game on the next visit', async () => {
    const storage = memoryStorage();
    const first = setup(storage);
    await first.user.click(screen.getByRole('button', { name: 'New game' }));
    await first.user.keyboard('{Enter}');
    await aiMoved();
    first.unmount();

    const { user } = setup(storage);
    await user.click(screen.getByRole('button', { name: 'Continue game' }));
    expect(screen.getByRole('button', { name: 'Front 5, X' })).toBeInTheDocument();
    expect(announcer()).toHaveTextContent('Game continued.');
    expect(moves()).toHaveLength(4);
  });
});

describe('the end of a game', () => {
  it('announces the win, marks the line, and offers Play again', async () => {
    const line = LINES.find(l => l.cells.includes(cell('front', 1, 0)) && l.cells.includes(cell('right', 1, 1)))!;
    const last = cell('front', 1, 0); // Front 4
    const start = newGame(1);
    const game: GameState = {
      ...start,
      cells: start.cells.map((_, i) => ({ mark: line.cells.includes(i) && i !== last ? 'X' : null, chaos: false })),
    };
    const storage = memoryStorage();
    saveGame(storage, { version: 1, game, mode: 'ai', level: 'easy', human: 'X', log: ['New game.'] });

    const { user } = setup(storage);
    await user.click(screen.getByRole('button', { name: 'Continue game' }));
    await user.keyboard('4{Enter}');
    expect(announcer()).toHaveTextContent(/You win with /);
    expect(screen.getAllByRole('button', { name: /winning line$/ })).toHaveLength(5);
    expect(screen.getByRole('button', { name: 'Play again' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Hint' })).not.toBeInTheDocument();
    expect(storage.getItem('chaos-cube:game')).toBeNull();
  });
});

describe('hidden chaos cells', () => {
  it('never show on the page: two games that differ only in chaos look identical', () => {
    const marks = [0, 13, 22, 40];
    const session = (seed: number): Session => {
      const g = newGame(seed);
      return {
        game: { ...g, cells: g.cells.map((c, i) => ({ ...c, mark: marks.includes(i) ? (i % 2 ? 'O' : 'X') : null })) },
        mode: 'ai',
        level: 'hard',
        human: 'X',
        log: ['New game.'],
        spoken: 'New game.',
      };
    };
    const a = session(1);
    const b = session(2);
    expect(a.game.cells.map(c => c.chaos)).not.toEqual(b.game.cells.map(c => c.chaos));

    const props = {
      hintText: '',
      active: F5,
      focusKey: 0,
      onActiveChange: () => {},
      onPlay: () => {},
      onCommand: () => {},
      onPlayAgain: () => {},
      onMenu: () => {},
      onHelp: () => {},
    };
    const first = render(<GameScreen session={a} {...props} />).container.innerHTML;
    const second = render(<GameScreen session={b} {...props} />).container.innerHTML;
    expect(first).toBe(second);
  });
});

describe('how to play', () => {
  it('opens with its heading focused and passes an automated accessibility check', async () => {
    const { user, container } = setup();
    await user.click(screen.getByRole('button', { name: 'How to play' }));
    expect(screen.getByRole('heading', { name: 'How to play', level: 1 })).toHaveFocus();
    await noAxeViolations(container);
    await user.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByRole('heading', { name: 'Chaos Cube' })).toHaveFocus();
  });
});
