// Isometric line-art illustrations, one per IconKind. Drawn from boxes, discs, and lines;
// faces are tinted by the node's kind color through CSS (currentColor).
import type { IconKind } from '../lessons/types';
import { box, cylinder, disc, iso, line3, poly3, ring } from './iso';
import { svg } from './svg';

/** Height of the tallest part of each illustration above its base, in scene units (for framing and badges). */
export const ICON_TOP = 96;

type Draw = (g: SVGGElement) => void;

const laptop: Draw = (g) => {
  box(g, { w: 74, d: 50, h: 5 });
  // Keyboard rows on the base.
  for (const y of [-12, -2, 8]) line3(g, [[-26, y, 5], [26, y, 5]]);
  line3(g, [[-12, 17, 5], [12, 17, 5]]);
  // Screen: a thin panel at the back edge, leaning back.
  poly3(g, [[-37, -25, 5], [37, -25, 5], [37, -34, 58], [-37, -34, 58]], 'face face-right');
  poly3(g, [[-31, -26, 11], [31, -26, 11], [31, -33, 53], [-31, -33, 53]], 'ink screen');
  line3(g, [[-22, -28, 40], [10, -28, 40]]);
  line3(g, [[-22, -27.5, 31], [20, -27.5, 31]]);
  line3(g, [[-22, -27, 22], [0, -27, 22]]);
};

const server: Draw = (g) => {
  box(g, { w: 52, d: 44, h: 92 });
  // Drive bays on the front-left face (y = +22), with status lights.
  for (const z of [16, 34, 52, 70]) {
    poly3(g, [[-20, 22, z], [14, 22, z], [14, 22, z + 12], [-20, 22, z + 12]]);
    const [lx, ly] = iso(19, 22, z + 6);
    svg('circle', { class: 'led', cx: lx.toFixed(2), cy: ly.toFixed(2), r: 2 }, g);
  }
  // Vents on the right face.
  for (const y of [-12, -4, 4, 12]) line3(g, [[26, y, 60], [26, y, 80]]);
};

const filterStack: Draw = (g) => {
  for (const z of [0, 24, 48]) {
    box(g, { w: 70, d: 70, h: 7, z0: z });
    // Mesh lines on each plate.
    for (const t of [-18, 0, 18]) line3(g, [[t, -30, z + 7], [t, 30, z + 7]], 'ink mesh');
  }
  // Posts that hold the stack together.
  for (const [x, y] of [[-31, 31], [31, 31], [31, -31]] as const) line3(g, [[x, y, 7], [x, y, 48]], 'ink post');
};

const hub: Draw = (g) => {
  cylinder(g, 40, 18);
  ring(g, 40, 9);
  cylinder(g, 22, 22, 18);
  disc(g, 12, 40, 'ink');
  // Spokes on the base top: four directions.
  for (const [x, y] of [[36, 0], [-36, 0], [0, 36], [0, -36]] as const) line3(g, [[x * 0.62, y * 0.62, 18], [x, y, 18]]);
};

const index: Draw = (g) => {
  box(g, { w: 70, d: 52, h: 26 });
  // A table on the top face: header row and three rows, two columns.
  for (const y of [-14, -2, 10]) line3(g, [[-31, y, 26], [31, y, 26]]);
  line3(g, [[-10, -22, 26], [-10, 22, 26]]);
  // A lookup arrow pointing into the table.
  line3(g, [[48, -32, 40], [24, -8, 32]], 'ink accent');
  poly3(g, [[24, -8, 32], [30, -14, 37], [32, -6, 33]], 'ink accent-fill');
};

const adapter: Draw = (g) => {
  box(g, { w: 46, d: 46, h: 40 });
  // Two prongs out of the right face.
  for (const y of [-10, 10]) box(g, { cx: 33, cy: y, w: 20, d: 6, h: 6, z0: 17 });
  // A socket on the front-left face.
  poly3(g, [[-12, 23, 12], [12, 23, 12], [12, 23, 28], [-12, 23, 28]]);
  line3(g, [[-5, 23, 20], [-5, 23, 24]]);
  line3(g, [[5, 23, 20], [5, 23, 24]]);
};

