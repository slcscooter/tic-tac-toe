import { describe, expect, it } from 'vitest';
import { newGame, placeMark } from '../engine/game';
import { DEFAULT_SETTINGS, loadGame, loadSettings, saveGame, saveSettings } from './storage';
import type { SavedGame } from './storage';
import { memoryStorage } from './testStorage';

const saved = (game = placeMark(newGame(9), 0)): SavedGame => ({
  version: 1,
  game,
  mode: 'ai',
  level: 'hard',
  human: 'X',
  log: ['New game.', 'You played X at Top 1.'],
});

describe('settings', () => {
  it('round-trips', () => {
    const s = memoryStorage();
    saveSettings(s, { mode: 'two', level: 'easy', start: 'random', accessible: true });
    expect(loadSettings(s)).toEqual({ mode: 'two', level: 'easy', start: 'random', accessible: true });
  });

  it('keeps accessible mode off by default, and for settings saved before it existed', () => {
    const s = memoryStorage();
    expect(loadSettings(s).accessible).toBe(false);
    s.setItem('chaos-cube:settings', JSON.stringify({ mode: 'two', level: 'easy', start: 'random' }));
    expect(loadSettings(s)).toEqual({ mode: 'two', level: 'easy', start: 'random', accessible: false });
  });

  it('falls back to the defaults on missing, broken or unknown values', () => {
    const s = memoryStorage();
    expect(loadSettings(s)).toEqual(DEFAULT_SETTINGS);
    s.setItem('chaos-cube:settings', '{not json');
    expect(loadSettings(s)).toEqual(DEFAULT_SETTINGS);
    s.setItem('chaos-cube:settings', JSON.stringify({ mode: 'ai', level: 'ultra', start: 'you' }));
    expect(loadSettings(s)).toEqual(DEFAULT_SETTINGS);
  });
});

describe('saved game', () => {
  it('round-trips a game in progress', () => {
    const s = memoryStorage();
    saveGame(s, saved());
    expect(loadGame(s)).toEqual(saved());
  });

  it('clears the save when the game is over', () => {
    const s = memoryStorage();
    saveGame(s, saved());
    saveGame(s, saved({ ...newGame(9), status: 'won', winner: 'X' }));
    expect(loadGame(s)).toBeNull();
    expect(s.getItem('chaos-cube:game')).toBeNull();
  });

  it('ignores a save that does not check out', () => {
    const s = memoryStorage();
    const bad = (v: unknown) => {
      s.setItem('chaos-cube:game', JSON.stringify(v));
      return loadGame(s);
    };
    expect(bad({ ...saved(), version: 2 })).toBeNull();
    expect(bad({ ...saved(), game: { ...saved().game, cells: [] } })).toBeNull();
    expect(bad({ ...saved(), game: { ...saved().game, chaosTriggered: 7 } })).toBeNull();
    expect(bad({ ...saved(), human: 'Z' })).toBeNull();
    s.setItem('chaos-cube:game', '{oops');
    expect(loadGame(s)).toBeNull();
  });
});

describe('storage that is missing or refuses', () => {
  it('reads as empty and never throws', () => {
    const throwing = {
      getItem() {
        throw new Error('blocked');
      },
      setItem() {
        throw new Error('full');
      },
      removeItem() {
        throw new Error('blocked');
      },
    } as unknown as Storage;
    for (const s of [null, throwing]) {
      expect(loadSettings(s)).toEqual(DEFAULT_SETTINGS);
      expect(loadGame(s)).toBeNull();
      expect(() => saveSettings(s, DEFAULT_SETTINGS)).not.toThrow();
      expect(() => saveGame(s, saved())).not.toThrow();
    }
  });
});
