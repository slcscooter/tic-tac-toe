// Geometry of the Chaos Cube board: 54 cells on the surface of a 3x3x3 cube.
// Rules of record: docs/game-rules.md.
//
// Coordinates: x points right, y points up, z points out of the Front face toward the viewer.
// A cell is a cubie position p (each component -1, 0 or 1) plus the unit normal n of the face it
// sits on. Rows and columns follow the unfolded cross shown on screen:
//
//   Top above Front; Left, Front, Right, Back in a row; Bottom below Front.
//
// Row 0 is the top row of a face on that cross and column 0 its left column.

export type Vec3 = readonly [number, number, number];
export type Axis = 0 | 1 | 2;
export type FaceName = 'top' | 'left' | 'front' | 'right' | 'back' | 'bottom';

interface FaceSpec {
  readonly name: FaceName;
  readonly label: string;
  readonly normal: Vec3;
  readonly colDir: Vec3; // direction of increasing column
  readonly rowDir: Vec3; // direction of increasing row
}

export const FACES: readonly FaceSpec[] = [
  { name: 'top', label: 'Top', normal: [0, 1, 0], colDir: [1, 0, 0], rowDir: [0, 0, 1] },
  { name: 'left', label: 'Left', normal: [-1, 0, 0], colDir: [0, 0, 1], rowDir: [0, -1, 0] },
  { name: 'front', label: 'Front', normal: [0, 0, 1], colDir: [1, 0, 0], rowDir: [0, -1, 0] },
  { name: 'right', label: 'Right', normal: [1, 0, 0], colDir: [0, 0, -1], rowDir: [0, -1, 0] },
  { name: 'back', label: 'Back', normal: [0, 0, -1], colDir: [-1, 0, 0], rowDir: [0, -1, 0] },
  { name: 'bottom', label: 'Bottom', normal: [0, -1, 0], colDir: [1, 0, 0], rowDir: [0, 0, -1] },
];

export const CELL_COUNT = 54;

export interface CellPosition {
  readonly face: number; // index into FACES
  readonly row: number; // 0..2
  readonly col: number; // 0..2
}

export function cellIndex(face: number, row: number, col: number): number {
  return face * 9 + row * 3 + col;
}

export function cellPosition(index: number): CellPosition {
  return { face: Math.floor(index / 9), row: Math.floor((index % 9) / 3), col: index % 3 };
}

export function faceIndex(name: FaceName): number {
  return FACES.findIndex(f => f.name === name);
}

/** Cell index from a face name and 0-based row and column. */
export function cell(name: FaceName, row: number, col: number): number {
  return cellIndex(faceIndex(name), row, col);
}

/** Spoken name of a cell, 1-based: "Front, row 1, column 3". */
export function cellName(index: number): string {
  const { face, row, col } = cellPosition(index);
  return `${FACES[face].label}, row ${row + 1}, column ${col + 1}`;
}

const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const scale = (a: Vec3, k: number): Vec3 => [a[0] * k, a[1] * k, a[2] * k];
const key = (v: Vec3): string => v.join(',');

interface Sticker {
  readonly p: Vec3;
  readonly n: Vec3;
}

function sticker(index: number): Sticker {
  const { face, row, col } = cellPosition(index);
  const f = FACES[face];
  const p = add(add(f.normal, scale(f.colDir, col - 1)), scale(f.rowDir, row - 1));
  return { p, n: f.normal };
}

const STICKERS: readonly Sticker[] = Array.from({ length: CELL_COUNT }, (_, i) => sticker(i));
const BY_STICKER = new Map(STICKERS.map((s, i) => [key(s.p) + '|' + key(s.n), i]));

function indexOfSticker(p: Vec3, n: Vec3): number {
  const i = BY_STICKER.get(key(p) + '|' + key(n));
  if (i === undefined) throw new Error(`no cell at p=${key(p)} n=${key(n)}`);
  return i;
}

// ---------------------------------------------------------------------------------------------
// Turns

/**
 * A quarter turn of one slice. `layer` picks the slice along `axis` (-1, 0 or 1; 0 is a middle
 * slice). `quarter` is +1 for a quarter turn counterclockwise about the positive axis (the
 * right-hand rule) and -1 for the other way.
 */
