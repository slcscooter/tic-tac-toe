// The game controller: one session at a time, the AI's moves, and saving between visits.

import { useCallback, useEffect, useReducer } from 'react';
import { chooseMove, toAiView } from '../engine/ai';
import type { Level, Random } from '../engine/ai';
import { newGame, placeMark } from '../engine/game';
import type { GameState, Mark } from '../engine/game';
import { describeMove, startMessage } from './announce';
import type { Mode, Players } from './announce';
import { saveGame } from './storage';
import type { SavedGame, Settings } from './storage';

export interface Session {
  readonly game: GameState;
  readonly mode: Mode;
  readonly level: Level;
  readonly human: Mark;
  readonly log: readonly string[];
  /** What the live region reads for the latest log entry. It can be shorter than the entry. Not saved. */
  readonly spoken: string;
}

type Action = { type: 'start'; session: Session } | { type: 'move'; index: number };

function reducer(session: Session | null, action: Action): Session | null {
  if (action.type === 'start') return action.session;
  if (!session) return session;
  const next = placeMark(session.game, action.index);
  if (next === session.game) return session;
  const text = describeMove(session.game, next, session);
  return { ...session, game: next, log: [...session.log, text.logged], spoken: text.spoken };
}

export const players = (s: Session): Players => ({ mode: s.mode, human: s.human });

/** True when a person may place a mark now: their turn against the AI, or any turn for two players. */
export function humanToMove(s: Session | null): boolean {
  if (!s || s.game.status !== 'playing') return false;
  return s.mode === 'two' || s.game.turn === s.human;
}

export interface ChaosGameOptions {
  readonly storage: Storage | null;
  readonly random: Random;
  readonly aiDelayMs: number;
}

export function useChaosGame({ storage, random, aiDelayMs }: ChaosGameOptions) {
  const [session, dispatch] = useReducer(reducer, null);

  const start = useCallback(
    (settings: Settings, seed: number) => {
      const human: Mark =
        settings.start === 'you' ? 'X' : settings.start === 'ai' ? 'O' : random() < 0.5 ? 'X' : 'O';
      const game = newGame(seed);
      const base = { game, mode: settings.mode, level: settings.level, human: settings.mode === 'two' ? 'X' : human };
      const said = startMessage(game, base);
      dispatch({ type: 'start', session: { ...base, log: [said], spoken: said } });
    },
    [random],
  );

  const resume = useCallback((saved: SavedGame) => {
    const { game, mode, level, human, log } = saved;
    const said = 'Game continued.';
    dispatch({ type: 'start', session: { game, mode, level, human, log: [...log, said], spoken: said } });
  }, []);

  const play = useCallback(
    (index: number) => {
      if (humanToMove(session)) dispatch({ type: 'move', index });
    },
    [session],
  );

  // The AI moves after a short pause, so its move is announced separately from yours.
  useEffect(() => {
    if (!session || session.mode !== 'ai') return;
    const { game, human, level } = session;
    if (game.status !== 'playing' || game.turn === human) return;
    const timer = setTimeout(() => {
      const index = chooseMove(toAiView(game), level, random);
      if (index !== null) dispatch({ type: 'move', index });
    }, aiDelayMs);
    return () => clearTimeout(timer);
  }, [session, random, aiDelayMs]);

  useEffect(() => {
    if (!session) return;
    const { game, mode, level, human, log } = session;
    saveGame(storage, { version: 1, game, mode, level, human, log });
  }, [session, storage]);

  return { session, start, resume, play };
}