const converter: Draw = (g) => {
  box(g, { w: 66, d: 46, h: 20 });
  // Bytes in (dashes) and an object out (a block), joined by an arrow on the top face.
  for (const x of [-26, -20, -14]) line3(g, [[x, -10, 20], [x, 10, 20]]);
  line3(g, [[-6, 0, 20], [10, 0, 20]], 'ink accent');
  poly3(g, [[10, -5, 20], [18, 0, 20], [10, 5, 20]], 'ink accent-fill');
  box(g, { cx: 26, cy: 0, w: 12, d: 18, h: 10, z0: 20 });
};

const controller: Draw = (g) => {
  box(g, { w: 58, d: 44, h: 56 });
  // A code panel on the front-left face.
  poly3(g, [[-24, 22, 10], [24, 22, 10], [24, 22, 48], [-24, 22, 48]], 'ink screen');
  for (const [z, len] of [[40, 30], [32, 18], [24, 34], [16, 12]] as const) line3(g, [[-18, 22, z], [-18 + len, 22, z]]);
  // "@" style handle on the right face: a small square badge.
  poly3(g, [[29, -10, 36], [29, 10, 36], [29, 10, 48], [29, -10, 48]]);
};

const service: Draw = (g) => {
  box(g, { w: 56, d: 56, h: 40 });
  // A cog on the top face: a ring of teeth around a disc.
  disc(g, 14, 40, 'ink');
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    line3(g, [[Math.cos(a) * 15, Math.sin(a) * 15, 40], [Math.cos(a) * 21, Math.sin(a) * 21, 40]]);
  }
};

const repository: Draw = (g) => {
  box(g, { w: 56, d: 48, h: 66 });
  // Three drawers with handles on the front-left face.
  for (const z of [6, 26, 46]) {
    poly3(g, [[-24, 24, z], [24, 24, z], [24, 24, z + 15], [-24, 24, z + 15]]);
    line3(g, [[-6, 24, z + 8], [6, 24, z + 8]], 'ink handle');
  }
};

const database: Draw = (g) => {
  cylinder(g, 34, 72);
  ring(g, 34, 24);
  ring(g, 34, 48);
};

const k8sNode: Draw = (g) => {
  box(g, { w: 84, d: 84, h: 16 });
  // Three pods on the node.
  box(g, { cx: -20, cy: -18, w: 22, d: 22, h: 20, z0: 16 });
  box(g, { cx: 18, cy: -18, w: 22, d: 22, h: 20, z0: 16 });
  box(g, { cx: -2, cy: 18, w: 22, d: 22, h: 20, z0: 16 });
};

// ---------------------------------------------------------------------------
// Helpers for shapes on vertical faces.

type P3 = [number, number, number];

/** A circle standing on the plane y = `y` (the front-left face), centered at (x, z). */
function circleY(g: SVGGElement, y: number, x: number, z: number, r: number, cls = 'ink'): void {
  const pts: P3[] = [];
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    pts.push([x + Math.cos(a) * r, y, z + Math.sin(a) * r]);
  }
  poly3(g, pts, cls);
}

/** A rectangle on the plane y = `y`, from (x0, z0) to (x1, z1). */
function rectY(g: SVGGElement, y: number, x0: number, z0: number, x1: number, z1: number, cls = 'ink'): void {
  poly3(g, [[x0, y, z0], [x1, y, z0], [x1, y, z1], [x0, y, z1]], cls);
}

/** A rectangle on the plane x = `x` (the front-right face), from (y0, z0) to (y1, z1). */
function rectX(g: SVGGElement, x: number, y0: number, z0: number, y1: number, z1: number, cls = 'ink'): void {
  poly3(g, [[x, y0, z0], [x, y1, z0], [x, y1, z1], [x, y0, z1]], cls);
}

