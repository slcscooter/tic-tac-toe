import type { Board, Player, GameState, GameStatus, StartOption } from '../types/game';
import { WINNING_COMBINATIONS } from '../types/game';

export function checkWinner(board: Board): Player | null {
  for (const [a, b, c] of WINNING_COMBINATIONS) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a] as Player;
    }
  }
  return null;
}

export function isGameDraw(board: Board): boolean {
  return board.every(cell => cell !== null) && checkWinner(board) === null;
}

export function getEmptyCells(board: Board): number[] {
  return board.reduce<number[]>((empty, cell, index) => {
    if (cell === null) {
      empty.push(index);
    }
    return empty;
  }, []);
}

export function getGameStatus(board: Board): { status: GameStatus; winner: Player | null } {
  const winner = checkWinner(board);

  if (winner) {
    return { status: 'won', winner };
  }

  if (isGameDraw(board)) {
    return { status: 'draw', winner: null };
  }

  return { status: 'playing', winner: null };
}

export function createInitialGameState(startOption: StartOption): GameState {
  let humanPlayer: Player;
  let aiPlayer: Player;

  switch (startOption) {
    case 'human':
      humanPlayer = 'X';
      aiPlayer = 'O';
      break;
    case 'ai':
      humanPlayer = 'O';
      aiPlayer = 'X';
      break;
    case 'random': {
      const players: Player[] = Math.random() < 0.5 ? ['X', 'O'] : ['O', 'X'];
      humanPlayer = players[0];
      aiPlayer = players[1];
      break;
    }
  }

  return {
    board: [null, null, null, null, null, null, null, null, null],
    currentPlayer: 'X', // X always starts first
    status: 'playing',
    winner: null,
    humanPlayer,
    aiPlayer,
  };
}

export function makeMove(gameState: GameState, index: number): GameState {
  // Can't make move if game is over or cell is occupied
  if (gameState.status !== 'playing' || gameState.board[index] !== null) {
    return gameState;
  }

  // Create new board with the move
  const newBoard = [...gameState.board] as Board;
  newBoard[index] = gameState.currentPlayer;

  // Check game status
  const { status, winner } = getGameStatus(newBoard);

  // Switch to next player if game continues
  const nextPlayer: Player = gameState.currentPlayer === 'X' ? 'O' : 'X';

  return {
    ...gameState,
    board: newBoard,
    currentPlayer: status === 'playing' ? nextPlayer : gameState.currentPlayer,
    status,
    winner,
  };
}