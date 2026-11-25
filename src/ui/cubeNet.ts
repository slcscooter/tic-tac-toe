// Unfolding the cube flat to show a winning line. Plain three.js objects with no renderer, so it
// tests in Node. Scott chose this on 2026-11-24: the face in the middle of the line stays put and
// the line's faces unfold from it, so the line always lies flat in one straight run.
//
// A line can wind across up to 4 faces, so its faces unfold in a chain, each hinged to the face
// before it along the edge the line crosses: that keeps the line straight. The faces off the line
// hang off the first placed face they touch, which a test shows never overlaps.
//
// Each face is a hinge group nested under the face it unfolds from. A hinge sits on the shared
// edge and turns its face a quarter turn, from standing up to lying flat in its parent's plane.
// Everything is laid out folded, so at progress 0 the net matches the cube exactly.

import { Group, Object3D, Quaternion, Vector3 } from 'three';
import { CELL_COUNT, cellPosition, FACES, stickerOf } from '../engine/cube';
import type { Vec3 } from '../engine/cube';

const HALF = 1.5; // the cube's surface is 1.5 from its centre: 3 blocks of 1
const STAGGER = 0.25; // each step further from the root starts unfolding this much later

const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const adjacent = (a: number, b: number) => dot(FACES[a].normal, FACES[b].normal) === 0;
const v3 = (v: Vec3) => new Vector3(...v);
const ALL_FACES = FACES.map((_, f) => f);

export interface NetPlan {
  /** The face that stays put. */
  readonly root: number;
  /** The face each face unfolds from; null for the root. */
  readonly parent: readonly (number | null)[];
}

/** The faces a line crosses, in order along it. */
function faceRun(line: readonly number[]): number[] {
  const run: number[] = [];
  for (const c of line) {
    const f = cellPosition(c).face;
    if (run.at(-1) !== f) run.push(f);
  }
  return run;
}

/**
 * How to unfold for this line: the line's faces in a chain from the middle one, then each other
 * face hung from the first face it touches that is already placed. A test checks that this lays
 * all 180 winning lines flat with no squares overlapping.
 */
export function netPlan(line: readonly number[]): NetPlan {
  const run = faceRun(line);
  const count = (f: number) => line.filter(c => cellPosition(c).face === f).length;
  // The middle of the run; between two middles, the one with more of the line.
  const mid = (run.length - 1) / 2;
  const rootAt = count(run[Math.ceil(mid)]) > count(run[Math.floor(mid)]) ? Math.ceil(mid) : Math.floor(mid);
  const root = run[rootAt];

  const parent: (number | null | undefined)[] = Array(FACES.length).fill(undefined);
  parent[root] = null;
  run.forEach((f, k) => {
    if (k < rootAt) parent[f] = run[k + 1];
    if (k > rootAt) parent[f] = run[k - 1];
  });
  for (const f of ALL_FACES.filter(g => parent[g] === undefined)) {
    parent[f] = ALL_FACES.find(p => parent[p] !== undefined && adjacent(f, p));
  }
  return { root, parent: parent.map(p => p ?? null) };
}

export interface Net {
  readonly plan: NetPlan;
  /** Add this to the scene. */
  readonly root: Group;
  /**
   * One per cell, at the centre of its square on the cube's surface, with local +z pointing out.
   * Hang the cell's tile and marks on it and they unfold with it.
   */
  readonly anchors: readonly Object3D[];
  /** 0 is folded into the cube, 1 is flat. Faces further from the root unfold later. */
  setProgress(t: number): void;
}

function depthOf(plan: NetPlan, f: number): number {
  let d = 0;
  for (let p = plan.parent[f]; p !== null; p = plan.parent[p]) d++;
  return d;
}

function build(plan: NetPlan): Net {
  const hinges: Group[] = [];
  const pivots: Vector3[] = [];
  const axes: Vector3[] = [];
  const contents: Group[] = [];
  const depth = ALL_FACES.map(f => depthOf(plan, f));
  const maxDepth = Math.max(...depth);
  const order = [...ALL_FACES].sort((a, b) => depth[a] - depth[b]); // parents before children

  const root = new Group();
  for (const f of order) {
    const p = plan.parent[f];
    const nF = FACES[f].normal;
    const hinge = new Group();
    if (p === null) {
      pivots[f] = new Vector3();
      axes[f] = new Vector3();
      root.add(hinge);
    } else {
      const nP = FACES[p].normal;
      pivots[f] = v3(nP).add(v3(nF)).multiplyScalar(HALF); // on the shared edge
      axes[f] = v3(nP).cross(v3(nF)); // a quarter turn back about this lays the face flat
      hinge.position.copy(pivots[f]).sub(pivots[p]);
      hinges[p].add(hinge);
    }
    const content = new Group();
    content.position.copy(pivots[f]).negate();
    hinge.add(content);
    hinges[f] = hinge;
    contents[f] = content;
  }

  const outward = new Vector3(0, 0, 1);
  const anchors = Array.from({ length: CELL_COUNT }, (_, i) => {
    const { p, n } = stickerOf(i);
    const anchor = new Object3D();
    anchor.position.copy(v3(p).addScaledVector(v3(n), 0.5));
    anchor.quaternion.setFromUnitVectors(outward, v3(n));
    contents[cellPosition(i).face].add(anchor);
    return anchor;
  });

  const width = 1 - STAGGER * Math.max(0, maxDepth - 1);
  const q = new Quaternion();
  return {
    plan,
    root,
    anchors,
    setProgress(t: number) {
      for (const f of ALL_FACES) {
        if (plan.parent[f] === null) continue;
        const local = Math.min(1, Math.max(0, (t - STAGGER * (depth[f] - 1)) / width));
        hinges[f].quaternion.copy(q.setFromAxisAngle(axes[f], (-Math.PI / 2) * local));
      }
      root.updateMatrixWorld(true);
    },
  };
}

/** The net for a winning line. */
export function buildNet(line: readonly number[]): Net {
  return build(netPlan(line));
}