/** A flat arrow on the plane z = `z`, from (x0, y0) to (x1, y1). */
function arrow(g: SVGGElement, x0: number, y0: number, x1: number, y1: number, z: number): void {
  line3(g, [[x0, y0, z], [x1, y1, z]], 'ink accent');
  const len = Math.hypot(x1 - x0, y1 - y0) || 1;
  const ux = (x1 - x0) / len;
  const uy = (y1 - y0) / len;
  poly3(g, [[x1, y1, z], [x1 - ux * 8 - uy * 5, y1 - uy * 8 + ux * 5, z], [x1 - ux * 8 + uy * 5, y1 - uy * 8 - ux * 5, z]], 'ink accent-fill');
}

/** Draws boxes from back to front (smaller x + y first), so nearer ones overlap farther ones. */
function boxes(g: SVGGElement, specs: Parameters<typeof box>[1][]): void {
  for (const spec of [...specs].sort((a, b) => (a.cx ?? 0) + (a.cy ?? 0) - ((b.cx ?? 0) + (b.cy ?? 0)))) box(g, spec);
}

// ---------------------------------------------------------------------------
// Generic components.

const globe: Draw = (g) => {
  box(g, { w: 30, d: 30, h: 8 });
  line3(g, [[0, 0, 8], [0, 0, 18]]);
  const [cx, cy] = iso(0, 0, 50);
  svg('circle', { class: 'face face-top', cx, cy, r: 32 }, g);
  svg('ellipse', { class: 'ink', cx, cy, rx: 13, ry: 32 }, g);
  svg('ellipse', { class: 'ink', cx, cy, rx: 32, ry: 11 }, g);
  svg('line', { class: 'ink', x1: cx, y1: cy - 32, x2: cx, y2: cy + 32 }, g);
};

const thread: Draw = (g) => {
  // A gear: teeth around a short cylinder, with a looping arrow on top.
  const teeth = Array.from({ length: 10 }, (_, i) => (i / 10) * Math.PI * 2);
  const tooth = (a: number): Parameters<typeof box>[1] => ({ cx: Math.cos(a) * 32, cy: Math.sin(a) * 32, w: 9, d: 9, h: 18 });
  boxes(g, teeth.filter((a) => Math.cos(a) + Math.sin(a) < 0).map(tooth));
  cylinder(g, 30, 18);
  boxes(g, teeth.filter((a) => Math.cos(a) + Math.sin(a) >= 0).map(tooth));
  disc(g, 30, 18, 'face face-top');
  const arc: P3[] = [];
  for (let i = 0; i <= 18; i++) {
    const a = -Math.PI * 0.2 + (i / 18) * Math.PI * 1.55;
    arc.push([Math.cos(a) * 17, Math.sin(a) * 17, 18]);
  }
  line3(g, arc, 'ink accent');
  const [ex, ey] = [arc[arc.length - 1]![0], arc[arc.length - 1]![1]];
  poly3(g, [[ex, ey, 18], [ex + 9, ey - 2, 18], [ex + 2, ey + 8, 18]], 'ink accent-fill');
};

const queue: Draw = (g) => {
  box(g, { w: 104, d: 30, h: 8 });
  for (const x of [-40, -16, 8]) box(g, { cx: x, w: 16, d: 20, h: 14, z0: 8 });
  for (const x of [-48, 48]) line3(g, [[x, -15, 8], [x, 15, 8]]);
  arrow(g, 22, 0, 46, 0, 8);
};

const memory: Draw = (g) => {
  // A memory module standing on its edge, chips on the front.
  box(g, { w: 96, d: 8, h: 34, z0: 4 });
  for (const x of [-36, -12, 12, 36]) rectY(g, 4, x - 9, 12, x + 9, 30, 'face face-top');
  for (let x = -44; x <= 44; x += 6) line3(g, [[x, 4, 4], [x, 4, 8]]);
  box(g, { w: 100, d: 14, h: 4 });
};

