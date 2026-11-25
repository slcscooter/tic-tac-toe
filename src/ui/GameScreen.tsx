import { lazy, Suspense, useState } from 'react';
import { whereAfter } from '../engine/cube';
import { Board } from './Board';
import type { BoardCommand } from './Board';
import { hasWebGL } from './webgl';
import { statusLine } from './announce';
import { humanToMove, players } from './useChaosGame';
import type { Session } from './useChaosGame';

// three.js is most of the app's size, so it loads when a game first shows, not with the menu.
const CubeView = lazy(() => import('./CubeView').then(m => ({ default: m.CubeView })));

interface GameScreenProps {
  readonly session: Session;
  /** Screen reader and keyboard mode, a menu setting that is off by default. */
  readonly accessible: boolean;
  readonly hintText: string;
  readonly active: number;
  readonly focusKey: number;
  readonly onActiveChange: (index: number) => void;
  readonly onPlay: (index: number) => void;
  readonly onCommand: (command: BoardCommand) => void;
  readonly onPlayAgain: () => void;
  readonly onMenu: () => void;
  readonly onHelp: () => void;
}

export function GameScreen(props: GameScreenProps) {
  const { session, accessible, hintText, active, focusKey, onActiveChange, onPlay, onCommand } = props;
  const { game } = session;
  const [webgl, setWebgl] = useState(hasWebGL);
  // The game the player folded back. A new win, or a new game, unfolds again.
  const [foldedFor, setFoldedFor] = useState<object | null>(null);
  const over = game.status !== 'playing';
  const winning = new Set(game.winningLines.flatMap(l => l.cells));
  const canPlay = humanToMove(session);
  const marks = game.cells.map(c => c.mark);
  const move = game.lastMove;
  const landed = move ? whereAfter(move.index, move.chaos?.turns ?? []) : null;
  const winLine =
    game.status === 'won' ? (game.winningLines.find(l => game.cells[l.cells[0]].mark === game.winner)?.cells ?? null) : null;
  const unfolded = foldedFor !== game;

  // A click on the cube places a mark. In accessible mode, keyboard focus follows it.
  const pick = (index: number) => {
    onActiveChange(index);
    onPlay(index);
    if (accessible) document.getElementById(`cell-${index}`)?.focus({ preventScroll: true });
  };

  return (
    <section className="game" aria-labelledby="game-heading">
      <h1 id="game-heading">Chaos Cube</h1>
      <p className="status">{statusLine(game, players(session))}</p>

      {webgl && (
        <Suspense fallback={<div className="cube-view" />}>
          <CubeView
            board={{ marks, winning, highlight: accessible || hintText ? active : null, lastMove: landed, canPick: canPlay }}
            move={move}
            winLine={winLine}
            unfolded={unfolded}
            decorative={accessible}
            onPick={pick}
            onUnavailable={() => setWebgl(false)}
          />
        </Suspense>
      )}

      {(accessible || !webgl) && (
        <Board
          hidden={webgl}
          marks={marks}
          winning={winning}
          canPlay={canPlay}
          active={active}
          focusKey={focusKey}
          onActiveChange={onActiveChange}
          onPlay={onPlay}
          onCommand={onCommand}
        />
      )}

      {hintText && <p className="hint">{hintText}</p>}

      <div className="actions">
        {over ? (
          <>
            <button type="button" onClick={props.onPlayAgain}>
              Play again
            </button>
            {webgl && winLine && (
              <button type="button" onClick={() => setFoldedFor(unfolded ? game : null)}>
                {unfolded ? 'Fold back' : 'Unfold'}
              </button>
            )}
          </>
        ) : (
          <button type="button" aria-disabled={!canPlay} onClick={() => canPlay && onCommand('hint')}>
            Hint
          </button>
        )}
        <button type="button" onClick={props.onMenu}>
          Menu
        </button>
        <button type="button" onClick={props.onHelp}>
          How to play
        </button>
      </div>

      {accessible && (
        <section className="moves" aria-labelledby="moves-heading">
          <h2 id="moves-heading">Moves</h2>
          <ol>
            {session.log.map((entry, i) => (
              <li key={i}>{entry}</li>
            ))}
          </ol>
        </section>
      )}
    </section>
  );
}
