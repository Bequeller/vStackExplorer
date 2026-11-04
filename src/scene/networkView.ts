import type { StateView, Step, TopicNode } from '../lessons/types';
import { Camera, lerp, type Box } from './camera';
import type { NodeStates, PlacedLesson, StepContext } from './driver';
import { ICON_TOP, drawIcon } from './icons';
import { COS30 } from './iso';
import { RegionLayer, nodeLifts } from './regions';
import { setAttrs, svg, text } from './svg';

/** Height on the illustration where links attach, above the base center. */
const ANCHOR_Z = 42;
/** How far from a node's anchor a token starts and stops, so it never sits on the drawing. */
const CLEAR = 52;
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
 * The illustrated network: isometric nodes on the topic's map. Critical-path nodes appear on the
 * step where they are first used and stay; side-path nodes and links show only while a side step
 * uses them. The camera (the SVG viewBox) eases to frame the step's nodes, or, during the replay,
 * the whole critical path.
 */
export class NetworkView {
  readonly element: SVGSVGElement;
  private readonly nodes = new Map<string, TopicNode>();
  private readonly groups = new Map<string, SVGGElement>();
  private readonly badges = new Map<string, SVGGElement>();
  private readonly links = new Map<string, SVGLineElement>();
  private readonly firstUse = new Map<string, number>();
  private readonly linkFirstUse = new Map<string, number>();
  /** Links used by at least one critical move. Other links are side links. */
  private readonly criticalLinks = new Set<string>();
  /** Nodes used by at least one critical step. Other nodes are side-only. */
  private readonly criticalNodes = new Set<string>();
  /** Nodes that draw in during the current step. */
  private entering = new Set<string>();
  private replay = false;
  private readonly initial: NodeStates;
  private readonly token: SVGGElement;
  private readonly tokenDot: SVGCircleElement;
  private readonly tokenPill: SVGRectElement;
  private readonly tokenText: SVGTextElement;
  private tokenWidth = 0;

  private index = 0;
  private step: Step | undefined;
  private readonly camera: Camera;
  private readonly regions: RegionLayer;
  /** How high each node stands: the top of its innermost region slab. */
  private readonly lifts: Map<string, number>;

  constructor(host: Element, private readonly lesson: PlacedLesson) {
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

    const { width, height } = lesson.world;
    svg('rect', { class: 'grid', x: -1000, y: -1000, width: width + 2000, height: height + 2000, fill: `url(#${id}-grid)` }, this.element);

    const regionLayer = svg('g', { class: 'regions' }, this.element);
    const linkLayer = svg('g', { class: 'links' }, this.element);
    const nodeLayer = svg('g', { class: 'nodes' }, this.element);
    const tokenLayer = svg('g', { class: 'token-layer' }, this.element);

    lesson.steps.forEach((step, i) => {
      const critical = step.path === 'critical';
      if (step.kind === 'move') {
        if (!this.firstUse.has(step.from)) this.firstUse.set(step.from, i === 0 ? -1 : i);
        if (!this.firstUse.has(step.to)) this.firstUse.set(step.to, i);
        const key = linkKey(step.from, step.to);
        if (!this.linkFirstUse.has(key)) this.linkFirstUse.set(key, i);
        if (critical) {
          this.criticalLinks.add(key);
          this.criticalNodes.add(step.from).add(step.to);
        }
      } else {
        if (!this.firstUse.has(step.node)) this.firstUse.set(step.node, i);
        if (critical) this.criticalNodes.add(step.node);
      }
    });

    this.lifts = nodeLifts(lesson.layout);
    this.regions = new RegionLayer(regionLayer, lesson.layout);

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
      const [ax, ay] = this.anchor(a);
      const [bx, by] = this.anchor(b);
      const cls = this.criticalLinks.has(key) ? 'link link--critical' : 'link link--side';
      this.links.set(key, svg('line', { class: cls, x1: ax, y1: ay, x2: bx, y2: by, opacity: 0 }, linkLayer));
    }

    this.token = svg('g', { class: 'token', opacity: 0 }, tokenLayer);
    this.tokenDot = svg('circle', { class: 'token-dot', r: TOKEN_R }, this.token);
    this.tokenPill = svg('rect', { class: 'token-pill', rx: 6, height: 26 }, this.token);
    this.tokenText = text('', { class: 'token-label', 'dominant-baseline': 'central' }, this.token);

