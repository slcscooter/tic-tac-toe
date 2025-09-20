export type Player = 'X' | 'O';
export type CellValue = Player | null;
export type Board = [
  CellValue, CellValue, CellValue,
  CellValue, CellValue, CellValue,
  CellValue, CellValue, CellValue
];

export type GameStatus = 'playing' | 'won' | 'draw';
export type StartOption = 'human' | 'ai' | 'random';

export interface GameState {
  board: Board;
  currentPlayer: Player;
  status: GameStatus;
  winner: Player | null;
  humanPlayer: Player;
  aiPlayer: Player;
}

export interface Move {
  index: number;
  player: Player;
}

export const WINNING_COMBINATIONS = [
  [0, 1, 2], // top row
  [3, 4, 5], // middle row
  [6, 7, 8], // bottom row
  [0, 3, 6], // left column
  [1, 4, 7], // middle column
  [2, 5, 8], // right column
  [0, 4, 8], // diagonal
  [2, 4, 6], // anti-diagonal
] as const;