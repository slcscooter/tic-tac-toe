// The 3D cube, drawn with three.js. Plain imperative code: CubeView.tsx owns one of these and
// feeds it the board. Look follows Scott's cttt prototype: marble blocks, an X of two crossed bars
// and an O ring, drag to spin, click a face to place, chaos turns animated as real slice turns.
// Unlike the prototype, X and O differ in colour as well as shape, and everything is big and thick
// for low vision. This scene is only ever given marks, never chaos cells.

import {
  AmbientLight,
  BoxGeometry,
  DirectionalLight,
  Group,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  Quaternion,
  Raycaster,
  Scene,
  TorusGeometry,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three';
import type { Material } from 'three';
import { applyTurn, cellAt, CELL_COUNT, faceIndex, stickerOf } from '../engine/cube';
import type { Turn, Vec3 } from '../engine/cube';
import type { Mark } from '../engine/game';
import { beforeTurns, faceViewDirection, fromAngles, toAngles, turnAngle } from './cube3d';

export interface CubeBoard {
  readonly marks: readonly (Mark | null)[];
  readonly winning: ReadonlySet<number>;
  /** The cell to light up: keyboard focus, or a hint. */
  readonly highlight: number | null;
  /** Where the latest mark ended up, outlined so a player can find the last move. */
  readonly lastMove: number | null;
  /** Clicks place marks only when true. */
  readonly canPick: boolean;
}

const BLOCK = 0.94; // block size; the gaps between blocks show the slices
const DISTANCE = 8.6;
const TURN_MS = 340;
const CAMERA_MS = 450;
const DRAG_PX = 6; // movement past this turns a press into a drag, not a click
// Never tip all the way over the top or bottom: seen straight on, the cube looks flat.
const PHI_MIN = 0.5;
const PHI_MAX = Math.PI - 0.5;

const COLORS = {
  marble: 0xe8dcc4,
  x: 0x1d4ed8,
  o: 0xbe123c,
  highlight: 0xfacc15,
  frame: 0x111111,
  winning: 0x22c55e,
  lastMove: 0xf97316,
};

/** Marks and highlights glow a little on their own, so they stay bold however the light falls. */
const material = (color: number, roughness: number, glow: number) =>
  new MeshStandardMaterial({ color, roughness, metalness: 0.05, emissive: color, emissiveIntensity: glow });

interface CellParts {
  readonly fill: Mesh;
  readonly frame: Group;
  readonly x: Group;
  readonly o: Mesh;
}

const AXES = [new Vector3(1, 0, 0), new Vector3(0, 1, 0), new Vector3(0, 0, 1)];

const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
const posKey = (p: Vec3) => p.join(',');

export class CubeScene {
  private readonly canvas: HTMLCanvasElement;
  private readonly onPick: (index: number) => void;
  private readonly renderer: WebGLRenderer;
  private readonly scene = new Scene();
  private readonly camera = new PerspectiveCamera(38, 1, 0.1, 100);
  private readonly blocks = new Map<string, Mesh>();
  private readonly cells: CellParts[] = [];
  private readonly materials: Record<keyof typeof COLORS, MeshStandardMaterial>;
  private readonly disposables: { dispose(): void }[] = [];
  private readonly raycaster = new Raycaster();

  private board: CubeBoard = { marks: [], winning: new Set(), highlight: null, lastMove: null, canPick: false };
  /** What the blocks show right now. It trails the board while chaos turns play out. */
  private shown: (Mark | null)[] = Array(CELL_COUNT).fill(null);
  private queue: Turn[] = [];
  private turning: { turn: Turn; pivot: Group; start: number } | null = null;
  private hover: number | null = null;

  private theta: number;
  private phi: number;
  private cameraMove: { from: { theta: number; phi: number }; to: { theta: number; phi: number }; start: number } | null = null;
  private press: { x: number; y: number; dragging: boolean; theta: number; phi: number } | null = null;
  private frame = 0;
  private readonly reducedMotion: boolean;

  constructor(canvas: HTMLCanvasElement, onPick: (index: number) => void) {
    this.canvas = canvas;
    this.onPick = onPick;
    this.renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

    this.materials = Object.fromEntries(
      Object.entries(COLORS).map(([k, c]) => [k, k === 'marble' ? material(c, 0.75, 0) : material(c, 0.45, 0.35)]),
    ) as Record<keyof typeof COLORS, MeshStandardMaterial>;
    this.disposables.push(...Object.values(this.materials));

    // Light that rides with the camera, from above and to the left, so whatever you look at is lit
    // and the three faces in view each get a clearly different shade.
    this.scene.add(new AmbientLight(0xffffff, 0.55));
    const key = new DirectionalLight(0xffffff, 2.6);
    key.position.set(-2.5, 4, 3);
    this.camera.add(key);
    this.scene.add(this.camera);

    this.buildBlocks();
    this.buildCells();

    ({ theta: this.theta, phi: this.phi } = toAngles(faceViewDirection(faceIndex('front'))));
    this.placeCamera();

    canvas.addEventListener('pointerdown', this.onPointerDown);
    canvas.addEventListener('pointermove', this.onPointerMove);
    canvas.addEventListener('pointerup', this.onPointerUp);
    canvas.addEventListener('pointercancel', this.onPointerCancel);
    canvas.addEventListener('pointerleave', this.onPointerLeave);
  }

  /** A new move. Its chaos `turns` play out first, unless reduced motion is on. */
  playMove(board: CubeBoard, turns: readonly Turn[]) {
    this.board = board;
    this.finishTurning(); // a new move while turns still play: jump to the end of them
    if (turns.length > 0 && !this.reducedMotion) {
      // Show the board from before the turns, with the new mark in place, then turn it.
      this.shown = beforeTurns(board.marks, turns);
      this.queue = [...turns];
    } else {
      this.shown = [...board.marks];
    }
    this.paint();
    this.invalidate();
  }

  /** The same move, with a new highlight or pick state. Turns in progress carry on. */
  update(board: CubeBoard) {
    this.board = board;
    if (!this.turning && this.queue.length === 0) this.shown = [...board.marks];
    this.paint();
    this.invalidate();
  }

  /** Swings the camera round to show a face, unless it already faces the camera well. */
  showFace(face: number) {
    const target = toAngles(faceViewDirection(face));
    const facing = new Vector3(...stickerOf(face * 9 + 4).n).dot(new Vector3(...fromAngles(this.theta, this.phi)));
    if (facing > 0.6) return;
    // Take the short way round.
    let dTheta = target.theta - this.theta;
    dTheta = Math.atan2(Math.sin(dTheta), Math.cos(dTheta));
    const to = { theta: this.theta + dTheta, phi: target.phi };
    if (this.reducedMotion) {
      ({ theta: this.theta, phi: this.phi } = to);
      this.placeCamera();
      this.invalidate();
      return;
    }
    this.cameraMove = { from: { theta: this.theta, phi: this.phi }, to, start: performance.now() };
    this.invalidate();
  }

  resize(width: number, height: number) {
    if (width === 0 || height === 0) return;
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.invalidate();
  }

  dispose() {
    cancelAnimationFrame(this.frame);
    this.canvas.removeEventListener('pointerdown', this.onPointerDown);
    this.canvas.removeEventListener('pointermove', this.onPointerMove);
    this.canvas.removeEventListener('pointerup', this.onPointerUp);
    this.canvas.removeEventListener('pointercancel', this.onPointerCancel);
    this.canvas.removeEventListener('pointerleave', this.onPointerLeave);
    this.disposables.forEach(d => d.dispose());
    this.renderer.dispose();
  }

  // ---------------------------------------------------------------------------------------------
  // Building

  private buildBlocks() {
    const geometry = new BoxGeometry(BLOCK, BLOCK, BLOCK);
    this.disposables.push(geometry);
    for (const x of [-1, 0, 1])
      for (const y of [-1, 0, 1])
        for (const z of [-1, 0, 1]) {
          if (x === 0 && y === 0 && z === 0) continue; // the hidden core
          const block = new Mesh(geometry, this.materials.marble);
          block.position.set(x, y, z);
          block.userData.home = [x, y, z];
          this.blocks.set(posKey([x, y, z]), block);
          this.scene.add(block);
        }
  }

  /** Each cell gets a fill, a frame, an X and an O, laid flat on its block's face and shown as needed. */
  private buildCells() {
    const fillGeo = new PlaneGeometry(0.8, 0.8);
    const barGeo = new BoxGeometry(0.8, 0.17, 0.07);
    const edgeGeo = new BoxGeometry(0.86, 0.09, 0.03);
    const ringGeo = new TorusGeometry(0.26, 0.085, 16, 48);
    this.disposables.push(fillGeo, barGeo, edgeGeo, ringGeo);
    const outward = new Vector3(0, 0, 1);

    for (let i = 0; i < CELL_COUNT; i++) {
      const { p, n } = stickerOf(i);
      const holder = new Group();
      holder.position.set(...n).multiplyScalar(BLOCK / 2 + 0.002);
      holder.quaternion.copy(new Quaternion().setFromUnitVectors(outward, new Vector3(...n)));

      const fill = new Mesh(fillGeo, this.materials.highlight);
      const frame = new Group();
      for (let k = 0; k < 4; k++) {
        const edge = new Mesh(edgeGeo, this.materials.frame);
        const side = k % 2 === 0 ? 1 : -1;
        if (k < 2) edge.position.set(0, side * 0.385, 0.015);
        else {
          edge.rotation.z = Math.PI / 2;
          edge.position.set(side * 0.385, 0, 0.015);
        }
        frame.add(edge);
      }
      const x = new Group();
      for (const angle of [Math.PI / 4, -Math.PI / 4]) {
        const bar = new Mesh(barGeo, this.materials.x);
        bar.rotation.z = angle;
        bar.position.z = 0.04;
        x.add(bar);
      }
      const o = new Mesh(ringGeo, this.materials.o);
      o.position.z = 0.06;

      holder.add(fill, frame, x, o);
      this.blocks.get(posKey(p))!.add(holder);
      this.cells.push({ fill, frame, x, o });
    }
  }

  // ---------------------------------------------------------------------------------------------
  // Painting and animation

  private paint() {
    const settled = this.queue.length === 0 && !this.turning;
    const { winning, highlight, lastMove } = this.board;
    this.cells.forEach((c, i) => {
      const mark = this.shown[i];
      c.x.visible = mark === 'X';
      c.o.visible = mark === 'O';
      const won = settled && winning.has(i);
      const lit = settled && highlight === i;
      c.fill.visible = won || lit;
      c.fill.material = won ? this.materials.winning : this.materials.highlight;
      const framed = lit || (settled && lastMove === i) || this.hover === i;
      c.frame.visible = framed;
      const frameMat: Material = lit || this.hover === i ? this.materials.frame : this.materials.lastMove;
      c.frame.children.forEach(e => ((e as Mesh).material = frameMat));
    });
  }

  private invalidate() {
    if (!this.frame) this.frame = requestAnimationFrame(this.tick);
  }

  private readonly tick = (now: number) => {
    this.frame = 0;
    let busy = false;

    if (!this.turning && this.queue.length > 0) this.startTurn(this.queue.shift()!, now);
    if (this.turning) {
      const t = Math.min(1, (now - this.turning.start) / TURN_MS);
      this.turning.pivot.setRotationFromAxisAngle(AXES[this.turning.turn.axis], turnAngle(this.turning.turn) * easeInOut(t));
      if (t >= 1) this.endTurn();
      busy = true;
    }

    if (this.cameraMove) {
      const t = Math.min(1, (now - this.cameraMove.start) / CAMERA_MS);
      const e = easeInOut(t);
      const { from, to } = this.cameraMove;
      this.theta = from.theta + (to.theta - from.theta) * e;
      this.phi = from.phi + (to.phi - from.phi) * e;
      this.placeCamera();
      if (t >= 1) this.cameraMove = null;
      busy = true;
    }

    this.renderer.render(this.scene, this.camera);
    if (busy || this.queue.length > 0) this.invalidate();
  };

  private startTurn(turn: Turn, now: number) {
    const pivot = new Group();
    this.scene.add(pivot);
    for (const block of this.blocks.values()) {
      if ((block.userData.home as Vec3)[turn.axis] === turn.layer) pivot.attach(block);
    }
    this.turning = { turn, pivot, start: now };
    this.paint();
  }

  /** Puts the blocks home and moves the marks the way the turn did. It looks the same, settled. */
  private endTurn() {
    if (!this.turning) return;
    const { turn, pivot } = this.turning;
    for (const block of [...pivot.children]) {
      this.scene.attach(block);
      block.position.set(...(block.userData.home as Vec3));
      block.rotation.set(0, 0, 0);
    }
    this.scene.remove(pivot);
    this.shown = applyTurn(this.shown, turn);
    this.turning = null;
    this.paint();
  }

  private finishTurning() {
    this.endTurn();
    this.queue = [];
  }

  private placeCamera() {
    this.camera.position.set(...fromAngles(this.theta, this.phi)).multiplyScalar(DISTANCE);
    this.camera.lookAt(0, 0, 0);
  }

  // ---------------------------------------------------------------------------------------------
  // Pointer: drag to spin, click to place

  private cellUnder(e: PointerEvent): number | null {
    if (this.turning || this.queue.length > 0) return null;
    const r = this.canvas.getBoundingClientRect();
    const ndc = new Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.camera);
    const hit = this.raycaster.intersectObjects([...this.blocks.values()], false)[0];
    if (!hit?.face) return null;
    const n = hit.face.normal; // blocks sit unrotated between turns, so local is world
    return cellAt(hit.object.userData.home as Vec3, [Math.round(n.x), Math.round(n.y), Math.round(n.z)]);
  }

  private readonly onPointerDown = (e: PointerEvent) => {
    this.canvas.setPointerCapture?.(e.pointerId);
    this.press = { x: e.clientX, y: e.clientY, dragging: false, theta: this.theta, phi: this.phi };
    this.cameraMove = null;
  };

  private readonly onPointerMove = (e: PointerEvent) => {
    if (!this.press) {
      const over = e.pointerType === 'mouse' ? this.cellUnder(e) : null;
      if (over !== this.hover) {
        this.hover = over;
        this.canvas.style.cursor = over !== null && this.board.canPick && this.board.marks[over] === null ? 'pointer' : 'grab';
        this.paint();
        this.invalidate();
      }
      return;
    }
    const dx = e.clientX - this.press.x;
    const dy = e.clientY - this.press.y;
    if (!this.press.dragging && Math.hypot(dx, dy) < DRAG_PX) return;
    this.press.dragging = true;
    this.canvas.style.cursor = 'grabbing';
    this.theta = this.press.theta - dx * 0.01;
    this.phi = Math.min(PHI_MAX, Math.max(PHI_MIN, this.press.phi - dy * 0.01));
    this.placeCamera();
    this.invalidate();
  };

  private readonly onPointerUp = (e: PointerEvent) => {
    const press = this.press;
    this.press = null;
    this.canvas.style.cursor = 'grab';
    if (!press || press.dragging) return;
    const index = this.cellUnder(e);
    if (index !== null && this.board.canPick && this.board.marks[index] === null) this.onPick(index);
  };

  private readonly onPointerCancel = () => {
    this.press = null;
  };

  private readonly onPointerLeave = () => {
    if (this.hover === null) return;
    this.hover = null;
    this.paint();
    this.invalidate();
  };
}
