import type { Board, Player } from '../types/game';
import { checkWinner, getEmptyCells } from './gameUtils';

export function minimax(board: Board, isMaximizing: boolean, aiPlayer: Player, depth: number = 0): number {
  const winner = checkWinner(board);

  // Terminal states
  if (winner === aiPlayer) {
    return 10 - depth; // Prefer quicker wins
  }
  if (winner && winner !== aiPlayer) {
    return depth - 10; // Prefer delaying losses
  }
  if (getEmptyCells(board).length === 0) {
    return 0; // Draw
  }

  const emptyCells = getEmptyCells(board);

  if (isMaximizing) {
    let maxScore = -Infinity;

    for (const cellIndex of emptyCells) {
      const newBoard = [...board] as Board;
      newBoard[cellIndex] = aiPlayer;

      const score = minimax(newBoard, false, aiPlayer, depth + 1);
      maxScore = Math.max(score, maxScore);
    }

    return maxScore;
  } else {
    let minScore = Infinity;
    const humanPlayer: Player = aiPlayer === 'X' ? 'O' : 'X';

    for (const cellIndex of emptyCells) {
      const newBoard = [...board] as Board;
      newBoard[cellIndex] = humanPlayer;

      const score = minimax(newBoard, true, aiPlayer, depth + 1);
      minScore = Math.min(score, minScore);
    }

    return minScore;
  }
}

export function getBestMove(board: Board, aiPlayer: Player): number {
  const emptyCells = getEmptyCells(board);

  if (emptyCells.length === 0) {
    return -1; // No moves available
  }

  let bestMove = -1;
  let bestScore = -Infinity;

  for (const cellIndex of emptyCells) {
    const newBoard = [...board] as Board;
    newBoard[cellIndex] = aiPlayer;

    let score = minimax(newBoard, false, aiPlayer);

    // Add small bonus for strategic positions when scores are equal
    if (score === bestScore || score === 0) { // On empty board, all moves score 0
      // Bonus for center position
      if (cellIndex === 4) {
        score += 0.1;
      }
      // Bonus for corners
      else if ([0, 2, 6, 8].includes(cellIndex)) {
        score += 0.05;
      }
      // Edges get no bonus
    }

    if (score > bestScore) {
      bestScore = score;
      bestMove = cellIndex;
    }
  }

  return bestMove;
}