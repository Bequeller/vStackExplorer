import type { Lesson, NodeState, SceneNode, StateView, Step } from '../lessons/types';
import type { NodeStates, SceneDriver } from './driver';
import { clearChildren, setAttrs, svg, text } from './svg';

// Scene units (the SVG viewBox), not pixels.
export const NODE_W = 184;
export const NODE_H = 56;
const ROW_H = 22;
const PANEL_TITLE_H = 26;
const PANEL_PAD = 10;
const CELL_FONT = 12.5;
const TOKEN_R = 9;

/** Estimated advance of a string: Iosevka is 0.5em per Latin glyph; Hangul is ~1em. */
export function textWidth(value: string, fontSize: number): number {
  let em = 0;
  for (const ch of value) em += /[\u1100-\u11ff\u3000-\u9fff\uac00-\ud7af\uff00-\uffef]/.test(ch) ? 1 : 0.5;
  return em * fontSize;
}

function fit(value: string, width: number, fontSize: number): string {
  if (textWidth(value, fontSize) <= width) return value;
  let out = '';
  for (const ch of value) {
    if (textWidth(`${out}${ch}…`, fontSize) > width) break;
    out += ch;
  }
  return `${out}…`;
}

function rowsOf(view: StateView): string[][] {
  return view.type === 'table' ? view.rows : view.items.map((item) => [item]);
}

function sameRow(a: string[] | undefined, b: string[] | undefined): boolean {
  return !!a && !!b && a.length === b.length && a.every((cell, i) => cell === b[i]);
}

interface PanelDraw {
  def: NodeState;
  group: SVGGElement;
  /** Rows whose text fades in during a mutate, and their old text that fades out. */
  fadingIn: SVGElement[];
  fadingOut: SVGElement[];
  highlights: SVGRectElement[];
}

/** Draws a lesson as SVG: nodes, links, a moving token, and node-state panels. */
export class SvgScene implements SceneDriver {
  readonly element: SVGSVGElement;
  private readonly scroller: HTMLDivElement;
  private readonly nodes = new Map<string, SceneNode>();
  private readonly nodeGroups = new Map<string, SVGGElement>();
  private readonly linkLines = new Map<string, SVGLineElement>();
  private readonly panels = new Map<string, PanelDraw>();
  private readonly token: SVGGElement;
  private readonly tokenDot: SVGCircleElement;
  private readonly tokenPill: SVGRectElement;
  private readonly tokenText: SVGTextElement;
  private tokenWidth = 0;

  constructor(host: HTMLElement, private readonly lesson: Lesson) {
    this.scroller = document.createElement('div');
    this.scroller.className = 'scene-scroll';
    host.appendChild(this.scroller);

    const { width, height } = lesson.scene;
    this.element = svg('svg', {
      viewBox: `0 0 ${width} ${height}`,
      class: 'scene',
      role: 'img',
      'aria-label': `${lesson.title} 구성 요소 다이어그램`,
      preserveAspectRatio: 'xMidYMid meet',
    });
    this.scroller.appendChild(this.element);

    const linkLayer = svg('g', { class: 'scene-links' }, this.element);
    const nodeLayer = svg('g', { class: 'scene-nodes' }, this.element);
    const panelLayer = svg('g', { class: 'scene-panels' }, this.element);
    const tokenLayer = svg('g', { class: 'scene-token-layer' }, this.element);

    for (const node of lesson.nodes) this.nodes.set(node.id, node);
    this.drawLinks(linkLayer);
    for (const node of lesson.nodes) this.drawNode(nodeLayer, node);
    for (const def of lesson.states) {
      const group = svg('g', { class: 'panel', 'data-node': def.node }, panelLayer);
      this.panels.set(def.node, { def, group, fadingIn: [], fadingOut: [], highlights: [] });
      this.drawPanel(def.node, def.view, undefined);
    }

    this.token = svg('g', { class: 'token', 'aria-hidden': 'true' }, tokenLayer);
    this.tokenPill = svg('rect', { class: 'token-pill', rx: 6, height: 24 }, this.token);
    this.tokenText = text('', { class: 'token-label', 'dominant-baseline': 'central' }, this.token);
    this.tokenDot = svg('circle', { class: 'token-dot', r: TOKEN_R }, this.token);
  }

