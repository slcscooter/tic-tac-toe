// Settings and an unfinished game, kept in the browser between visits. Every read is checked,
// and storage that is missing or throws is treated as empty.
//
// A saved game includes the hidden chaos cells, so someone could read them from browser storage.
// Scott accepted that on 2026-11-24 for a casual game.

import { CELL_COUNT } from '../engine/cube';
import type { Level } from '../engine/ai';
import type { GameState, Mark } from '../engine/game';
import type { Mode } from './announce';

export type Start = 'you' | 'ai' | 'random';

export interface Settings {
  readonly mode: Mode;
  readonly level: Level;
  readonly start: Start;
}

export const DEFAULT_SETTINGS: Settings = { mode: 'ai', level: 'medium', start: 'you' };

export interface SavedGame {
  readonly version: 1;
  readonly game: GameState;
  readonly mode: Mode;
  readonly level: Level;
  readonly human: Mark;
  readonly log: readonly string[];
}

const SETTINGS_KEY = 'chaos-cube:settings';
const GAME_KEY = 'chaos-cube:game';

/** The browser's localStorage, or null where it is blocked. */
export function browserStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function read(storage: Storage | null, key: string): unknown {
  try {
    const raw = storage?.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function write(storage: Storage | null, key: string, value: unknown): void {
  try {
    if (value === null) storage?.removeItem(key);
    else storage?.setItem(key, JSON.stringify(value));
  } catch {
    // Full or blocked storage: the game still works, it just isn't remembered.
  }
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
const isMark = (v: unknown): v is Mark => v === 'X' || v === 'O';
const isMode = (v: unknown): v is Mode => v === 'ai' || v === 'two';
const isLevel = (v: unknown): v is Level => v === 'easy' || v === 'medium' || v === 'hard';
const isStart = (v: unknown): v is Start => v === 'you' || v === 'ai' || v === 'random';

export function loadSettings(storage: Storage | null): Settings {
  const v = read(storage, SETTINGS_KEY);
  if (!isObject(v) || !isMode(v.mode) || !isLevel(v.level) || !isStart(v.start)) return DEFAULT_SETTINGS;
  return { mode: v.mode, level: v.level, start: v.start };
}

export function saveSettings(storage: Storage | null, settings: Settings): void {
  write(storage, SETTINGS_KEY, settings);
}

function isGameState(v: unknown): v is GameState {
  if (!isObject(v) || !Array.isArray(v.cells) || v.cells.length !== CELL_COUNT) return false;
  const cellsOk = v.cells.every(c => isObject(c) && (c.mark === null || isMark(c.mark)) && typeof c.chaos === 'boolean');
  return (
    cellsOk &&
    isMark(v.turn) &&
    v.status === 'playing' &&
    v.winner === null &&
    Array.isArray(v.winningLines) &&
    typeof v.chaosTriggered === 'number' &&
    Number.isInteger(v.chaosTriggered) &&
    v.chaosTriggered >= 0 &&
    v.chaosTriggered <= 6 &&
    typeof v.seed === 'number' &&
    (v.lastMove === null || isObject(v.lastMove))
  );
}

/** The unfinished game, or null when there is none or it doesn't check out. */
export function loadGame(storage: Storage | null): SavedGame | null {
  const v = read(storage, GAME_KEY);
  if (!isObject(v) || v.version !== 1) return null;
  if (!isGameState(v.game) || !isMode(v.mode) || !isLevel(v.level) || !isMark(v.human)) return null;
  if (!Array.isArray(v.log) || !v.log.every(e => typeof e === 'string')) return null;
  return v as unknown as SavedGame;
}

/** Keeps a game in progress. A finished game is cleared instead, so only unfinished games return. */
export function saveGame(storage: Storage | null, saved: SavedGame | null): void {
  write(storage, GAME_KEY, saved && saved.game.status === 'playing' ? saved : null);
}
