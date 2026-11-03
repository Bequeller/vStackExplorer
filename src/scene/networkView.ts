import type { Lesson, SceneNode, StateView, Step } from '../lessons/types';
import type { NodeStates } from './driver';
import { ICON_TOP, drawIcon } from './icons';
import { COS30 } from './iso';
import { setAttrs, svg, text } from './svg';

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Height on the illustration where links attach, above the base center. */
const ANCHOR_Z = 42;
/** How far from a node's anchor a token starts and stops, so it never sits on the drawing. */
const CLEAR = 52;
const MIN_FRAME = { w: 760, h: 470 };
const TOKEN_R = 8;

let sceneCount = 0;

/** Estimated advance of a label: Iosevka is 0.5em per Latin glyph; Hangul is ~1em. */
function textWidth(value: string, fontSize: number): number {
  let em = 0;
  for (const ch of value) em += /[\u1100-\u11ff\u3000-\u9fff\uac00-\ud7af\uff00-\uffef]/.test(ch) ? 1 : 0.5;
  return em * fontSize;
}

function sameView(a: StateView | undefined, b: StateView | undefined): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * The illustrated network: isometric nodes on a grid. Nodes appear on the step where they are
 * first used, and the camera (the SVG viewBox) eases to frame the nodes the step uses.
 */
export class NetworkView {
  readonly element: SVGSVGElement;
  private readonly nodes = new Map<string, SceneNode>();
  private readonly groups = new Map<string, SVGGElement>();
  private readonly badges = new Map<string, SVGGElement>();
  private readonly links = new Map<string, SVGLineElement>();
  private readonly firstUse = new Map<string, number>();
  private readonly linkFirstUse = new Map<string, number>();
  private readonly initial: NodeStates;
  private readonly token: SVGGElement;
  private readonly tokenDot: SVGCircleElement;
  private readonly tokenPill: SVGRectElement;
  private readonly tokenText: SVGTextElement;
  private tokenWidth = 0;

  private index = 0;
  private step: Step | undefined;
  private camera: Box;
  private cameraFrom: Box;
  private cameraTo: Box;

  constructor(host: Element, private readonly lesson: Lesson) {
    const id = `vse-${++sceneCount}`;
    this.element = svg('svg', {
      class: 'scene-network',
      role: 'img',
      'aria-label': `${lesson.title}: 구성 요소 그림`,
      preserveAspectRatio: 'xMidYMid meet',
    }, host);

    const defs = svg('defs', {}, this.element);
    const tileW = 2 * COS30 * 32;
    const pattern = svg('pattern', { id: `${id}-grid`, width: tileW, height: 32, patternUnits: 'userSpaceOnUse' }, defs);
    svg('path', { class: 'grid-line', d: `M0,0 L${tileW},32 M0,32 L${tileW},0` }, pattern);

    const { width, height } = lesson.scene;
    svg('rect', { class: 'grid', x: -1000, y: -1000, width: width + 2000, height: height + 2000, fill: `url(#${id}-grid)` }, this.element);

    const linkLayer = svg('g', { class: 'links' }, this.element);
    const nodeLayer = svg('g', { class: 'nodes' }, this.element);
    const tokenLayer = svg('g', { class: 'token-layer' }, this.element);

    lesson.steps.forEach((step, i) => {
      if (step.kind === 'move') {
        if (!this.firstUse.has(step.from)) this.firstUse.set(step.from, i === 0 ? -1 : i);
        if (!this.firstUse.has(step.to)) this.firstUse.set(step.to, i);
        const key = linkKey(step.from, step.to);
        if (!this.linkFirstUse.has(key)) this.linkFirstUse.set(key, i);
      } else if (!this.firstUse.has(step.node)) {
        this.firstUse.set(step.node, i);
      }
    });

    const initial: Record<string, StateView> = {};
    for (const s of lesson.states) initial[s.node] = s.view;
    this.initial = initial;

    // Draw from back to front so nearer illustrations overlap farther ones.
    const ordered = [...lesson.nodes].sort((a, b) => a.y - b.y || a.x - b.x);
    for (const node of lesson.nodes) this.nodes.set(node.id, node);
    for (const node of ordered) this.drawNode(nodeLayer, node);
    for (const [key] of this.linkFirstUse) {
      const [a, b] = key.split('|').map((k) => this.nodes.get(k));
      if (!a || !b) continue;
      const [ax, ay] = anchor(a);
      const [bx, by] = anchor(b);
      this.links.set(key, svg('line', { class: 'link', x1: ax, y1: ay, x2: bx, y2: by, opacity: 0 }, linkLayer));
    }

    this.token = svg('g', { class: 'token', opacity: 0 }, tokenLayer);
    this.tokenDot = svg('circle', { class: 'token-dot', r: TOKEN_R }, this.token);
    this.tokenPill = svg('rect', { class: 'token-pill', rx: 6, height: 26 }, this.token);
    this.tokenText = text('', { class: 'token-label', 'dominant-baseline': 'central' }, this.token);

    this.camera = this.frameFor([lesson.steps[0] ? this.involved(lesson.steps[0])[0] ?? '' : '']);
    this.cameraFrom = this.camera;
    this.cameraTo = this.camera;
    this.applyCamera(this.camera);
  }

