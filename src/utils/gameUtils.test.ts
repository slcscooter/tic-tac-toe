import { describe, it, expect } from 'vitest';
import {
  checkWinner,
  isGameDraw,
  getEmptyCells,
  createInitialGameState,
  makeMove,
  getGameStatus,
} from './gameUtils';
import type { Board } from '../types/game';

describe('Game Utils', () => {
  describe('checkWinner', () => {
    it('should detect horizontal wins', () => {
      const board: Board = [
        'X', 'X', 'X',
        null, 'O', null,
        'O', null, null
      ];
      expect(checkWinner(board)).toBe('X');
    });

    it('should detect vertical wins', () => {
      const board: Board = [
        'X', 'O', null,
        'X', 'O', null,
        'X', null, null
      ];
      expect(checkWinner(board)).toBe('X');
    });

    it('should detect diagonal wins', () => {
      const board: Board = [
        'X', 'O', null,
        'O', 'X', null,
        null, null, 'X'
      ];
      expect(checkWinner(board)).toBe('X');
    });

    it('should detect anti-diagonal wins', () => {
      const board: Board = [
        null, 'O', 'X',
        'O', 'X', null,
        'X', null, null
      ];
      expect(checkWinner(board)).toBe('X');
    });

    it('should return null when no winner', () => {
      const board: Board = [
        'X', 'O', 'X',
        'O', 'X', 'O',
        'O', 'X', null
      ];
      expect(checkWinner(board)).toBeNull();
    });
  });

  describe('isGameDraw', () => {
    it('should return true when board is full and no winner', () => {
      const board: Board = [
        'X', 'O', 'X',
        'O', 'X', 'O',
        'O', 'X', 'O'
      ];
      expect(isGameDraw(board)).toBe(true);
    });

    it('should return false when board has empty cells', () => {
      const board: Board = [
        'X', 'O', 'X',
        'O', 'X', 'O',
        'O', 'X', null
      ];
      expect(isGameDraw(board)).toBe(false);
    });

    it('should return false when there is a winner', () => {
      const board: Board = [
        'X', 'X', 'X',
        'O', 'O', null,
        null, null, null
      ];
      expect(isGameDraw(board)).toBe(false);
    });
  });

  describe('getEmptyCells', () => {
    it('should return indices of empty cells', () => {
      const board: Board = [
        'X', null, 'O',
        null, 'X', null,
        'O', null, null
      ];
      expect(getEmptyCells(board)).toEqual([1, 3, 5, 7, 8]);
    });

    it('should return empty array when board is full', () => {
      const board: Board = [
        'X', 'O', 'X',
        'O', 'X', 'O',
        'O', 'X', 'O'
      ];
      expect(getEmptyCells(board)).toEqual([]);
    });
  });

  describe('createInitialGameState', () => {
    it('should create initial state with human starting', () => {
      const state = createInitialGameState('human');
      expect(state.currentPlayer).toBe('X');
      expect(state.humanPlayer).toBe('X');
      expect(state.aiPlayer).toBe('O');
      expect(state.status).toBe('playing');
      expect(state.winner).toBeNull();
      expect(state.board.every(cell => cell === null)).toBe(true);
    });

    it('should create initial state with AI starting', () => {
      const state = createInitialGameState('ai');
      expect(state.currentPlayer).toBe('X');
      expect(state.humanPlayer).toBe('O');
      expect(state.aiPlayer).toBe('X');
      expect(state.status).toBe('playing');
    });

    it('should create initial state with random start', () => {
      const state = createInitialGameState('random');
      expect(['X', 'O']).toContain(state.humanPlayer);
      expect(['X', 'O']).toContain(state.aiPlayer);
      expect(state.humanPlayer).not.toBe(state.aiPlayer);
      expect(state.currentPlayer).toBe('X');
    });
  });

  describe('makeMove', () => {
    it('should update board and switch players', () => {
      const initialState = createInitialGameState('human');
      const newState = makeMove(initialState, 0);

      expect(newState.board[0]).toBe('X');
      expect(newState.currentPlayer).toBe('O');
      expect(newState.status).toBe('playing');
    });

    it('should not allow move on occupied cell', () => {
      const initialState = createInitialGameState('human');
      const stateAfterMove = makeMove(initialState, 0);
      const finalState = makeMove(stateAfterMove, 0);

      expect(finalState).toBe(stateAfterMove);
    });

    it('should detect win condition', () => {
      let state = createInitialGameState('human');
      state = makeMove(state, 0); // X
      state = makeMove(state, 3); // O
      state = makeMove(state, 1); // X
      state = makeMove(state, 4); // O
      state = makeMove(state, 2); // X wins

      expect(state.status).toBe('won');
      expect(state.winner).toBe('X');
    });

    it('should detect draw condition', () => {
      let state = createInitialGameState('human');
      // Create a draw scenario
      const moves = [0, 1, 2, 4, 3, 5, 7, 6, 8]; // X, O, X, O, X, O, X, O, X

      moves.forEach(move => {
        state = makeMove(state, move);
      });

      expect(state.status).toBe('draw');
      expect(state.winner).toBeNull();
    });
  });

  describe('getGameStatus', () => {
    it('should return won status when there is a winner', () => {
      const board: Board = [
        'X', 'X', 'X',
        'O', 'O', null,
        null, null, null
      ];
      const { status, winner } = getGameStatus(board);
      expect(status).toBe('won');
      expect(winner).toBe('X');
    });

    it('should return draw status when board is full', () => {
      const board: Board = [
        'X', 'O', 'X',
        'O', 'X', 'O',
        'O', 'X', 'O'
      ];
      const { status, winner } = getGameStatus(board);
      expect(status).toBe('draw');
      expect(winner).toBeNull();
    });

    it('should return playing status when game continues', () => {
      const board: Board = [
        'X', 'O', null,
        'O', 'X', null,
        null, null, null
      ];
      const { status, winner } = getGameStatus(board);
      expect(status).toBe('playing');
      expect(winner).toBeNull();
    });
  });
});