export interface Turn {
  readonly axis: Axis;
  readonly layer: -1 | 0 | 1;
  readonly quarter: 1 | -1;
}

function rotate(v: Vec3, axis: Axis, quarter: 1 | -1): Vec3 {
  const [x, y, z] = v;
  if (axis === 0) return quarter === 1 ? [x, -z, y] : [x, z, -y];
  if (axis === 1) return quarter === 1 ? [z, y, -x] : [-z, y, x];
  return quarter === 1 ? [-y, x, z] : [y, -x, z];
}

/** All 18 turns: 9 slices, each a quarter turn either way. */
export const TURNS: readonly Turn[] = ([0, 1, 2] as const).flatMap(axis =>
  ([-1, 0, 1] as const).flatMap(layer => ([1, -1] as const).map(quarter => ({ axis, layer, quarter }))),
);

/** perm[i] is where the content of cell i lands after the turn. */
export function turnPermutation(turn: Turn): number[] {
  return STICKERS.map((s, i) => {
    if (s.p[turn.axis] !== turn.layer) return i;
    return indexOfSticker(rotate(s.p, turn.axis, turn.quarter), rotate(s.n, turn.axis, turn.quarter));
  });
}

const PERMUTATIONS = new Map(TURNS.map(t => [turnKey(t), turnPermutation(t)]));

function turnKey(t: Turn): string {
  return `${t.axis}${t.layer}${t.quarter}`;
}

/** Applies a turn to anything laid out per cell. Content moves with its cell. */
export function applyTurn<T>(cells: readonly T[], turn: Turn): T[] {
  const perm = PERMUTATIONS.get(turnKey(turn));
  if (!perm) throw new Error(`unknown turn ${turnKey(turn)}`);
  const out = new Array<T>(cells.length);
  cells.forEach((c, i) => {
    out[perm[i]] = c;
  });
  return out;
}

export function inverseTurn(turn: Turn): Turn {
  return { ...turn, quarter: turn.quarter === 1 ? -1 : 1 };
}

const SLICE_NAMES: Record<string, string> = {
  '0-1': 'Left face',
  '00': 'Middle slice between Left and Right, seen from Left',
  '01': 'Right face',
  '1-1': 'Bottom face',
  '10': 'Middle slice between Top and Bottom, seen from Bottom',
  '11': 'Top face',
  '2-1': 'Back face',
  '20': 'Middle slice between Front and Back, seen from Front',
  '21': 'Front face',
};

/**
 * True when the turn is clockwise as seen from the face named in its description. Outer faces
 * are seen from outside the cube. Middle slices follow cube notation: seen from Left, Bottom
 * and Front.
 */
export function isClockwise(turn: Turn): boolean {
  // The side the slice is seen from, as a sign on the axis.
  const viewSign = turn.layer !== 0 ? turn.layer : turn.axis === 2 ? 1 : -1;
  // Seen from the positive side, clockwise is a negative quarter turn about the axis.
  return turn.quarter === -viewSign;
}

/** Spoken description: "Front face turned clockwise". */
export function describeTurn(turn: Turn): string {
  const name = SLICE_NAMES[`${turn.axis}${turn.layer}`];
  return `${name}, turned ${isClockwise(turn) ? 'clockwise' : 'counterclockwise'}`;
}

// ---------------------------------------------------------------------------------------------
// Winning lines

export type LineKind = 'ring' | 'diagonal';

export interface Line {
  readonly kind: LineKind;
  readonly cells: readonly number[]; // 5 cells, in order along the line
}

export const WIN_LENGTH = 5;

// Lines are traced on doubled coordinates D = 2p + n, so a cell's in-face components are -2, 0
// or 2, its normal component is +-3, and the cube's edges sit at +-3. One unit is half a cell.

const normalAxis = (n: Vec3): Axis => (n[0] !== 0 ? 0 : n[1] !== 0 ? 1 : 2);

/**
 * Moves one cell from `index` in direction `d` (doubled units, tangent to the cell's face),
 * unfolding across a cube edge when it crosses one. Returns null when the move runs into a cube
 * corner, where 3 faces meet: the rules say a line stops there.
 */