  begin(step: Step, index: number, after: NodeStates): void {
    this.index = index;
    this.step = step;
    const involved = this.involved(step);

    for (const [nodeId, group] of this.groups) {
      const first = this.firstUse.get(nodeId) ?? Infinity;
      const shown = first < index;
      const entering = first === index;
      group.classList.toggle('is-hidden', !shown && !entering);
      group.classList.toggle('is-entering', entering);
      group.classList.toggle('is-active', involved.includes(nodeId));
      setAttrs(group, { opacity: shown ? 1 : 0 });
      const node = this.nodes.get(nodeId);
      if (node) setAttrs(group, { transform: `translate(${node.x} ${node.y})` });

      const badge = this.badges.get(nodeId);
      if (badge) {
        const changed = !sameView(after[nodeId], this.initial[nodeId]);
        const live = step.kind === 'mutate' && step.node === nodeId;
        badge.classList.toggle('is-shown', changed || live);
        badge.classList.toggle('is-live', live);
      }
    }

    for (const [key, line] of this.links) {
      const first = this.linkFirstUse.get(key) ?? Infinity;
      line.classList.toggle('is-active', step.kind === 'move' && key === linkKey(step.from, step.to));
      setAttrs(line, { opacity: first < index ? 1 : 0 });
    }

    if (step.kind === 'move') {
      this.token.setAttribute('class', `token token--${step.token.kind}`);
      this.tokenText.textContent = step.token.label;
      this.tokenWidth = textWidth(step.token.label, 14) + 18;
      setAttrs(this.tokenPill, { width: this.tokenWidth });
      this.placeToken(step, 0);
      setAttrs(this.token, { opacity: 1 });
    } else {
      setAttrs(this.token, { opacity: 0 });
    }

    this.cameraFrom = this.camera;
    this.cameraTo = this.frameFor(involved);
  }