const lock: Draw = (g) => {
  box(g, { w: 40, d: 24, h: 34 });
  // Shackle: a U on the plane y = 0 above the body.
  const u: P3[] = [];
  for (let i = 0; i <= 16; i++) {
    const a = Math.PI - (i / 16) * Math.PI;
    u.push([Math.cos(a) * 12, 0, 34 + 6 + Math.sin(a) * 16]);
  }
  line3(g, [[-12, 0, 34], ...u, [12, 0, 34]], 'ink shackle');
  circleY(g, 12, 0, 20, 4, 'ink accent-fill');
  line3(g, [[0, 12, 16], [0, 12, 9]], 'ink accent');
};

const snapshot: Draw = (g) => {
  // A camera: body, lens on the front-left face, a snapshot card out of the top.
  box(g, { w: 56, d: 38, h: 34 });
  box(g, { cx: 14, cy: -6, w: 16, d: 12, h: 6, z0: 34 });
  circleY(g, 19, -4, 17, 12, 'face face-top');
  circleY(g, 19, -4, 17, 6);
  poly3(g, [[-20, -10, 34], [4, -10, 34], [4, -10, 58], [-20, -10, 58]], 'face face-right');
  line3(g, [[-16, -10, 50], [0, -10, 50]]);
  line3(g, [[-16, -10, 43], [-4, -10, 43]]);
};

// ---------------------------------------------------------------------------
// Storage.

const bufferPool: Draw = (g) => {
  box(g, { w: 96, d: 64, h: 6 });
  const frames: Parameters<typeof box>[1][] = [];
  for (const x of [-30, 0, 30]) for (const y of [-14, 14]) frames.push({ cx: x, cy: y, w: 22, d: 18, h: 24, z0: 6 });
  boxes(g, frames);
  // One frame marked as just loaded.
  line3(g, [[19, 8, 30], [41, 8, 30]], 'ink accent');
};

const page: Draw = (g) => {
  box(g, { w: 76, d: 56, h: 12 });
  // Header band and record rows on the top face.
  line3(g, [[-38, -18, 12], [38, -18, 12]]);
  for (const y of [-8, 2, 12, 22]) line3(g, [[-30, y, 12], [26, y, 12]], 'ink mesh');
  line3(g, [[-30, -22, 12], [-10, -22, 12]], 'ink accent');
};

const btree: Draw = (g) => {
  for (const [x, y] of [[-30, 22], [30, -22]] as const) {
    box(g, { cx: x, cy: y, w: 44, d: 30, h: 8 });
    for (const t of [-8, 0, 8]) line3(g, [[x - 16, y + t, 8], [x + 16, y + t, 8]], 'ink mesh');
  }
  line3(g, [[-30, 22, 8], [0, 0, 52]], 'ink post');
  line3(g, [[30, -22, 8], [0, 0, 52]], 'ink post');
  box(g, { w: 40, d: 28, h: 8, z0: 52 });
};

const logFile: Draw = (g) => {
  for (let i = 0; i < 5; i++) box(g, { w: 66, d: 46, h: 5, z0: i * 9 });
  // Append arrow on top and a write head line on the newest slab.
  arrow(g, -20, 0, 18, 0, 41);
  line3(g, [[-33, 23, 38], [33, 23, 38]], 'ink accent');
};

const diskDrive: Draw = (g) => {
  box(g, { w: 76, d: 56, h: 18 });
  disc(g, 20, 18, 'face face-left', -6, 2);
  disc(g, 4, 18, 'ink', -6, 2);
  line3(g, [[24, -18, 18], [6, -2, 18]], 'ink accent');
};

