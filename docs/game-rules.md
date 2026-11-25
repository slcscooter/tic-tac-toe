# Chaos Cube tic-tac-toe: the rules

These are the rules of record. Scott set them in an interview on 2026-11-24. The code, the tests
and the AI follow this file. When the code and this file disagree, the code is wrong, or the rule
needs Scott's decision. Never quietly change a rule to match the code.

Items marked **Default** were not asked in the interview. They are Lucy's defaults, and Scott can
overrule any of them.

## The board

- The board is the surface of a 3 by 3 Rubik's cube: 6 faces of 9 cells, so 54 cells.
- The faces are Top, Bottom, Front, Back, Left and Right. **Default** (the face names).
- A cell is named by its face and a number from 1 to 9, read left to right and top to bottom as
  the face sits on the unfolded cross, like a phone keypad. So "Front 1" is the top left cell of
  Front, "Front 5" its center and "Front 9" its bottom right. Scott chose this on 2026-11-24, after
  the cttt prototype.
- The screen shows the cube in 3D, like the cttt prototype: click or tap a square to place a mark,
  drag to turn the cube, and chaos turns play out as real slice turns. Scott chose this on
  2026-11-24; the flat cross shown before was never put to him plainly. Without WebGL, the flat
  cross is the board.
- Screen reader and keyboard mode is a menu setting, off by default (Scott, 2026-11-24: opt-in, not
  the default). With it on, the game is fully playable by keyboard and screen reader, and every move
  and rotation is announced.
- When a player wins, the 3D cube unfolds flat with the winning line in one straight run: the
  face in the middle of the line stays put and the line's faces unfold from it in a chain. A Fold
  back button turns it back into the cube, and Unfold opens it again. Scott chose this on
  2026-11-24. A draw keeps the cube folded.
- After chaos, the announcement says how many other marks the turns moved, and the move list names
  each one with where it went. Scott chose this on 2026-11-24, after a play test showed other marks,
  the player's own included, moving without a word.

## Players and modes

- Two players, X and O. X moves first. **Default** (carried over from the old game).
- Against the AI, you choose who starts: you, the AI, or random.
- The AI has three levels: Easy, Medium and Hard.
- There is also a two-player mode for two people on one device.

## A turn

- On your turn, place one mark in any empty cell.
- Players never rotate the cube on purpose. Only chaos cells rotate it.

## Winning lines

You win with 5 of your marks in a row along a line. A longer run also wins, because it contains 5
in a row. There are two kinds of line.

- **Straight rings.** Each row or column of a face continues straight around four faces of the
  cube and closes into a loop of 12 cells. The cube has 9 rings. A run of 5 wraps over cube edges
  and covers 2 or 3 faces. That gives 108 winning lines.
- **Diagonals.** A 45-degree diagonal continues across a cube edge onto the next face. These
  diagonals close into 8 loops of 9 cells. A run of 5 covers 3 or 4 faces. That gives 72 winning
  lines.
- **Corner Vs.** Each face's two corner-to-corner diagonals run into a cube corner at both ends,
  where 3 faces meet, so a straight diagonal stops there. Instead, a corner-to-corner diagonal turns
  through the corner onto the corner-to-corner diagonal of either other face at that corner, making
  a V of 6 cells: for example Left 1, 5, 9 then Bottom 1, 5, 9. Any 5 in a row along a V wins.
  Laid flat around the third face at that corner, a V is one straight diagonal. 8 corners with 3
  pairs of faces make 24 Vs, and each V holds 2 runs of 5: 48 winning lines, each over 2 faces.
  Scott chose this on 2026-11-24 after a play test where his V didn't win, picking any 5 in a row
  and any two of the three faces at a corner. Until then the rules said these diagonals could never
  win.
- In all, there are 228 winning lines: 108 rings, 72 diagonals and 48 on corner Vs. The first 180
  come from a model script written during the interview. The engine's tests confirm all 228.

## Chaos cells

- At the start of a game, one hidden chaos cell is placed on each face, so 6 in all. It can be any
  of the face's 9 cells, chosen at random. **Default** (center cells included).
- Nobody can see where chaos cells are, and that includes the AI. The AI must not read their
  positions, and a test must prove it.
- A chaos cell belongs to its cell, like a sticker. When a rotation moves the cell, the chaos goes
  with it, so a face can end up with no chaos cells or with two.
- When you place a mark on a chaos cell:
  1. Your mark is placed.
  2. If that mark completes 5 in a row, you win at once and the chaos never runs.
  3. Otherwise the chaos runs. The first chaos cell triggered in a game makes 1 random rotation,
     the second makes 2, and so on, up to 6 rotations for the sixth.
  4. That chaos cell is now spent.
- Each rotation is a quarter turn, clockwise or counterclockwise, of one of the cube's 9 slices:
  the 6 outer faces or the 3 middle slices. Both the slice and the direction are random. Marks and
  hidden chaos cells move with their cells.
- A rotation may undo the one before it. There is no rule against it. **Default.**

## How a game ends

Lines are checked after every placement, and again after the chaos rotations.

- If only one player has 5 in a row, that player wins. That includes a line handed to the player
  who did not trigger the chaos.
- If a rotation gives both players 5 in a row at the same moment, the game is a draw.
- If the board fills up with no line, the game is a draw.

## Settled during the interview

- The classic 3 by 3 game is replaced, not kept as a mode. Git history keeps it.
- No AI can be unbeatable here, because hidden random chaos can beat any strategy. That is why the
  AI has levels and the game has a two-player mode.
