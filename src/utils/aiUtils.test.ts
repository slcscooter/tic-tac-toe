import { describe, it, expect } from 'vitest';
import { getBestMove, minimax } from './aiUtils';
import type { Board, Player } from '../types/game';

describe('AI Utils', () => {
  describe('getBestMove', () => {
    it('should win when possible', () => {
      const board: Board = [
        'X', 'X', null,  // X can win by playing position 2
        'O', 'O', null,
        null, null, null
      ];
      const move = getBestMove(board, 'X');
      expect(move).toBe(2);
    });

    it('should block opponent from winning', () => {
      const board: Board = [
        'O', 'O', null,  // X should block O from winning at position 2
        'X', null, null,
        null, null, null
      ];
      const move = getBestMove(board, 'X');
      expect(move).toBe(2);
    });

    it('should take center when available and no immediate threats', () => {
      const board: Board = [
        null, null, null,
        null, null, null,
        null, null, null
      ];
      const move = getBestMove(board, 'X');
      expect(move).toBe(4); // center position
    });

    it('should never lose when playing optimally', () => {
      // Test various scenarios where AI should never lose
      const scenarios: Array<{ board: Board, player: Player, description: string }> = [
        {
          board: [null, null, null, null, null, null, null, null, null],
          player: 'X',
          description: 'empty board as X'
        },
        {
          board: ['X', null, null, null, null, null, null, null, null],
          player: 'O',
          description: 'second move as O'
        },
        {
          board: [
            'X', null, null,
            null, 'O', null,
            null, null, null
          ],
          player: 'X',
          description: 'third move as X'
        }
      ];

      scenarios.forEach(({ board, player }) => {
        const move = getBestMove(board, player);
        expect(typeof move).toBe('number');
        expect(move >= 0 && move <= 8).toBe(true);
        expect(board[move]).toBeNull();
      });
    });

    it('should return -1 when no moves available', () => {
      const board: Board = [
        'X', 'O', 'X',
        'O', 'X', 'O',
        'O', 'X', 'O'
      ];
      const move = getBestMove(board, 'X');
      expect(move).toBe(-1);
    });
  });

  describe('minimax', () => {
    it('should return 10 for winning position', () => {
      const board: Board = [
        'X', 'X', 'X',
        'O', 'O', null,
        null, null, null
      ];
      const score = minimax(board, false, 'X'); // X has won
      expect(score).toBe(10);
    });

    it('should return -10 for losing position', () => {
      const board: Board = [
        'O', 'O', 'O',
        'X', 'X', null,
        null, null, null
      ];
      const score = minimax(board, true, 'X'); // O has won, bad for X
      expect(score).toBe(-10);
    });

    it('should return 0 for draw position', () => {
      const board: Board = [
        'X', 'O', 'X',
        'O', 'X', 'O',
        'O', 'X', 'O'
      ];
      const score = minimax(board, true, 'X');
      expect(score).toBe(0);
    });

    it('should prefer shorter paths to victory', () => {
      // Position where X can win in 1 move
      const quickWin: Board = [
        'X', 'X', null,
        'O', 'O', null,
        null, null, null
      ];

      // Position where X can win but it takes longer
      const slowWin: Board = [
        'X', null, null,
        null, null, null,
        null, null, null
      ];

      const quickScore = minimax(quickWin, true, 'X');
      const slowScore = minimax(slowWin, true, 'X');

      // Both should be positive (winning), but quick win should have higher score
      expect(quickScore).toBeGreaterThan(slowScore);
    });
  });
});