const file: Draw = (g) => {
  // A thick sheet lying flat, with a folded corner and text lines on top.
  box(g, { w: 50, d: 66, h: 6 });
  poly3(g, [[13, -33, 6], [25, -33, 6], [25, -21, 6]], 'face face-right');
  line3(g, [[13, -33, 6], [13, -21, 6], [25, -21, 6]]);
  for (const y of [-12, -2, 8, 18]) line3(g, [[-17, y, 6], [15, y, 6]], 'ink mesh');
};

const folder: Draw = (g) => {
  box(g, { cx: -10, cy: -20, w: 30, d: 8, h: 44 });
  // Files peeking out of the folder.
  for (const x of [-14, 4]) poly3(g, [[x, -12, 30], [x + 16, -12, 30], [x + 16, -12, 52], [x, -12, 52]], 'face face-right');
  box(g, { w: 72, d: 44, h: 38 });
  line3(g, [[-30, 22, 30], [30, 22, 30]], 'ink mesh');
};

// ---------------------------------------------------------------------------
// Messaging.

const producer: Draw = (g) => {
  box(g, { cx: -18, w: 44, d: 44, h: 36 });
  rectY(g, 22, -34, 10, -2, 28, 'ink screen');
  // Crates leaving to the right.
  boxes(g, [{ cx: 22, cy: 4, w: 16, d: 16, h: 14 }, { cx: 40, cy: 4, w: 16, d: 16, h: 14 }]);
  arrow(g, 24, -18, 52, -18, 18);
};

const broker: Draw = (g) => {
  box(g, { w: 56, d: 46, h: 88 });
  // Three log strips on the front-left face, each split into segments.
  for (const z of [18, 42, 66]) {
    rectY(g, 23, -22, z, 22, z + 12);
    for (const x of [-10, 2, 12]) line3(g, [[x, 23, z], [x, 23, z + 12]]);
  }
  for (const y of [-12, 0, 12]) line3(g, [[28, y, 74], [28, y, 82]], 'ink led-line');
};

const partitionLog: Draw = (g) => {
  box(g, { w: 110, d: 26, h: 16 });
  // Segments along the front-left face; the last one is still open.
  for (const x of [-30, -6, 18]) line3(g, [[x, 13, 0], [x, 13, 16]]);
  rectY(g, 13, 20, 3, 52, 13, 'ink accent');
  arrow(g, 30, -2, 58, -2, 16);
};

const consumer: Draw = (g) => {
  box(g, { cx: 18, w: 44, d: 44, h: 36 });
  rectY(g, 22, 2, 10, 34, 28, 'ink screen');
  box(g, { cx: -30, cy: 4, w: 16, d: 16, h: 14 });
  arrow(g, -52, -18, -10, -18, 18);
};

const coordinator: Draw = (g) => {
  box(g, { w: 54, d: 46, h: 72 });
  // A clipboard roster on the front-left face.
  rectY(g, 23, -16, 14, 16, 56, 'face face-top');
  rectY(g, 23, -6, 52, 6, 60);
  for (const z of [44, 36, 28, 20]) line3(g, [[-10, 23, z], [10, 23, z]], 'ink mesh');
};

const quorum: Draw = (g) => {
  const spots: [number, number][] = [[0, -34], [-30, 22], [30, 22]];
  for (let i = 0; i < 3; i++) {
    const [ax, ay] = spots[i]!;
    const [bx, by] = spots[(i + 1) % 3]!;
    line3(g, [[ax, ay, 2], [bx, by, 2]], 'ink post');
  }
  boxes(g, spots.map(([x, y]) => ({ cx: x, cy: y, w: 22, d: 22, h: 46 })));
  // The leader's beacon.
  box(g, { cx: 0, cy: -34, w: 10, d: 10, h: 8, z0: 46 });
};

// ---------------------------------------------------------------------------
// Key-value.

const keyspace: Draw = (g) => {
  box(g, { w: 62, d: 48, h: 64 });
  for (const z of [6, 26, 46]) {
    rectY(g, 24, -26, z, 26, z + 15);
    rectY(g, 24, -8, z + 5, 8, z + 11, 'ink accent');
  }
};

