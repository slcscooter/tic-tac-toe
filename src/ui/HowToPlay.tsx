// A short guide in plain sections, one heading each. The full rules are in docs/game-rules.md;
// keep this page in step with them.

import { useEffect, useRef } from 'react';
import { BOARD_HELP } from './announce';

export function HowToPlay({ onBack }: { readonly onBack: () => void }) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => heading.current?.focus(), []);

  return (
    <section className="help" aria-labelledby="help-heading">
      <h1 id="help-heading" ref={heading} tabIndex={-1}>
        How to play
      </h1>

      <h2>The goal</h2>
      <p>Get 5 of your marks in a row. X moves first, and each turn you place one mark in any empty cell.</p>

      <h2>The board</h2>
      <p>
        The board is a Rubik&apos;s cube with 6 faces of 9 cells. The screen shows it unfolded as a cross: Top above
        Front; Left, Front, Right and Back in a row; Bottom below Front. Cells are numbered 1 to 9 on each face like a
        phone keypad, so Front 1 is the top left of Front and Front 5 its center.
      </p>

      <h2>Moving around</h2>
      <p>{BOARD_HELP}</p>

      <h2>Winning lines</h2>
      <p>
        A face is only 3 cells wide, so every line of 5 crosses a cube edge. Lines run straight around the cube, the
        way a row or column continues onto the next face, or along diagonals that cross an edge. A diagonal stops at a
        cube corner, so a face&apos;s own corner-to-corner diagonal never wins, and a face center only wins along a
        straight line.
      </p>

      <h2>Chaos cells</h2>
      <p>
        Six chaos cells are hidden on the board, one on each face at the start. Nobody can see them, not even the AI.
        When you place a mark on one, your mark goes down, then the cube turns: 1 random quarter turn for the first
        chaos cell, 2 for the second, up to 6 for the sixth. Any slice can turn, middle slices included, and marks move
        with their cells. If your mark completes 5 in a row, you win at once and the chaos never runs. After the
        turns you hear where your mark went and how many other marks moved. The Moves list names each one and
        where it went.
      </p>

      <h2>How a game ends</h2>
      <p>
        If chaos completes a line, that player wins, even when the other player set it off. If chaos completes lines
        for both players at once, it is a draw. A full board with no line is also a draw.
      </p>

      <h2>AI levels</h2>
      <p>
        Easy takes a win when it sees one and otherwise plays anywhere. Medium always blocks. Hard blocks and looks 3
        moves ahead. Chaos can still swing any game.
      </p>

      <button type="button" onClick={onBack}>
        Back
      </button>
    </section>
  );
}
