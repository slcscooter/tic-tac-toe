// The 3D cube, drawn with three.js. Plain imperative code: CubeView.tsx owns one of these and
// feeds it the board. Play follows Scott's cttt prototype: an X of two crossed bars and an O ring,
// drag to spin, click a face to place, chaos turns animated as real slice turns. The blocks follow
// the MossyBlock picture Scott chose: solid lime glass with a mossy pattern and rounded edges.
// Unlike the prototype, X and O differ in colour as well as shape, and everything is big and thick
// for low vision. This scene is only ever given marks, never chaos cells.

import {
  AmbientLight,
  BoxGeometry,
  DataTexture,
  DirectionalLight,
  Group,
  LinearMipmapLinearFilter,
  Matrix4,
  Mesh,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  PMREMGenerator,
  Quaternion,
  Raycaster,
  Scene,
  SRGBColorSpace,
  TorusGeometry,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three';
import type { Material } from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { applyTurn, cellAt, CELL_COUNT, faceIndex, FACES, stickerOf } from '../engine/cube';
import type { Turn, Vec3 } from '../engine/cube';
import type { Mark } from '../engine/game';
import { beforeTurns, faceViewDirection, fromAngles, toAngles, turnAngle } from './cube3d';
import { buildNet } from './cubeNet';
import { drawMoss, MOSS_BASE } from './moss';
import type { Net } from './cubeNet';

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
const ROUND = 0.06; // how rounded the block edges are; the flat face left still holds the whole cell
const MOSS_SIZE = 256; // pixels across the moss pattern; each block face shows a quarter of it
const DISTANCE = 8.6;
const TURN_MS = 340;
const UNFOLD_MS = 1800;
const BAR_MS = 450;
const SLAB = 0.2; // the flat tiles the cube unfolds into
const CAMERA_MS = 450;
const DRAG_PX = 6; // movement past this turns a press into a drag, not a click
// Never tip all the way over the top or bottom: seen straight on, the cube looks flat.
const PHI_MIN = 0.5;
const PHI_MAX = Math.PI - 0.5;

// Contrast against the lime blocks: X 3.4 to 1, O 3.2, last move 4.4. The white win glow is 2.0,
// so the black bar drawn through the line carries it; the yellow highlight relies on its black frame.
const COLORS = {
  x: 0x1d4ed8,
  o: 0xbe123c,
  highlight: 0xfacc15,
  frame: 0x111111,
  winning: 0xffffff,
  lastMove: 0x6b21a8,
  bar: 0x111111,
};

/** Solid lime glass: the moss pattern under a glossy clear coat, glowing faintly from inside. */
function mossMaterials(renderer: WebGLRenderer): { materials: MeshPhysicalMaterial[]; disposables: { dispose(): void }[] } {
  const map = new DataTexture(drawMoss(MOSS_SIZE), MOSS_SIZE, MOSS_SIZE);
  map.colorSpace = SRGBColorSpace;
  map.generateMipmaps = true;
  map.minFilter = LinearMipmapLinearFilter;
  map.needsUpdate = true;
  // Something soft for the clear coat to reflect, so the blocks shine like glass from every side.
  const pmrem = new PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const envMap = pmrem.fromScene(room, 0.04).texture;
  room.dispose();
  pmrem.dispose();
  const disposables: { dispose(): void }[] = [envMap];
  // Four views of the pattern, a quarter each, so neighbouring blocks don't look stamped.
  const materials = [0, 1, 2, 3].map(k => {
    const quarter = map.clone();
    quarter.repeat.set(0.5, 0.5);
    quarter.offset.set((k % 2) * 0.5, Math.floor(k / 2) * 0.5);
    const m = new MeshPhysicalMaterial({
      map: quarter,
      roughness: 0.45,
      metalness: 0,
      clearcoat: 1,
      clearcoatRoughness: 0.12,
      envMap,
      envMapIntensity: 0.2,
      emissive: (MOSS_BASE[0] << 16) | (MOSS_BASE[1] << 8) | MOSS_BASE[2],
      emissiveMap: quarter,
      emissiveIntensity: 0.04,
    });
    disposables.push(quarter, m);
    return m;
  });
  disposables.push(map);
  return { materials, disposables };
}

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
  /** Each cell's fill, frame and marks, laid on its block's face. They move onto tiles to unfold. */
  private readonly holders: Group[] = [];
  private readonly slabGeo = new RoundedBoxGeometry(BLOCK, BLOCK, SLAB, 3, ROUND);
  private readonly bar: Mesh;
  private readonly materials: Record<keyof typeof COLORS, MeshStandardMaterial>;
  private readonly moss: MeshPhysicalMaterial[];
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
  private lastTick = 0;
  private readonly reducedMotion: boolean;

  /** The winning line on show, as a key; '' when there is none. */
  private winKey = '';
  private winLine: readonly number[] = [];
  /** 1 to show the cube unfolded flat, 0 to show it folded. */
  private netTarget = 0;
  private netAnimate = true;
  private unfolding: {
    net: Net;
    slabs: Mesh[];
    progress: number;
    /** Where the camera looks, from how far, and which way it faces: folded, then flat. */
    from: { target: Vector3; distance: number; quaternion: Quaternion };
    to: { target: Vector3; distance: number; quaternion: Quaternion };
    bar: { start: Vector3; dir: Vector3; length: number; grown: number };
  } | null = null;

  constructor(canvas: HTMLCanvasElement, onPick: (index: number) => void) {
    this.canvas = canvas;
    this.onPick = onPick;
    this.renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

    this.materials = Object.fromEntries(
      Object.entries(COLORS).map(([k, c]) => [k, material(c, 0.45, 0.35)]),
    ) as Record<keyof typeof COLORS, MeshStandardMaterial>;
    this.disposables.push(...Object.values(this.materials));
    const moss = mossMaterials(this.renderer);
    this.moss = moss.materials;
    this.disposables.push(...moss.disposables);

    // Light that rides with the camera, from above and to the left, so whatever you look at is lit
    // and the three faces in view each get a clearly different shade.
    this.scene.add(new AmbientLight(0xffffff, 0.55));
    const key = new DirectionalLight(0xffffff, 2.6);
    key.position.set(-2.5, 4, 3);
    this.camera.add(key);
    this.scene.add(this.camera);

    this.buildBlocks();
    this.buildCells();
    this.bar = new Mesh(new BoxGeometry(1, 0.2, 0.06), this.materials.bar);
    this.bar.visible = false;
    this.scene.add(this.bar);
    this.disposables.push(this.slabGeo, this.bar.geometry);

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

  /**
   * The winning line, and whether to show the cube unfolded flat around it. A different line, or
   * none, resets to the folded cube at once. Otherwise the cube unfolds or folds back, animated
   * when `animate` is true, after any chaos turns finish.
   */
  setWin(line: readonly number[] | null, unfolded: boolean, animate: boolean) {
    const key = line?.join(',') ?? '';
    if (key !== this.winKey) {
      this.closeNet();
      this.winKey = key;
      this.winLine = line ?? [];
    }
    this.netTarget = line && unfolded ? 1 : 0;
    this.netAnimate = animate && !this.reducedMotion;
    this.invalidate();
  }

  /** Swings the camera round to show a face, unless it already faces the camera well. */
  showFace(face: number) {
    if (this.unfolding) return;
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
    const geometry = new RoundedBoxGeometry(BLOCK, BLOCK, BLOCK, 3, ROUND);
    this.disposables.push(geometry);
    for (const x of [-1, 0, 1])
      for (const y of [-1, 0, 1])
        for (const z of [-1, 0, 1]) {
          if (x === 0 && y === 0 && z === 0) continue; // the hidden core
          const block = new Mesh(geometry, this.mossFor([x, y, z]));
          block.position.set(x, y, z);
          block.userData.home = [x, y, z];
          this.blocks.set(posKey([x, y, z]), block);
          this.scene.add(block);
        }
  }

  /** One of the four views of the moss pattern, picked by where a block starts out. */
  private mossFor([x, y, z]: Vec3): MeshPhysicalMaterial {
    return this.moss[(((x + 1) * 9 + (y + 1) * 3 + (z + 1)) * 7) % this.moss.length];
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
      this.holders.push(holder);
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
    const dt = this.lastTick ? Math.min(100, now - this.lastTick) : 16;
    this.lastTick = now;
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

    if (this.stepNet(dt)) busy = true;

    this.renderer.render(this.scene, this.camera);
    if (busy || this.queue.length > 0) this.invalidate();
    else this.lastTick = 0;
  };

  // ---------------------------------------------------------------------------------------------
  // Unfolding to show the winning line

  /** Moves the net one frame toward its target. True while it is still moving. */
  private stepNet(dt: number): boolean {
    if (!this.winKey || this.turning || this.queue.length > 0) return false;
    if (this.netTarget === 1 && !this.unfolding) this.openNet();
    const u = this.unfolding;
    if (!u) return false;

    const step = this.netAnimate ? dt / UNFOLD_MS : 1;
    u.progress = this.netTarget === 1 ? Math.min(1, u.progress + step) : Math.max(0, u.progress - step);
    const e = easeInOut(u.progress);
    u.net.setProgress(e);
    // Turn to face the net while sliding over to its middle, and pull back early so the opening
    // faces stay in view: a straight slide from the cube view would pass close to the cube.
    const pullBack = 1 - (1 - u.progress) ** 3;
    const distance = u.from.distance + (u.to.distance - u.from.distance) * pullBack;
    this.camera.quaternion.slerpQuaternions(u.from.quaternion, u.to.quaternion, e);
    const target = u.from.target.clone().lerp(u.to.target, e);
    this.camera.position.copy(target).addScaledVector(new Vector3(0, 0, 1).applyQuaternion(this.camera.quaternion), distance);

    // The bar grows along the line once the net lies flat, and goes as soon as it folds.
    u.bar.grown = u.progress === 1 ? Math.min(1, u.bar.grown + (this.netAnimate ? dt / BAR_MS : 1)) : 0;
    this.bar.visible = u.bar.grown > 0;
    if (this.bar.visible) {
      const length = u.bar.length * easeInOut(u.bar.grown);
      this.bar.scale.set(length, 1, 1);
      this.bar.position.copy(u.bar.start).addScaledVector(u.bar.dir, length / 2);
    }

    if (u.progress === 0 && this.netTarget === 0) {
      this.closeNet();
      return true;
    }
    return u.progress < 1 || u.bar.grown < 1;
  }

  /** Swaps the blocks for flat tiles carrying the same marks, and works out where to look once flat. */
  private openNet() {
    const net = buildNet(this.winLine);
    this.cameraMove = null;
    this.scene.add(net.root);
    net.setProgress(0);
    this.scene.updateMatrixWorld(true);
    const slabs = net.anchors.map((anchor, i) => {
      const slab = new Mesh(this.slabGeo, this.mossFor(stickerOf(i).p));
      slab.position.z = -(0.5 - BLOCK / 2) - SLAB / 2; // outer face flush with the block's
      anchor.add(slab);
      anchor.attach(this.holders[i]);
      return slab;
    });
    for (const block of this.blocks.values()) block.visible = false;
    this.hover = null;
    this.paint();

    // Once flat: look straight at the net, squares square to the screen, with the line running left
    // to right (a diagonal line at 45 degrees).
    net.setProgress(1);
    const at = net.anchors.map(a => a.getWorldPosition(new Vector3()));
    net.setProgress(0);
    const normal = new Vector3(...FACES[net.plan.root].normal);
    const first = at[this.winLine[0]];
    const last = at[this.winLine[this.winLine.length - 1]];
    const dir = last.clone().sub(first).normalize();
    // The grid direction nearest the line becomes the screen's left-to-right.
    const grid = [new Vector3(...FACES[net.plan.root].colDir), new Vector3(...FACES[net.plan.root].rowDir)]
      .flatMap(a => [a, a.clone().negate()])
      .reduce((best, a) => (a.dot(dir) > best.dot(dir) + 1e-6 ? a : best));
    const across = grid.clone();
    const up = normal.clone().cross(across).normalize();
    const us = at.map(p => p.dot(across));
    const ws = at.map(p => p.dot(up));
    const [u0, u1, w0, w1] = [Math.min(...us), Math.max(...us), Math.min(...ws), Math.max(...ws)];
    const center = normal.clone().multiplyScalar(1.5).addScaledVector(across, (u0 + u1) / 2).addScaledVector(up, (w0 + w1) / 2);
    const tanV = Math.tan((this.camera.fov * Math.PI) / 360);
    const distance = Math.max((w1 - w0 + 2.2) / 2 / tanV, (u1 - u0 + 2.2) / 2 / (tanV * this.camera.aspect));
    const position = center.clone().addScaledVector(normal, distance);
    const quaternion = new Quaternion().setFromRotationMatrix(new Matrix4().lookAt(position, center, up));

    this.bar.quaternion.setFromRotationMatrix(new Matrix4().makeBasis(dir, normal.clone().cross(dir), normal));
    this.unfolding = {
      net,
      slabs,
      progress: 0,
      from: { target: new Vector3(), distance: DISTANCE, quaternion: this.camera.quaternion.clone() },
      to: { target: center, distance, quaternion },
      bar: {
        start: first.clone().addScaledVector(normal, 0.16).addScaledVector(dir, -0.35),
        dir,
        length: last.distanceTo(first) + 0.7,
        grown: 0,
      },
    };
  }

  /** Back to the blocks: the marks go home and the camera returns to its orbit. */
  private closeNet() {
    const u = this.unfolding;
    if (!u) return;
    u.net.setProgress(0);
    this.scene.updateMatrixWorld(true);
    this.holders.forEach((holder, i) => this.blocks.get(posKey(stickerOf(i).p))!.attach(holder));
    u.slabs.forEach(slab => slab.removeFromParent());
    this.scene.remove(u.net.root);
    for (const block of this.blocks.values()) block.visible = true;
    this.bar.visible = false;
    this.unfolding = null;
    this.placeCamera();
    this.invalidate();
  }

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
    if (this.turning || this.queue.length > 0 || this.unfolding) return null;
    const r = this.canvas.getBoundingClientRect();
    const ndc = new Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.camera);
    const hit = this.raycaster.intersectObjects([...this.blocks.values()], false)[0];
    if (!hit?.face) return null;
    // Blocks sit unrotated between turns, so local is world. A click on a rounded rim slants, so it
    // counts for the face it leans toward most.
    const n = hit.face.normal.toArray();
    const axis = n.reduce((best, v, k) => (Math.abs(v) > Math.abs(n[best]) ? k : best), 0);
    const out = (k: number) => (k === axis ? Math.sign(n[axis]) : 0);
    return cellAt(hit.object.userData.home as Vec3, [out(0), out(1), out(2)]);
  }

  private readonly onPointerDown = (e: PointerEvent) => {
    if (this.unfolding) return; // the flat net holds still
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
