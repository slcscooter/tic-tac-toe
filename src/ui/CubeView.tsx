// The 3D cube on screen. It wraps CubeScene: makes it, sizes it, hands it each board, and passes
// clicks back. A new move replays its chaos turns; anything else just repaints.

import { useEffect, useRef } from 'react';
import { cellPosition } from '../engine/cube';
import type { MoveEvent } from '../engine/game';
import { CubeScene } from './cubeScene';
import type { CubeBoard } from './cubeScene';

interface CubeViewProps {
  readonly board: CubeBoard;
  /** The latest move. A new one plays its chaos turns and swings the camera to where it landed. */
  readonly move: MoveEvent | null;
  /** The winner's line once the game is won, else null. */
  readonly winLine: readonly number[] | null;
  /** Show the cube unfolded flat around the winning line. */
  readonly unfolded: boolean;
  /** True when the flat board's buttons carry the game for screen readers, so the picture is hidden from them. */
  readonly decorative: boolean;
  readonly onPick: (index: number) => void;
  readonly onUnavailable: () => void;
}

export function CubeView({ board, move, winLine, unfolded, decorative, onPick, onUnavailable }: CubeViewProps) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const scene = useRef<CubeScene | null>(null);
  const lastMove = useRef<MoveEvent | null | undefined>(undefined);
  const winShown = useRef(false);
  const latest = useRef({ onPick, onUnavailable });
  useEffect(() => {
    latest.current = { onPick, onUnavailable };
  });

  useEffect(() => {
    const el = canvas.current!;
    let s: CubeScene;
    try {
      s = new CubeScene(el, i => latest.current.onPick(i));
    } catch {
      latest.current.onUnavailable();
      return;
    }
    scene.current = s;
    const fit = () => s.resize(el.clientWidth, el.clientHeight);
    const observer = new ResizeObserver(fit);
    observer.observe(el);
    fit();
    return () => {
      observer.disconnect();
      s.dispose();
      scene.current = null;
      lastMove.current = undefined;
      winShown.current = false;
    };
  }, []);

  useEffect(() => {
    const s = scene.current;
    if (!s) return;
    if (lastMove.current === undefined) {
      // First paint, including a continued game: show it as it stands, with no replay.
      s.playMove(board, []);
    } else if (move !== lastMove.current) {
      s.playMove(board, move?.chaos?.turns ?? []);
      if (board.lastMove !== null) s.showFace(cellPosition(board.lastMove).face);
    } else {
      s.update(board);
    }
    lastMove.current = move;
  }, [board, move]);

  // Unfold to show the winning line, or fold back. On first paint (coming back from the menu, say)
  // it shows the end state at once, with no animation.
  const winKey = winLine?.join(',') ?? '';
  useEffect(() => {
    const s = scene.current;
    if (!s) return;
    s.setWin(winKey ? winKey.split(',').map(Number) : null, unfolded, winShown.current);
    winShown.current = true;
  }, [winKey, unfolded]);

  useEffect(() => {
    if (board.highlight !== null) scene.current?.showFace(cellPosition(board.highlight).face);
  }, [board.highlight]);

  return (
    <div className="cube-view">
      <canvas
        ref={canvas}
        {...(decorative
          ? { 'aria-hidden': true }
          : { role: 'img', 'aria-label': 'The cube. Click a square to place your mark, or drag to turn the cube.' })}
      />
    </div>
  );
}
