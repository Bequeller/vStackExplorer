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

const drawings: Record<IconKind, Draw> = {
  laptop,
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
  'k8s-node': k8sNode,
};

/** Draws the illustration for `icon` into a new group under `parent`. */
export function drawIcon(parent: Element, icon: IconKind): SVGGElement {
  const g = svg('g', { class: `icon icon--${icon}` }, parent);
  // A soft ground shadow first, so the illustration sits on the grid.
  disc(g, 46, 0, 'shadow');
  drawings[icon](g);
  return g;
}
