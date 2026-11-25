// The cube, unfolded as a cross: Top above Front; Left, Front, Right and Back in a row; Bottom
// below Front. Each face is a labeled group of 9 cell buttons. Only the active cell is in the Tab
// order. Arrow keys move as the face sits on the cross and step over cube edges onto the face that
// touches it. This component is only ever given marks, never chaos cells.

import { useEffect, useRef } from 'react';
import type { KeyboardEvent } from 'react';
import { cellIndex, cellName, cellPosition, FACES, faceIndex, neighbor } from '../engine/cube';
import type { FaceName } from '../engine/cube';
import type { Mark } from '../engine/game';
import { BOARD_HELP } from './announce';

export type BoardCommand = 'status' | 'hint';

interface BoardProps {
  readonly marks: readonly (Mark | null)[];
  readonly winning: ReadonlySet<number>;
  readonly canPlay: boolean;
  readonly active: number;
  /** Raise this to move keyboard focus to the active cell. Zero leaves focus alone. */
  readonly focusKey: number;
  readonly onActiveChange: (index: number) => void;
  readonly onPlay: (index: number) => void;
  readonly onCommand: (command: BoardCommand) => void;
}

const ARROWS: Record<string, [number, number]> = {
  ArrowUp: [-1, 0],
  ArrowDown: [1, 0],
  ArrowLeft: [0, -1],
  ArrowRight: [0, 1],
};

const FACE_KEYS: Record<string, FaceName> = { t: 'top', d: 'bottom', f: 'front', b: 'back', l: 'left', r: 'right' };

export function Board({ marks, winning, canPlay, active, focusKey, onActiveChange, onPlay, onCommand }: BoardProps) {
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    if (focusKey > 0) buttons.current[active]?.focus();
  }, [active, focusKey]);

  function target(e: KeyboardEvent): number | null {
    const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    const here = cellPosition(active);
    if (key in ARROWS) return neighbor(active, ...ARROWS[key]);
    if (/^[1-9]$/.test(key)) {
      const n = Number(key) - 1;
      return cellIndex(here.face, Math.floor(n / 3), n % 3);
    }
    if (key in FACE_KEYS) return cellIndex(faceIndex(FACE_KEYS[key]), here.row, here.col);
    return null;
  }

  function onKeyDown(e: KeyboardEvent) {
    // Leave modified keys alone: they belong to the browser and the screen reader.
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    const key = e.key.toLowerCase();
    if (key === 's' || key === 'h') {
      e.preventDefault();
      onCommand(key === 's' ? 'status' : 'hint');
      return;
    }
    const next = target(e);
    if (next === null) return;
    e.preventDefault();
    onActiveChange(next);
    buttons.current[next]?.focus();
  }

  return (
    <div className="board" role="group" aria-label="Cube board" aria-describedby="board-help" onKeyDown={onKeyDown}>
      <p id="board-help" className="visually-hidden">
        {BOARD_HELP}
      </p>
      {FACES.map((face, f) => (
        <div key={face.name} className={`face face-${face.name}`} role="group" aria-label={`${face.label} face`}>
          <span className="face-label" aria-hidden="true">
            {face.label}
          </span>
          <div className="face-cells">
            {Array.from({ length: 9 }, (_, k) => {
              const i = f * 9 + k;
              const mark = marks[i];
              const won = winning.has(i);
              const open = canPlay && mark === null;
              return (
                <button
                  key={i}
                  ref={el => {
                    buttons.current[i] = el;
                  }}
                  type="button"
                  className={`cell${mark ? ` mark-${mark}` : ''}${won ? ' winning' : ''}`}
                  tabIndex={i === active ? 0 : -1}
                  aria-label={`${cellName(i)}, ${mark ?? 'empty'}${won ? ', winning line' : ''}`}
                  aria-disabled={!open}
                  onFocus={() => i !== active && onActiveChange(i)}
                  onClick={() => open && onPlay(i)}
                >
                  {mark ?? ''}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
