import type { StateView, Step, TopicNode } from '../lessons/types';
import { Camera, type Box } from './camera';
import type { NodeStates, PlacedLesson, StepContext } from './driver';
import { ICON_TOP, drawIcon } from './icons';
import { COS30 } from './iso';
import { RegionLayer, nodeLifts } from './regions';
import { BURST_TOKENS, TokenLayer, hopsOf, laneKeys, type Flight } from './flights';
import { drawStateView, isStructural } from './stateViews';
import { setAttrs, svg, text } from './svg';

/** Height on the illustration where links attach, above the base center. */
const ANCHOR_Z = 42;
/** How far from a node's anchor a token starts and stops, so it never sits on the drawing. */
const CLEAR = 52;
/** How far a return lane sits beside its forward lane. */
const LANE = 26;

let sceneCount = 0;

/** Estimated advance of a label: Iosevka is 0.5em per Latin glyph; Hangul is ~1em. */
function textWidth(value: string, fontSize: number): number {
  let em = 0;
  for (const ch of value) em += /[\u1100-\u11ff\u3000-\u9fff\uac00-\ud7af\uff00-\uffef]/.test(ch) ? 1 : 0.5;
  return em * fontSize;
}

/** Whether any of a node's state views (keyed `node` or `node/id`) differs between two snapshots. */
function nodeChanged(nodeId: string, a: NodeStates, b: NodeStates): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)].filter((k) => k === nodeId || k.startsWith(`${nodeId}/`)));
  return [...keys].some((k) => JSON.stringify(a[k]) !== JSON.stringify(b[k]));
}

