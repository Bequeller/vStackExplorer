// Renderers for structural state views (log, queue, tree), drawn at a given animation progress.
// The same drawing serves the scene inset, the step details, and the icon gallery (decision 0015).
import type { LogView, QueueView, StateView, TreeView } from '../lessons/types';
import type { ViewDiff } from './driver';
import { clearChildren, svg, text } from './svg';

/** Views drawn as structures; `table` and `list` stay text tables in the step details. */
export function isStructural(view: StateView | undefined): view is LogView | QueueView | TreeView {
  return view?.type === 'log' || view?.type === 'queue' || view?.type === 'tree';
}

export interface Size {
  width: number;
  height: number;
}

const CELL = 50;
const GAP = 4;
const LOG_WINDOW = 8;

/**
 * Draws `view` into `g` (cleared first). With a diff, the change animates with `t` from 0 to 1:
 * markers slide, items move, and new entries or pages fade in. Returns the drawing's size.
 */
export function drawStateView(g: SVGGElement, view: LogView | QueueView | TreeView, diff: ViewDiff | undefined, t: number): Size {
  clearChildren(g);
  if (view.type === 'log') return drawLog(g, view, diff?.type === 'log' ? diff : undefined, t);
  if (view.type === 'queue') return drawQueue(g, view, diff?.type === 'queue' ? diff : undefined, t);
  return drawTree(g, view, diff?.type === 'tree' ? diff : undefined, t);
}