const replica: Draw = (g) => {
  // A dashed outline of the primary behind, the replica in front.
  poly3(g, [[-30, -38, 0], [14, -38, 0], [14, -38, 70], [-30, -38, 70]], 'ink ghost');
  poly3(g, [[14, -38, 70], [14, 2, 70], [-30, 2, 70], [-30, -38, 70]], 'ink ghost');
  box(g, { cx: 8, cy: 8, w: 46, d: 40, h: 62 });
  for (const z of [16, 32, 48]) rectY(g, 28, -8, z, 24, z + 8);
};

const sentinel: Draw = (g) => {
  box(g, { w: 22, d: 22, h: 66 });
  box(g, { w: 42, d: 42, h: 6, z0: 66 });
  for (const [x, y] of [[-19, 19], [19, 19], [19, -19]] as const) line3(g, [[x, y, 72], [x, y, 84]], 'ink post');
  circleY(g, 21, 0, 50, 6, 'ink accent-fill');
};

const slotMap: Draw = (g) => {
  cylinder(g, 42, 10);
  ring(g, 42, 5);
  disc(g, 18, 10, 'face face-left');
  // Three shards of the ring.
  for (let i = 0; i < 3; i++) {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / 3;
    line3(g, [[Math.cos(a) * 18, Math.sin(a) * 18, 10], [Math.cos(a) * 42, Math.sin(a) * 42, 10]]);
  }
  const marker: P3[] = [];
  for (let i = 0; i <= 10; i++) {
    const a = -Math.PI / 2 + (i / 10) * ((2 * Math.PI) / 3);
    marker.push([Math.cos(a) * 34, Math.sin(a) * 34, 10]);
  }
  line3(g, marker, 'ink accent');
};

// ---------------------------------------------------------------------------
// Cloud and Kubernetes.

const cloud: Draw = (g) => {
  box(g, { w: 84, d: 60, h: 8 });
  // A cloud floating above the platform.
  for (const [x, z, r] of [[-20, 46, 18], [22, 46, 16], [0, 58, 24]] as const) {
    const [cx, cy] = iso(x, -x, z);
    svg('circle', { class: 'face face-top', cx: cx.toFixed(1), cy: cy.toFixed(1), r }, g);
  }
  line3(g, [[0, 0, 8], [0, 0, 34]], 'ink post');
};

const etcd: Draw = (g) => {
  const spots: [number, number][] = [[0, -26], [-24, 16], [24, 16]];
  for (const [x, y] of [...spots].sort((a, b) => a[0] + a[1] - (b[0] + b[1]))) {
    cylinder(g, 15, 44, 0, x, y);
    ring(g, 15, 22, x, y);
  }
};

const apiServer: Draw = (g) => {
  box(g, { w: 76, d: 50, h: 46 });
  // Three gates on the front-left face: authn, authz, admission.
  for (const x of [-26, 0, 26]) rectY(g, 25, x - 8, 0, x + 8, 26, 'ink screen');
  line3(g, [[0, 0, 46], [0, 0, 70]], 'ink post');
  disc(g, 6, 70, 'ink accent-fill');
};

const scheduler: Draw = (g) => {
  box(g, { w: 64, d: 48, h: 26 });
  // Pods waiting on the desk and a flag (leader).
  boxes(g, [{ cx: -16, cy: 8, w: 14, d: 14, h: 12, z0: 26 }, { cx: 4, cy: 8, w: 14, d: 14, h: 12, z0: 26 }]);
  line3(g, [[22, -16, 26], [22, -16, 74]], 'ink post');
  poly3(g, [[22, -16, 74], [22, 4, 68], [22, -16, 62]], 'ink accent-fill');
};

