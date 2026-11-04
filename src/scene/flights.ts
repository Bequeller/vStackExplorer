// Tokens in flight: parallel moves, count bursts, and return lanes (decision 0015, ENG-3).
// The helpers at the top are pure, so tests can check timing without a DOM.
import type { MoveStep, PathKind, Step, Token, TokenKind } from '../lessons/types';
import { setAttrs, svg, text } from './svg';

/** One travel between two nodes inside a step. */
export interface Hop {
  from: string;
  to: string;
  token: Token;
}

/** Every hop of a move step: the main move, then its parallel moves, all in the same step. */
export function hopsOf(step: MoveStep): Hop[] {
  return [{ from: step.from, to: step.to, token: step.token }, ...(step.parallel ?? [])];
}

/** At most this many tokens are drawn for a `count` burst; the label says ×N. */
export const BURST_TOKENS = 8;

/**
 * How far along its path the k-th of n tokens is at step progress t (0..1). Burst tokens start
 * staggered and all arrive at t = 1; a single token (n = 1) simply follows t.
 */
export function flightProgress(t: number, k: number, n: number): number {
  const delay = n > 1 ? (0.4 * k) / (n - 1) : 0;
  return Math.min(1, Math.max(0, (t - delay) / (1 - delay)));
}

/** Undirected key of the link between two nodes. */
export function linkKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

/**
 * Lane per direction: the first direction used on a link is its forward lane; a move the other
 * way (a response, a return value) travels on an offset return lane, so request and response
 * read as a loop instead of overlapping.
 */
export function laneKeys(steps: readonly Step[]): (from: string, to: string) => { key: string; back: boolean } {
  const forward = new Map<string, string>();
  for (const step of steps) {
    if (step.kind !== 'move') continue;
    for (const hop of hopsOf(step)) {
      const key = linkKey(hop.from, hop.to);
      if (!forward.has(key)) forward.set(key, hop.from);
    }
  }
  return (from, to) => {
    const key = linkKey(from, to);
    const back = forward.get(key) !== undefined && forward.get(key) !== from;
    return { key: back ? `${key}#back` : key, back };
  };
}

export interface Flight {
  from: [number, number];
  to: [number, number];
  kind: TokenKind;
  path: PathKind;
  /** Shown on the lead token only. */
  label: string | null;
  k: number;
  n: number;
}

/** Estimated advance of a label: Iosevka is 0.5em per Latin glyph; Hangul is ~1em. */
function textWidth(value: string, fontSize: number): number {
  let em = 0;
  for (const ch of value) em += /[\u1100-\u11ff\u3000-\u9fff\uac00-\ud7af\uff00-\uffef]/.test(ch) ? 1 : 0.5;
  return em * fontSize;
}

interface TokenEl {
  group: SVGGElement;
  dot: SVGCircleElement;
  pill: SVGRectElement;
  label: SVGTextElement;
}

/** A pool of token drawings; a step shows as many as it has flights. */
export class TokenLayer {
  private readonly pool: TokenEl[] = [];
  private flights: Flight[] = [];

  constructor(private readonly layer: SVGGElement) {}

  show(flights: Flight[]): void {
    this.flights = flights;
    while (this.pool.length < flights.length) {
      const group = svg('g', { class: 'token', opacity: 0 }, this.layer);
      this.pool.push({
        group,
        dot: svg('circle', { class: 'token-dot' }, group),
        pill: svg('rect', { class: 'token-pill', rx: 6, height: 26 }, group),
        label: text('', { class: 'token-label', 'dominant-baseline': 'central' }, group),
      });
    }
    this.pool.forEach((el, i) => {
      const f = flights[i];
      setAttrs(el.group, { opacity: f ? 1 : 0 });
      if (!f) return;
      el.group.setAttribute('class', `token token--${f.kind} token--${f.path}${f.k > 0 ? ' token--trail' : ''}`);
      el.label.textContent = f.label ?? '';
      setAttrs(el.pill, { width: f.label ? textWidth(f.label, 14) + 18 : 0, opacity: f.label ? 1 : 0 });
    });
    this.update(0);
  }

  update(t: number): void {
    this.flights.forEach((f, i) => {
      const el = this.pool[i];
      if (!el) return;
      const p = flightProgress(t, f.k, f.n);
      const x = f.from[0] + (f.to[0] - f.from[0]) * p;
      const y = f.from[1] + (f.to[1] - f.from[1]) * p;
      setAttrs(el.dot, { cx: x.toFixed(2), cy: y.toFixed(2) });
      if (!f.label) return;
      const w = Number(el.pill.getAttribute('width'));
      const left = x - w / 2;
      const top = y - 42;
      setAttrs(el.pill, { x: left.toFixed(2), y: top.toFixed(2) });
      setAttrs(el.label, { x: (left + 9).toFixed(2), y: (top + 13).toFixed(2) });
    });
  }
}
