import { useState } from 'react';
import { hint, toAiView } from '../engine/ai';
import type { Random } from '../engine/ai';
import { cell } from '../engine/cube';
import type { BoardCommand } from './Board';
import { GameScreen } from './GameScreen';
import { HowToPlay } from './HowToPlay';
import { Menu } from './Menu';
import { hintMessage, statusLine } from './announce';
import { browserStorage, loadGame, loadSettings, saveSettings } from './storage';
import type { Settings } from './storage';
import { humanToMove, players, useChaosGame } from './useChaosGame';

export interface AppProps {
  /** Where settings and an unfinished game are kept. Defaults to the browser's localStorage. */
  readonly storage?: Storage | null;
  /** A seed for each new game's hidden chaos cells and turns. */
  readonly newSeed?: () => number;
  /** Randomness for the AI, hints and a random start. */
  readonly random?: Random;
  /** Pause before the AI moves, in milliseconds. */
  readonly aiDelayMs?: number;
}

type Screen = 'menu' | 'game' | 'help';

const FRONT_CENTER = cell('front', 1, 1);
const randomSeed = () => Math.floor(Math.random() * 2 ** 32);

export default function App({
  storage = browserStorage(),
  newSeed = randomSeed,
  random = Math.random,
  aiDelayMs = 700,
}: AppProps) {
  const [screen, setScreen] = useState<Screen>('menu');
  const [helpFrom, setHelpFrom] = useState<Screen>('menu');
  const [settings, setSettings] = useState(() => loadSettings(storage));
  const [active, setActive] = useState(FRONT_CENTER);
  const [focusKey, setFocusKey] = useState(0);
  const [hintText, setHintText] = useState('');
  // A status or hint message, remembered with the log length when it was asked for.
  const [notice, setNotice] = useState({ text: '', n: 0, atLog: -1 });

  const { session, start, resume, play } = useChaosGame({ storage, random, aiDelayMs });

  // The one live region reads the newest thing: a notice asked for since the last move, or else the
  // latest move-log entry. It is worked out during render, so it never lags the move list. Each
  // message gets its own key, so even a repeat is read again.
  const logLength = session?.log.length ?? 0;
  const announcement =
    notice.text && notice.atLog === logLength
      ? { key: `notice-${notice.n}`, text: notice.text }
      : { key: `log-${logLength}`, text: session?.log.at(-1) ?? '' };
  const announce = (text: string) => setNotice(prev => ({ text, n: prev.n + 1, atLog: logLength }));

  const toGame = () => {
    setScreen('game');
    setFocusKey(k => k + 1);
  };

  const changeSettings = (next: Settings) => {
    setSettings(next);
    saveSettings(storage, next);
  };

  const newGame = () => {
    start(settings, newSeed());
    setActive(FRONT_CENTER);
    setHintText('');
    toGame();
  };

  const inProgress = session !== null && session.game.status === 'playing';

  const continueGame = () => {
    if (!inProgress) {
      const saved = loadGame(storage);
      if (!saved) return;
      resume(saved);
      setActive(FRONT_CENTER);
    }
    setHintText('');
    toGame();
  };

  const showHelp = () => {
    setHelpFrom(screen);
    setScreen('help');
  };

  const onPlay = (index: number) => {
    setHintText('');
    play(index);
  };

  const onCommand = (command: BoardCommand) => {
    if (!session) return;
    if (command === 'status') {
      announce(statusLine(session.game, players(session)));
      return;
    }
    if (!humanToMove(session)) {
      announce('No hint now: it is not your turn.');
      return;
    }
    const h = hint(toAiView(session.game), random);
    if (!h) return;
    const text = hintMessage(h.reason, h.cell);
    setHintText(text);
    announce(text);
    setActive(h.cell);
    setFocusKey(k => k + 1);
  };

  return (
    <main className="app">
      {screen === 'menu' && (
        <Menu
          settings={settings}
          canContinue={inProgress || loadGame(storage) !== null}
          onChange={changeSettings}
          onNewGame={newGame}
          onContinue={continueGame}
          onHelp={showHelp}
        />
      )}
      {screen === 'help' && <HowToPlay onBack={() => (helpFrom === 'game' ? toGame() : setScreen(helpFrom))} />}
      {screen === 'game' && session && (
        <GameScreen
          session={session}
          hintText={hintText}
          active={active}
          focusKey={focusKey}
          onActiveChange={setActive}
          onPlay={onPlay}
          onCommand={onCommand}
          onPlayAgain={newGame}
          onMenu={() => setScreen('menu')}
          onHelp={showHelp}
        />
      )}
      <div className="visually-hidden" aria-live="polite" aria-atomic="true" data-testid="announcer">
        {announcement.text && <p key={announcement.key}>{announcement.text}</p>}
      </div>
    </main>
  );
}