/** A standalone SVG of a view at its final state, with the change highlighted. */
export function stateViewSvg(view: LogView | QueueView | TreeView, diff: ViewDiff | undefined): SVGSVGElement {
  const el = svg('svg', { class: 'state-view-svg', role: 'img', 'aria-label': `${view.type} 상태` });
  const g = svg('g', { transform: 'translate(8 8)' }, el);
  const size = drawStateView(g, view, diff, 1);
  el.setAttribute('viewBox', `0 0 ${size.width + 16} ${size.height + 16}`);
  el.setAttribute('width', String(size.width + 16));
  return el;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function short(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

function drawLog(g: SVGGElement, view: LogView, diff: Extract<ViewDiff, { type: 'log' }> | undefined, t: number): Size {
  const entries = view.entries.slice(-LOG_WINDOW);
  const added = new Set(diff?.added);
  // x of an offset: the cell holding the first entry at or after it, or one past the last cell.
  const xOf = (offset: number): number => {
    const i = entries.findIndex((e) => e.offset >= offset);
    return (i < 0 ? entries.length : i) * (CELL + GAP);
  };
  entries.forEach((e, i) => {
    const cell = svg('g', { class: `sv-cell${added.has(e.offset) ? ' is-new' : ''}`, opacity: added.has(e.offset) ? t : 1 }, g);
    svg('rect', { x: i * (CELL + GAP), y: 14, width: CELL, height: 28, rx: 4 }, cell);
    text(String(e.offset), { class: 'sv-offset', x: i * (CELL + GAP) + 4, y: 10 }, cell);
    text(short(e.label, 7), { class: 'sv-text', x: i * (CELL + GAP) + CELL / 2, y: 32, 'text-anchor': 'middle' }, cell);
  });
  const markers = view.markers.map((m, row) => {
    const move = diff?.markers.find((d) => d.name === m.name);
    const from = move?.from ?? null;
    const x = lerp(from === null ? xOf(m.offset) : xOf(from), xOf(m.offset), t) + 6;
    const moved = from !== null && from !== m.offset;
    const marker = svg('g', { class: `sv-marker${moved ? ' is-moved' : ''}` }, g);
    const y = 48 + row * 16;
    svg('polygon', { points: `${x},${y} ${x - 5},${y + 8} ${x + 5},${y + 8}` }, marker);
    text(`${m.name} ${m.offset}`, { class: 'sv-mark-label', x: x + 8, y: y + 8 }, marker);
    return marker;
  });
  return { width: Math.max(entries.length + 1, 3) * (CELL + GAP) + 60, height: 52 + markers.length * 16 };
}

function drawQueue(g: SVGGElement, view: QueueView, diff: Extract<ViewDiff, { type: 'queue' }> | undefined, t: number): Size {
  const step = CELL + GAP + 6;
  const y = 22;
  const moves = diff?.items ?? view.items.map((item, i) => ({ item, from: i, to: i }));
  for (const m of moves) {
    // Items that left the queue fade out where they were; new items fade in.
    const pos = m.to === null ? m.from : m.from === null ? m.to : lerp(m.from, m.to, t);
    if (pos === null) continue;
    const moved = m.from !== null && m.to !== null && m.from !== m.to;
    const opacity = m.to === null ? 1 - t : m.from === null ? t : 1;
    const item = svg('g', { class: `sv-item${moved ? ' is-moved' : ''}${m.from === null ? ' is-new' : ''}`, opacity }, g);
    svg('rect', { x: pos * step, y, width: CELL + 6, height: 28, rx: 4 }, item);
    text(short(m.item, 8), { class: 'sv-text', x: pos * step + (CELL + 6) / 2, y: y + 18, 'text-anchor': 'middle' }, item);
  }
  view.marks.forEach((mark) => {
    const move = diff?.marks.find((d) => d.name === mark.name);
    const at = move?.from === null || move?.from === undefined ? mark.at : lerp(move.from, mark.at, t);
    const x = at * step - 3;
    const m = svg('g', { class: `sv-mark${move && move.from !== null && move.from !== mark.at ? ' is-moved' : ''}` }, g);
    svg('line', { x1: x, y1: y - 6, x2: x, y2: y + 34 }, m);
    text(mark.name, { class: 'sv-mark-label', x: x + 3, y: y - 9 }, m);
  });
  return { width: Math.max(view.items.length, 2) * step + 40, height: y + 40 };
}

function drawTree(g: SVGGElement, view: TreeView, diff: Extract<ViewDiff, { type: 'tree' }> | undefined, t: number): Size {
  const ROW = 58;
  const added = new Set(diff?.added);
  const changed = new Set(diff?.changed);
  const widthOf = (keys: string[]): number => Math.max(44, keys.join(' ').length * 7.4 + 16);
  const rows = view.levels.map((level) => level.reduce((w, p) => w + widthOf(p.keys) + 14, -14));
  const total = Math.max(...rows, 60);
  const boxes = new Map<string, { x: number; y: number; w: number }>();
  view.levels.forEach((level, depth) => {
    let x = (total - (rows[depth] ?? 0)) / 2;
    for (const page of level) {
      const w = widthOf(page.keys);
      boxes.set(page.id, { x, y: depth * ROW, w });
      x += w + 14;
    }
  });
  for (const page of view.levels.flat()) {
    const from = boxes.get(page.id);
    for (const child of page.children ?? []) {
      const to = boxes.get(child);
      if (!from || !to) continue;
      svg('line', { class: 'sv-edge', x1: from.x + from.w / 2, y1: from.y + 26, x2: to.x + to.w / 2, y2: to.y, opacity: added.has(child) ? t : 1 }, g);
    }
  }
  for (const page of view.levels.flat()) {
    const box = boxes.get(page.id);
    if (!box) continue;
    const isNew = added.has(page.id);
    const p = svg('g', {
      class: `sv-page${isNew ? ' is-new' : ''}${changed.has(page.id) ? ' is-changed' : ''}`,
      opacity: isNew ? t : 1,
      transform: `translate(0 ${isNew ? (1 - t) * -10 : 0})`,
    }, g);
    svg('rect', { x: box.x, y: box.y, width: box.w, height: 26, rx: 4 }, p);
    text(page.keys.join(' ') || '∅', { class: 'sv-text', x: box.x + box.w / 2, y: box.y + 17, 'text-anchor': 'middle' }, p);
  }
  return { width: total, height: view.levels.length * ROW - 30 };
}
