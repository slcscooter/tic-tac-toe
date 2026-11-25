import { Board } from './Board';
import type { BoardCommand } from './Board';
import { statusLine } from './announce';
import { humanToMove, players } from './useChaosGame';
import type { Session } from './useChaosGame';

interface GameScreenProps {
  readonly session: Session;
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
  const { session, hintText, active, focusKey, onActiveChange, onPlay, onCommand } = props;
  const { game } = session;
  const over = game.status !== 'playing';
  const winning = new Set(game.winningLines.flatMap(l => l.cells));
  const canPlay = humanToMove(session);

  return (
    <section className="game" aria-labelledby="game-heading">
      <h1 id="game-heading">Chaos Cube</h1>
      <p className="status">{statusLine(game, players(session))}</p>

      <Board
        marks={game.cells.map(c => c.mark)}
        winning={winning}
        canPlay={canPlay}
        active={active}
        focusKey={focusKey}
        onActiveChange={onActiveChange}
        onPlay={onPlay}
        onCommand={onCommand}
      />

      {hintText && <p className="hint">{hintText}</p>}

      <div className="actions">
        {over ? (
          <button type="button" onClick={props.onPlayAgain}>
            Play again
          </button>
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

      <section className="moves" aria-labelledby="moves-heading">
        <h2 id="moves-heading">Moves</h2>
        <ol>
          {session.log.map((entry, i) => (
            <li key={i}>{entry}</li>
          ))}
        </ol>
      </section>
    </section>
  );
}