  begin(step: Step, before: NodeStates, after: NodeStates): void {
    for (const group of this.nodeGroups.values()) group.classList.remove('is-source', 'is-target');
    for (const line of this.linkLines.values()) line.classList.remove('is-active');

    for (const [nodeId] of this.panels) {
      const view = before[nodeId];
      if (view) this.drawPanel(nodeId, view, undefined);
    }

    if (step.kind === 'move') {
      this.nodeGroups.get(step.from)?.classList.add('is-source');
      this.nodeGroups.get(step.to)?.classList.add('is-target');
      this.linkLines.get(linkKey(step.from, step.to))?.classList.add('is-active');
      this.token.setAttribute('class', `token token--${step.token.kind}`);
      this.tokenText.textContent = step.token.label;
      this.tokenWidth = textWidth(step.token.label, 13) + 16;
      setAttrs(this.tokenPill, { width: this.tokenWidth });
      this.token.classList.add('is-visible');
      this.placeToken(step, 0);
      this.focusOn(step.to);
    } else {
      this.token.classList.remove('is-visible');
      this.nodeGroups.get(step.node)?.classList.add('is-target');
      const view = after[step.node];
      if (view) this.drawPanel(step.node, view, before[step.node]);
      this.focusOn(step.node);
    }
  }

  update(step: Step, t: number): void {
    if (step.kind === 'move') {
      this.placeToken(step, t);
      return;
    }
    const panel = this.panels.get(step.node);
    if (!panel) return;
    for (const el of panel.fadingIn) el.setAttribute('opacity', String(t));
    for (const el of panel.fadingOut) el.setAttribute('opacity', String(1 - t));
    for (const el of panel.highlights) el.setAttribute('opacity', String(t));
  }

  destroy(): void {
    this.scroller.remove();
  }

  private drawLinks(layer: SVGGElement): void {
    for (const step of this.lesson.steps) {
      if (step.kind !== 'move') continue;
      const key = linkKey(step.from, step.to);
      const a = this.nodes.get(step.from);
      const b = this.nodes.get(step.to);
      if (this.linkLines.has(key) || !a || !b) continue;
      this.linkLines.set(key, svg('line', { class: 'link', x1: a.x, y1: a.y, x2: b.x, y2: b.y }, layer));
    }
  }

  private drawNode(layer: SVGGElement, node: SceneNode): void {
    const group = svg('g', { class: `node node--${node.kind}`, 'data-node': node.id }, layer);
    svg('rect', {
      class: 'node-box',
      x: node.x - NODE_W / 2,
      y: node.y - NODE_H / 2,
      width: NODE_W,
      height: NODE_H,
      rx: 8,
    }, group);
    svg('rect', { class: 'node-stripe', x: node.x - NODE_W / 2, y: node.y - NODE_H / 2, width: 5, height: NODE_H, rx: 2 }, group);
    const labelY = node.sublabel ? node.y - 8 : node.y;
    text(fit(node.label, NODE_W - 20, 15), {
      class: 'node-label',
      x: node.x + 2,
      y: labelY,
      'text-anchor': 'middle',
      'dominant-baseline': 'central',
    }, group);
    if (node.sublabel) {
      text(fit(node.sublabel, NODE_W - 20, 11.5), {
        class: 'node-sublabel',
        x: node.x + 2,
        y: node.y + 12,
        'text-anchor': 'middle',
        'dominant-baseline': 'central',
      }, group);
    }
    this.nodeGroups.set(node.id, group);
  }

