import type { Board as BoardType } from '../types/game';
import { Cell } from './Cell';

interface BoardProps {
  board: BoardType;
  onCellClick: (index: number) => void;
  disabled?: boolean;
}

export function Board({ board, onCellClick, disabled = false }: BoardProps) {
  return (
    <div className="board">
      {board.map((cell, index) => (
        <Cell
          key={index}
          value={cell}
          onClick={() => onCellClick(index)}
          disabled={disabled}
        />
      ))}
    </div>
  );
}