  update(step: Step, t: number): void {
    // Nodes and links that first appear on this step draw in.
    for (const [nodeId, group] of this.groups) {
      if (this.firstUse.get(nodeId) !== this.index) continue;
      const node = this.nodes.get(nodeId);
      if (!node) continue;
      const appear = Math.min(1, t * 1.6);
      setAttrs(group, { opacity: appear, transform: `translate(${node.x} ${node.y + (1 - appear) * 18})` });
    }
    for (const [key, line] of this.links) {
      if (this.linkFirstUse.get(key) === this.index) setAttrs(line, { opacity: Math.min(1, t * 2) });
    }
    if (step.kind === 'move') this.placeToken(step, t);

    const a = this.cameraFrom;
    const b = this.cameraTo;
    this.camera = { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), w: lerp(a.w, b.w, t), h: lerp(a.h, b.h, t) };
    this.applyCamera(this.camera);
  }

  /** Re-aims the camera at the current step at once, e.g. after the element was resized. */
  refit(): void {
    if (!this.step) return;
    this.camera = this.frameFor(this.involved(this.step));
    this.cameraFrom = this.camera;
    this.cameraTo = this.camera;
    this.applyCamera(this.camera);
  }

  private involved(step: Step): string[] {
    return step.kind === 'move' ? [step.from, step.to] : [step.node];
  }

  private drawNode(layer: SVGGElement, node: SceneNode): void {
    const group = svg('g', {
      class: `node node--${node.kind} is-hidden`,
      transform: `translate(${node.x} ${node.y})`,
      opacity: 0,
      'data-node': node.id,
    }, layer);
    drawIcon(group, node.icon);
    text(node.label, { class: 'node-label', x: 0, y: 44, 'text-anchor': 'middle' }, group);
    if (node.sublabel) text(node.sublabel, { class: 'node-sublabel', x: 0, y: 62, 'text-anchor': 'middle' }, group);
    if (this.lesson.states.some((s) => s.node === node.id)) {
      const badge = svg('g', { class: 'badge', transform: `translate(34 ${-ICON_TOP + 6})` }, group);
      svg('rect', { class: 'badge-pill', x: 0, y: -12, width: 58, height: 24, rx: 12 }, badge);
      svg('circle', { class: 'badge-dot', cx: 13, cy: 0, r: 4.5 }, badge);
      text('상태', { class: 'badge-text', x: 23, y: 0, 'dominant-baseline': 'central' }, badge);
      this.badges.set(node.id, badge);
    }
    this.groups.set(node.id, group);
  }

  private placeToken(step: Step & { kind: 'move' }, t: number): void {
    const a = this.nodes.get(step.from);
    const b = this.nodes.get(step.to);
    if (!a || !b) return;
    const [ax, ay] = anchor(a);
    const [bx, by] = anchor(b);
    const len = Math.hypot(bx - ax, by - ay) || 1;
    const clear = Math.min(CLEAR, len / 3);
    const ux = (bx - ax) / len;
    const uy = (by - ay) / len;
    const sx = ax + ux * clear;
    const sy = ay + uy * clear;
    const ex = bx - ux * clear;
    const ey = by - uy * clear;
    const x = lerp(sx, ex, t);
    const y = lerp(sy, ey, t);
    setAttrs(this.tokenDot, { cx: x.toFixed(2), cy: y.toFixed(2) });
    const left = x - this.tokenWidth / 2;
    const top = y - TOKEN_R - 34;
    setAttrs(this.tokenPill, { x: left.toFixed(2), y: top.toFixed(2) });
    setAttrs(this.tokenText, { x: (left + 9).toFixed(2), y: (top + 13).toFixed(2) });
  }

  /** The viewBox that frames the given nodes, padded and matched to the element's aspect ratio. */
  private frameFor(nodeIds: string[]): Box {
    let x0 = Infinity;
    let y0 = Infinity;
    let x1 = -Infinity;
    let y1 = -Infinity;
    for (const id of nodeIds) {
      const n = this.nodes.get(id);
      if (!n) continue;
      x0 = Math.min(x0, n.x - 90);
      x1 = Math.max(x1, n.x + 90);
      y0 = Math.min(y0, n.y - ICON_TOP - 50);
      y1 = Math.max(y1, n.y + 76);
    }
    if (!Number.isFinite(x0)) return { x: 0, y: 0, w: this.lesson.scene.width, h: this.lesson.scene.height };
    const rect = this.element.getBoundingClientRect();
    const aspect = rect.width > 0 && rect.height > 0 ? rect.width / rect.height : 1.6;
    let w = Math.max(x1 - x0 + 80, MIN_FRAME.w);
    let h = Math.max(y1 - y0 + 60, MIN_FRAME.h);
    if (w / h > aspect) h = w / aspect;
    else w = h * aspect;
    const cx = (x0 + x1) / 2;
    const cy = (y0 + y1) / 2;
    return { x: cx - w / 2, y: cy - h / 2, w, h };
  }

  private applyCamera(box: Box): void {
    this.element.setAttribute('viewBox', `${box.x.toFixed(1)} ${box.y.toFixed(1)} ${box.w.toFixed(1)} ${box.h.toFixed(1)}`);
  }
}

function anchor(node: SceneNode): [number, number] {
  return [node.x, node.y - ANCHOR_Z];
}

function linkKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