    this.camera = new Camera(this.element, lesson.world);
    const first = lesson.steps[0];
    this.camera.jump(this.frameFor(first ? this.involved(first).slice(0, 1) : []));
  }

  begin(step: Step, index: number, after: NodeStates, context: StepContext): void {
    this.index = index;
    this.step = step;
    this.replay = context.replay;
    const involved = this.involved(step);
    this.entering = new Set();
    const visible: string[] = [];

    for (const [nodeId, group] of this.groups) {
      const first = this.firstUse.get(nodeId) ?? Infinity;
      const isCritical = this.criticalNodes.has(nodeId);
      const isUsedNow = involved.includes(nodeId);
      let shown: boolean;
      let entering: boolean;
      if (context.replay) {
        // The replay shows the whole critical path at once: that is the picture to recall.
        shown = isCritical;
        entering = false;
      } else if (isCritical) {
        shown = first < index;
        entering = first === index;
      } else {
        // Side-only nodes appear only while a side step uses them.
        shown = false;
        entering = isUsedNow;
      }
      if (entering) this.entering.add(nodeId);
      if (shown || entering) visible.push(nodeId);
      group.classList.toggle('is-hidden', !shown && !entering);
      group.classList.toggle('is-side', !isCritical);
      group.classList.toggle('is-active', isUsedNow);
      setAttrs(group, { opacity: shown ? 1 : 0 });
      const node = this.nodes.get(nodeId);
      if (node) setAttrs(group, { transform: `translate(${node.x} ${node.y - this.lift(nodeId)})` });

      const badge = this.badges.get(nodeId);
      if (badge) {
        const changed = !sameView(after[nodeId], this.initial[nodeId]);
        const live = step.kind === 'mutate' && step.node === nodeId;
        badge.classList.toggle('is-shown', changed || live);
        badge.classList.toggle('is-live', live);
      }
    }

    // A slab appears with its first shown node; during the replay, the critical nodes' slabs.
    this.regions.show(visible);

    const current = step.kind === 'move' ? linkKey(step.from, step.to) : '';
    for (const [key, line] of this.links) {
      const first = this.linkFirstUse.get(key) ?? Infinity;
      const critical = this.criticalLinks.has(key);
      line.classList.toggle('is-active', key === current);
      const shown = context.replay ? critical : critical ? first < index : false;
      setAttrs(line, { opacity: shown ? 1 : 0 });
    }

    if (step.kind === 'move') {
      this.token.setAttribute('class', `token token--${step.token.kind} token--${step.path}`);
      this.tokenText.textContent = step.token.label;
      this.tokenWidth = textWidth(step.token.label, 14) + 18;
      setAttrs(this.tokenPill, { width: this.tokenWidth });
      this.placeToken(step, 0);
      setAttrs(this.token, { opacity: 1 });
    } else {
      setAttrs(this.token, { opacity: 0 });
    }

    this.camera.aim(context.replay ? this.frameFor([...this.criticalNodes]) : this.frameFor(involved));
  }

  update(step: Step, t: number): void {
    // Nodes and links that first appear on this step draw in.
    for (const [nodeId, group] of this.groups) {
      if (!this.entering.has(nodeId)) continue;
      const node = this.nodes.get(nodeId);
      if (!node) continue;
      const appear = Math.min(1, t * 1.6);
      setAttrs(group, { opacity: appear, transform: `translate(${node.x} ${node.y - this.lift(nodeId) + (1 - appear) * 18})` });
    }
    const current = step.kind === 'move' ? linkKey(step.from, step.to) : '';
    for (const [key, line] of this.links) {
      const firstHere = this.linkFirstUse.get(key) === this.index && this.criticalLinks.has(key);
      const sideNow = key === current && !this.criticalLinks.has(key);
      if (!this.replay && (firstHere || sideNow)) setAttrs(line, { opacity: Math.min(1, t * 2) });
    }
    if (step.kind === 'move') this.placeToken(step, t);
    this.camera.update(t);
  }

  /** Re-aims the camera at the current step at once, e.g. after the element was resized. */
  refit(): void {
    if (!this.step) return;
    this.camera.jump(this.frameFor(this.replay ? [...this.criticalNodes] : this.involved(this.step)));
  }

  private lift(nodeId: string): number {
    return this.lifts.get(nodeId) ?? 0;
  }

  /** Where links attach to a node: above its base, standing on its slab. */
  private anchor(node: TopicNode): [number, number] {
    return [node.x, node.y - this.lift(node.id) - ANCHOR_Z];
  }

  private involved(step: Step): string[] {
    return step.kind === 'move' ? [step.from, step.to] : [step.node];
  }

  private drawNode(layer: SVGGElement, node: TopicNode): void {
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
    const [ax, ay] = this.anchor(a);
    const [bx, by] = this.anchor(b);
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

  /** The camera framing for these nodes: each node's illustration and label, standing on its slab. */
  private frameFor(nodeIds: string[]): Box {
    const areas: Box[] = [];
    for (const id of nodeIds) {
      const n = this.nodes.get(id);
      if (!n) continue;
      const top = n.y - this.lift(id) - ICON_TOP - 50;
      areas.push({ x: n.x - 90, y: top, w: 180, h: n.y - this.lift(id) + 76 - top });
    }
    return this.camera.frame(areas);
  }
}

function linkKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}