  /** Draws a node's state panel. With `previous`, rows that changed fade from old to new text. */
  private drawPanel(nodeId: string, view: StateView, previous: StateView | undefined): void {
    const panel = this.panels.get(nodeId);
    if (!panel) return;
    const { def, group } = panel;
    clearChildren(group);
    panel.fadingIn = [];
    panel.fadingOut = [];
    panel.highlights = [];

    const rows = rowsOf(view);
    const oldRows = previous && previous.type === view.type ? rowsOf(previous) : undefined;
    const header = view.type === 'table' ? view.columns : undefined;
    const innerW = def.width - PANEL_PAD * 2;
    const widths = columnWidths(header, [...rows, ...(oldRows ?? [])], innerW, view.type === 'list');
    const bodyTop = def.y + PANEL_TITLE_H + (header ? ROW_H : 0);
    const height = bodyTop - def.y + rows.length * ROW_H + PANEL_PAD / 2;

    svg('rect', { class: 'panel-box', x: def.x, y: def.y, width: def.width, height, rx: 6 }, group);
    text(def.title, { class: 'panel-title', x: def.x + PANEL_PAD, y: def.y + PANEL_TITLE_H / 2 + 2, 'dominant-baseline': 'central' }, group);

    if (header) {
      let x = def.x + PANEL_PAD;
      header.forEach((col, c) => {
        const w = widths[c] ?? 0;
        text(fit(col, w - 4, CELL_FONT), {
          class: 'panel-head',
          x,
          y: def.y + PANEL_TITLE_H + ROW_H / 2,
          'dominant-baseline': 'central',
        }, group);
        x += w;
      });
    }

    rows.forEach((row, r) => {
      const y = bodyTop + r * ROW_H;
      const changed = oldRows !== undefined && !sameRow(oldRows[r], row);
      if (changed) {
        panel.highlights.push(svg('rect', {
          class: 'panel-row-hl',
          x: def.x + 3,
          y: y + 1,
          width: def.width - 6,
          height: ROW_H - 2,
          rx: 3,
          opacity: 0,
        }, group));
      }
      const fresh = svg('g', { class: changed ? 'panel-row is-changed' : 'panel-row', opacity: changed ? 0 : 1 }, group);
      this.drawCells(fresh, def, row, widths, y);
      if (changed) {
        panel.fadingIn.push(fresh);
        const old = oldRows[r];
        if (old) {
          const ghost = svg('g', { class: 'panel-row is-old', opacity: 1 }, group);
          this.drawCells(ghost, def, old, widths, y);
          panel.fadingOut.push(ghost);
        }
      }
    });
  }

  private drawCells(group: SVGGElement, def: NodeState, row: string[], widths: number[], y: number): void {
    let x = def.x + PANEL_PAD;
    row.forEach((cell, c) => {
      const w = widths[c] ?? 0;
      text(fit(cell, w - 4, CELL_FONT), { class: 'panel-cell', x, y: y + ROW_H / 2, 'dominant-baseline': 'central' }, group);
      x += w;
    });
  }

  private placeToken(step: Step & { kind: 'move' }, t: number): void {
    const a = this.nodes.get(step.from);
    const b = this.nodes.get(step.to);
    if (!a || !b) return;
    // Travel between the box edges, so the token never covers a node's label.
    const start = edgePoint(a, b);
    const end = edgePoint(b, a);
    const x = start.x + (end.x - start.x) * t;
    const y = start.y + (end.y - start.y) * t;
    setAttrs(this.tokenDot, { cx: x, cy: y });
    // Keep the label inside the scene.
    const left = Math.min(Math.max(x - this.tokenWidth / 2, 4), this.lesson.scene.width - this.tokenWidth - 4);
    const top = y - TOKEN_R - 30 < 4 ? y + TOKEN_R + 6 : y - TOKEN_R - 30;
    setAttrs(this.tokenPill, { x: left, y: top });
    setAttrs(this.tokenText, { x: left + 8, y: top + 12 });
  }

  /** On narrow screens the scene scrolls sideways; keep the active node in view. */
  private focusOn(nodeId: string): void {
    const node = this.nodes.get(nodeId);
    const scroller = this.scroller;
    if (!node || scroller.scrollWidth <= scroller.clientWidth) return;
    const scale = scroller.scrollWidth / this.lesson.scene.width;
    scroller.scrollTo({ left: node.x * scale - scroller.clientWidth / 2 });
  }
}

/** Where the line from `node` toward `other` leaves `node`'s box, plus a small gap. */
function edgePoint(node: SceneNode, other: SceneNode): { x: number; y: number } {
  const dx = other.x - node.x;
  const dy = other.y - node.y;
  const gap = TOKEN_R + 4;
  const scale = Math.min(
    dx === 0 ? Infinity : (NODE_W / 2 + gap) / Math.abs(dx),
    dy === 0 ? Infinity : (NODE_H / 2 + gap) / Math.abs(dy),
  );
  return scale === Infinity ? { x: node.x, y: node.y } : { x: node.x + dx * scale, y: node.y + dy * scale };
}

function linkKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

/** Splits the panel width across columns in proportion to their longest text. */
function columnWidths(header: string[] | undefined, rows: string[][], width: number, isList: boolean): number[] {
  if (isList) return [width];
  const count = header?.length ?? rows[0]?.length ?? 1;
  const longest = Array.from({ length: count }, (_, c) =>
    Math.max(textWidth(header?.[c] ?? '', CELL_FONT), ...rows.map((r) => textWidth(r[c] ?? '', CELL_FONT))) + 6,
  );
  const total = longest.reduce((sum, w) => sum + w, 0);
  return longest.map((w) => (w / total) * width);
}