/** Gap between a node and its state inset, and the inset's padding. */
const INSET_PAD = 12;

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
  private readonly tokens: TokenLayer;
  /** Lane of a move: its link, or the link's offset return lane for the reverse direction. */
  private readonly lane: (from: string, to: string) => { key: string; back: boolean };
  /** Lane keys the current step's moves travel on. */
  private current = new Set<string>();

  private index = 0;
  private step: Step | undefined;
  private readonly camera: Camera;
  private readonly regions: RegionLayer;
  private readonly insetLayer: SVGGElement;
  /** The state inset shown during the current mutate step (at most one at a time). */
  private inset: { group: SVGGElement; body: SVGGElement; box: Box; context: StepContext } | null = null;
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
    this.insetLayer = svg('g', { class: 'inset-layer' }, this.element);

    this.lane = laneKeys(lesson.steps);
    lesson.steps.forEach((step, i) => {
      const critical = step.path === 'critical';
      if (step.kind === 'move') {
        hopsOf(step).forEach((hop, h) => {
          if (!this.firstUse.has(hop.from)) this.firstUse.set(hop.from, i === 0 && h === 0 ? -1 : i);
          if (!this.firstUse.has(hop.to)) this.firstUse.set(hop.to, i);
          const { key } = this.lane(hop.from, hop.to);
          if (!this.linkFirstUse.has(key)) this.linkFirstUse.set(key, i);
          if (critical) {
            this.criticalLinks.add(key);
            this.criticalNodes.add(hop.from).add(hop.to);
          }
        });
      } else {
        if (!this.firstUse.has(step.node)) this.firstUse.set(step.node, i);
        if (critical) this.criticalNodes.add(step.node);
      }
    });

    this.lifts = nodeLifts(lesson.layout);
    this.regions = new RegionLayer(regionLayer, lesson.layout);

    const initial: Record<string, StateView> = {};
    for (const s of lesson.states) initial[s.id ? `${s.node}/${s.id}` : s.node] = s.view;
    this.initial = initial;

    // Draw from back to front so nearer illustrations overlap farther ones.
    const ordered = [...lesson.nodes].sort((a, b) => a.y - b.y || a.x - b.x);
    for (const node of lesson.nodes) this.nodes.set(node.id, node);
    for (const node of ordered) this.drawNode(nodeLayer, node);
    for (const [key] of this.linkFirstUse) {
      const [ids = '', back] = key.split('#');
      const [a, b] = ids.split('|');
      const line = a && b ? this.laneLine(a, b, back !== undefined) : null;
      if (!line) continue;
      const cls = `link ${this.criticalLinks.has(key) ? 'link--critical' : 'link--side'}${back ? ' link--return' : ''}`;
      this.links.set(key, svg('line', { class: cls, x1: line[0][0], y1: line[0][1], x2: line[1][0], y2: line[1][1], opacity: 0 }, linkLayer));
    }
    this.tokens = new TokenLayer(tokenLayer);

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
        const changed = nodeChanged(nodeId, after, this.initial);
        const live = step.kind === 'mutate' && step.node === nodeId;
        badge.classList.toggle('is-shown', changed || live);
        badge.classList.toggle('is-live', live);
      }
    }

    // A slab appears with its first shown node; during the replay, the critical nodes' slabs.
    this.regions.show(visible);

    this.current = new Set(step.kind === 'move' ? hopsOf(step).map((hop) => this.lane(hop.from, hop.to).key) : []);
    for (const [key, line] of this.links) {
      const first = this.linkFirstUse.get(key) ?? Infinity;
      const critical = this.criticalLinks.has(key);
      line.classList.toggle('is-active', this.current.has(key));
      const shown = context.replay ? critical : critical ? first < index : false;
      setAttrs(line, { opacity: shown ? 1 : 0 });
    }

    this.tokens.show(step.kind === 'move' ? this.flights(step) : []);

    // A structural view (log, queue, tree) shows as an inset while its node mutates, then
    // collapses back to the badge at the next step.
    this.inset?.group.remove();
    this.inset = context.state && isStructural(context.state.after) ? this.openInset(context) : null;

    const framing = context.replay ? this.frameFor([...this.criticalNodes]) : this.frameFor(involved);
    this.camera.aim(this.inset && !context.replay ? this.camera.frame([framing, this.inset.box]) : framing);
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
    for (const [key, line] of this.links) {
      const firstHere = this.linkFirstUse.get(key) === this.index && this.criticalLinks.has(key);
      const sideNow = this.current.has(key) && !this.criticalLinks.has(key);
      if (!this.replay && (firstHere || sideNow)) setAttrs(line, { opacity: Math.min(1, t * 2) });
    }
    this.tokens.update(t);
    if (this.inset) this.drawInset(this.inset, t);
    this.camera.update(t);
  }

  /** Re-aims the camera at the current step at once, e.g. after the element was resized. */
  refit(): void {
    if (!this.step) return;
    this.camera.jump(this.frameFor(this.replay ? [...this.criticalNodes] : this.involved(this.step)));
  }

  private openInset(context: StepContext): { group: SVGGElement; body: SVGGElement; box: Box; context: StepContext } | null {
    const node = context.state && this.nodes.get(context.state.node);
    if (!node || !context.state) return null;
    const group = svg('g', { class: 'state-inset' }, this.insetLayer);
    const x = node.x + 70;
    const y = node.y - this.lift(node.id) - ICON_TOP - 70;
    svg('line', { class: 'state-inset-tie', x1: node.x + 20, y1: node.y - this.lift(node.id) - 50, x2: x, y2: y + 30 }, group);
    svg('rect', { class: 'state-inset-card', x, y, rx: 10 }, group);
    text(context.state.title, { class: 'state-inset-title', x: x + INSET_PAD, y: y + 20 }, group);
    const body = svg('g', { transform: `translate(${x + INSET_PAD} ${y + 30})` }, group);
    const inset = { group, body, box: { x, y, w: 0, h: 0 }, context };
    this.drawInset(inset, 0);
    return inset;
  }

  private drawInset(inset: { group: SVGGElement; body: SVGGElement; box: Box; context: StepContext }, t: number): void {
    const change = inset.context.state;
    if (!change || !isStructural(change.after)) return;
    const size = drawStateView(inset.body, change.after, change.diff, t);
    const card = inset.group.querySelector('.state-inset-card');
    const w = Math.max(size.width, textWidth(change.title, 13) + 8) + INSET_PAD * 2;
    const h = size.height + 30 + INSET_PAD;
    card?.setAttribute('width', w.toFixed(1));
    card?.setAttribute('height', h.toFixed(1));
    inset.box = { ...inset.box, w, h };
  }

  private lift(nodeId: string): number {
    return this.lifts.get(nodeId) ?? 0;
  }

  /** Where links attach to a node: above its base, standing on its slab. */
  private anchor(node: TopicNode): [number, number] {
    return [node.x, node.y - this.lift(node.id) - ANCHOR_Z];
  }

  private involved(step: Step): string[] {
    return step.kind === 'move' ? [...new Set(hopsOf(step).flatMap((hop) => [hop.from, hop.to]))] : [step.node];
  }

  /** The tokens of a move step: one per hop, or a burst of up to 8 for a `count`, labeled ×N. */
  private flights(step: Step & { kind: 'move' }): Flight[] {
    return hopsOf(step).flatMap((hop, h) => {
      const ends = this.endpoints(hop.from, hop.to);
      if (!ends) return [];
      const n = h === 0 && step.count ? Math.min(step.count, BURST_TOKENS) : 1;
      const label = h === 0 && step.count ? `${hop.token.label} ×${step.count}` : hop.token.label;
      return Array.from({ length: n }, (_, k) => ({ from: ends[0], to: ends[1], kind: hop.token.kind, path: step.path, label: k === 0 ? label : null, k, n }));
    });
  }

  /** The line a lane is drawn on: between the two nodes' anchors, shifted aside for a return lane. */
  private laneLine(a: string, b: string, back: boolean): [[number, number], [number, number]] | null {
    const na = this.nodes.get(a);
    const nb = this.nodes.get(b);
    if (!na || !nb) return null;
    const [ax, ay] = this.anchor(na);
    const [bx, by] = this.anchor(nb);
    if (!back) return [[ax, ay], [bx, by]];
    const len = Math.hypot(bx - ax, by - ay) || 1;
    const ox = (-(by - ay) / len) * LANE;
    const oy = ((bx - ax) / len) * LANE;
    return [[ax + ox, ay + oy], [bx + ox, by + oy]];
  }

  /** Where a token on this move starts and stops: on its lane, clear of both drawings. */
  private endpoints(from: string, to: string): [[number, number], [number, number]] | null {
    const { key, back } = this.lane(from, to);
    const [a = '', b = ''] = (key.split('#')[0] ?? '').split('|');
    const line = this.laneLine(a, b, back);
    if (!line) return null;
    const [p, q] = from === a ? line : [line[1], line[0]];
    const len = Math.hypot(q[0] - p[0], q[1] - p[1]) || 1;
    const clear = Math.min(CLEAR, len / 3);
    const ux = (q[0] - p[0]) / len;
    const uy = (q[1] - p[1]) / len;
    return [[p[0] + ux * clear, p[1] + uy * clear], [q[0] - ux * clear, q[1] - uy * clear]];
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