const kubelet: Draw = (g) => {
  box(g, { w: 56, d: 56, h: 26 });
  // A ship's wheel standing on top.
  circleY(g, 0, 0, 52, 18);
  circleY(g, 0, 0, 52, 5, 'ink accent-fill');
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3;
    line3(g, [[Math.cos(a) * 5, 0, 52 + Math.sin(a) * 5], [Math.cos(a) * 24, 0, 52 + Math.sin(a) * 24]]);
  }
};

const pod: Draw = (g) => {
  // A translucent capsule around two containers.
  boxes(g, [{ cx: -12, cy: -6, w: 20, d: 20, h: 26 }, { cx: 12, cy: 8, w: 20, d: 20, h: 18 }]);
  poly3(g, [[-30, -30, 0], [30, -30, 0], [30, 30, 0], [-30, 30, 0]], 'ink');
  poly3(g, [[-30, 30, 0], [30, 30, 0], [30, 30, 40], [-30, 30, 40]], 'ink ghost');
  poly3(g, [[30, -30, 0], [30, 30, 0], [30, 30, 40], [30, -30, 40]], 'ink ghost');
  poly3(g, [[-30, -30, 40], [30, -30, 40], [30, 30, 40], [-30, 30, 40]], 'ink ghost');
};

const eni: Draw = (g) => {
  // A network card standing on its edge: board, chip, pins, and a port bracket.
  box(g, { w: 92, d: 6, h: 40, z0: 6 });
  rectY(g, 3, -10, 18, 14, 36, 'face face-top');
  for (let x = -40; x <= 30; x += 7) line3(g, [[x, 3, 6], [x, 3, 11]]);
  box(g, { cx: 50, w: 8, d: 16, h: 50 });
  rectX(g, 54, -5, 30, 5, 40, 'ink accent');
};

const loadBalancer: Draw = (g) => {
  box(g, { w: 90, d: 60, h: 6 });
  box(g, { cx: -20, w: 34, d: 34, h: 30, z0: 6 });
  // One input fanned out to three targets.
  for (const y of [-24, 0, 24]) {
    arrow(g, -2, 0, 36, y, 22);
    box(g, { cx: 40, cy: y, w: 8, d: 8, h: 8, z0: 6 });
  }
};

const iam: Draw = (g) => {
  // A badge plate with a key standing on it.
  box(g, { w: 56, d: 40, h: 8 });
  circleY(g, 0, -16, 46, 13);
  circleY(g, 0, -16, 46, 5);
  line3(g, [[-3, 0, 46], [28, 0, 46]]);
  for (const x of [18, 25]) line3(g, [[x, 0, 46], [x, 0, 38]]);
  line3(g, [[-30, 0, 8], [-24, 0, 33]], 'ink post');
};

const drawings: Record<IconKind, Draw> = {
  laptop,
  globe,
  server,
  'filter-stack': filterStack,
  hub,
  index,
  adapter,
  converter,
  controller,
  service,
  repository,
  database,
  thread,
  queue,
  memory,
  lock,
  snapshot,
  'buffer-pool': bufferPool,
  page,
  btree,
  'log-file': logFile,
  disk: diskDrive,
  file,
  folder,
  producer,
  broker,
  'partition-log': partitionLog,
  consumer,
  coordinator,
  quorum,
  keyspace,
  replica,
  sentinel,
  'slot-map': slotMap,
  cloud,
  etcd,
  'api-server': apiServer,
  scheduler,
  kubelet,
  'k8s-node': k8sNode,
  pod,
  eni,
  'load-balancer': loadBalancer,
  iam,
};

/** Every illustration, for the icon gallery and tests. */
export const iconKinds = Object.keys(drawings) as IconKind[];

/** Draws the illustration for `icon` into a new group under `parent`. */
export function drawIcon(parent: Element, icon: IconKind): SVGGElement {
  const g = svg('g', { class: `icon icon--${icon}` }, parent);
  // A soft ground shadow first, so the illustration sits on the grid.
  disc(g, 46, 0, 'shadow');
  drawings[icon](g);
  return g;
}
