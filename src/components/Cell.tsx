import type { CellValue } from '../types/game';

interface CellProps {
  value: CellValue;
  onClick: () => void;
  disabled?: boolean;
}

export function Cell({ value, onClick, disabled = false }: CellProps) {
  return (
    <button
      className={`cell ${value ? 'filled' : 'empty'}`}
      onClick={onClick}
      disabled={disabled || value !== null}
      aria-label={value ? `Cell with ${value}` : 'Empty cell'}
    >
      {value || ''}
    </button>
  );
}