function step(index: number, d: Vec3): { index: number; d: Vec3 } | null {
  const { p, n } = STICKERS[index];
  const ax = normalAxis(n);
  const D = add(scale(p, 2), n);
  const q = add(D, d);
  const crossed = ([0, 1, 2] as const).filter(i => i !== ax && Math.abs(q[i]) === 3);
  if (crossed.length === 2) return null;
  let d2 = d;
  if (crossed.length === 1) {
    const m = crossed[0];
    const next: [number, number, number] = [d[0], d[1], d[2]];
    next[m] = 0;
    next[ax] = -n[ax];
    d2 = next;
  }
  const q2 = add(q, d2);
  // Back from doubled coordinates: the component at +-3 is the normal.
  const n2: [number, number, number] = [0, 0, 0];
  const p2: [number, number, number] = [0, 0, 0];
  for (const i of [0, 1, 2] as const) {
    if (Math.abs(q2[i]) === 3) {
      n2[i] = Math.sign(q2[i]);
      p2[i] = Math.sign(q2[i]);
    } else {
      p2[i] = q2[i] / 2;
    }
  }
  return { index: indexOfSticker(p2, n2), d: d2 };
}

/**
 * Moves one cell from `index` by one row or column (dRow, dCol in -1, 0, 1, as the face is laid
 * out on the cross), following the cube surface over an edge. Diagonal moves into a cube corner
 * return null.
 */
export function neighbor(index: number, dRow: number, dCol: number): number | null {
  const f = FACES[cellPosition(index).face];
  const d = add(scale(f.rowDir, dRow), scale(f.colDir, dCol));
  return step(index, d)?.index ?? null;
}

function trace(start: number, d: Vec3): { path: number[]; closed: boolean } {
  const path = [start];
  let cur = { index: start, d };
  for (;;) {
    const next = step(cur.index, cur.d);
    if (next === null) return { path, closed: false };
    if (next.index === start) return { path, closed: true };
    path.push(next.index);
    cur = next;
    if (path.length > CELL_COUNT) throw new Error('line trace did not close');
  }
}

export interface Track {
  readonly cells: readonly number[];
  readonly closed: boolean; // a loop, rather than a segment that ends at cube corners
}

/** Every straight ring, or every diagonal, as a whole loop or corner-to-corner segment. */
export function tracks(kind: LineKind): Track[] {
  const seen = new Set<string>();
  const out: Track[] = [];
  for (let i = 0; i < CELL_COUNT; i++) {
    const f = FACES[cellPosition(i).face];
    const dirs: Vec3[] =
      kind === 'diagonal' ? [add(f.rowDir, f.colDir), add(f.rowDir, scale(f.colDir, -1))] : [f.rowDir, f.colDir];
    for (const d of dirs) {
      const fwd = trace(i, d);
      let cells = fwd.path;
      if (!fwd.closed) {
        const back = trace(i, scale(d, -1));
        cells = [...back.path.slice(1).reverse(), ...fwd.path];
      }
      const id = [...cells].sort((a, b) => a - b).join(',');
      if (seen.has(id)) continue;
      seen.add(id);
      out.push({ cells, closed: fwd.closed });
    }
  }
  return out;
}

function windows(kind: LineKind): Line[] {
  const seen = new Set<string>();
  const out: Line[] = [];
  for (const { cells: track, closed } of tracks(kind)) {
    if (track.length < WIN_LENGTH) continue;
    const starts = closed ? track.length : track.length - WIN_LENGTH + 1;
    for (let s = 0; s < starts; s++) {
      const cells = Array.from({ length: WIN_LENGTH }, (_, j) => track[(s + j) % track.length]);
      const id = [...cells].sort((a, b) => a - b).join(',');
      if (seen.has(id)) continue;
      seen.add(id);
      out.push({ kind, cells });
    }
  }
  return out;
}

/** Every winning line on the board: 108 along straight rings and 72 along diagonals. */
export const LINES: readonly Line[] = [...windows('ring'), ...windows('diagonal')];

/** Number of different faces a line covers. */
export function facesCovered(line: Line): number {
  return new Set(line.cells.map(c => cellPosition(c).face)).size;
}
