import type { Step } from '../lessons/types';
import type { PlacedLesson, StepContext } from './driver';
import { setAttrs, svg, text } from './svg';

const AXIS = 92;
const COL = 128;
const HEAD = 78;
const ROW = 42;

interface Row {
  group: SVGGElement;
  line: SVGLineElement | null;
  head: SVGPolygonElement | null;
  x1: number;
  x2: number;
}

/**
 * The sequence diagram: one lifeline per node (in order of first use), one row per step on a
 * time axis. Arrows draw in as playback reaches them; the current step is marked.
 */
export class SequenceView {
  readonly element: HTMLDivElement;
  private readonly svgEl: SVGSVGElement;
  private readonly rows: Row[] = [];
  private readonly marker: SVGRectElement;
  private index = 0;

  constructor(host: Element, lesson: PlacedLesson, times: string[]) {
    this.element = document.createElement('div');
    this.element.className = 'scene-sequence';
    host.appendChild(this.element);

    const order: string[] = [];
    for (const step of lesson.steps) {
      for (const id of step.kind === 'move' ? [step.from, step.to] : [step.node]) {
        if (!order.includes(id)) order.push(id);
      }
    }
    const colX = (id: string): number => AXIS + COL / 2 + order.indexOf(id) * COL;
    const width = AXIS + order.length * COL + 16;
    const height = HEAD + lesson.steps.length * ROW + 24;

    this.svgEl = svg('svg', {
      class: 'sequence',
      viewBox: `0 0 ${width} ${height}`,
      role: 'img',
      'aria-label': `${lesson.title}: 시퀀스 다이어그램`,
    }, this.element);
    this.element.style.setProperty('--seq-width', `${width}px`);

    this.marker = svg('rect', { class: 'seq-marker', x: 0, y: HEAD, width, height: ROW, rx: 4 }, this.svgEl);
    text('시각', { class: 'seq-axis-title', x: 12, y: HEAD - 14 }, this.svgEl);

    for (const id of order) {
      const node = lesson.nodes.find((n) => n.id === id);
      const x = colX(id);
      const head = svg('g', { class: `seq-head node--${node?.kind ?? 'app'}` }, this.svgEl);
      svg('rect', { class: 'seq-head-box', x: x - COL / 2 + 6, y: 10, width: COL - 12, height: 44, rx: 8 }, head);
      text(fit(node?.label ?? id, COL - 20, 12.5), { class: 'seq-head-label', x, y: 28, 'text-anchor': 'middle' }, head);
      if (node?.sublabel) text(fit(node.sublabel, COL - 20, 10.5), { class: 'seq-head-sub', x, y: 44, 'text-anchor': 'middle' }, head);
      svg('line', { class: 'seq-lifeline', x1: x, y1: 54, x2: x, y2: height - 8 }, this.svgEl);
    }

    lesson.steps.forEach((step, i) => {
      const y = HEAD + i * ROW + ROW / 2;
      const group = svg('g', { class: `seq-row seq-row--${step.kind === 'move' ? step.token.kind : 'state'} seq-row--${step.path}`, opacity: 0 }, this.svgEl);
      text(times[i] ?? '', { class: 'seq-time', x: 12, y: y + 4 }, group);
      if (step.kind === 'move') {
        const x1 = colX(step.from);
        const x2 = colX(step.to);
        const dir = Math.sign(x2 - x1) || 1;
        const line = svg('line', { class: 'seq-arrow', x1, y1: y, x2: x1, y2: y }, group);
        const head = svg('polygon', { class: 'seq-arrowhead', points: arrowHead(x1, y, dir) }, group);
        text(step.token.label, { class: 'seq-label', x: (x1 + x2) / 2, y: y - 7, 'text-anchor': 'middle' }, group);
        this.rows.push({ group, line, head, x1, x2 });
      } else {
        const x = colX(step.node);
        svg('rect', { class: 'seq-state', x: x - 9, y: y - 12, width: 18, height: 24, rx: 4 }, group);
        text(step.title, { class: 'seq-label seq-label--state', x: x + 16, y: y + 4 }, group);
        this.rows.push({ group, line: null, head: null, x1: x, x2: x });
      }
    });
  }

  begin(_step: Step, index: number, _context: StepContext): void {
    this.index = index;
    this.rows.forEach((row, i) => {
      row.group.classList.toggle('is-current', i === index);
      setAttrs(row.group, { opacity: i < index ? 1 : i === index ? 1 : 0 });
      if (row.line) this.drawArrow(row, i < index ? 1 : 0);
    });
    setAttrs(this.marker, { y: HEAD + index * ROW });
    this.keepInView(index);
  }

  /** Scrolls to the current row; call after the view becomes visible. */
  reveal(): void {
    this.keepInView(this.index);
  }

  update(_step: Step, t: number): void {
    const row = this.rows[this.index];
    if (row?.line) this.drawArrow(row, t);
  }

  private drawArrow(row: Row, t: number): void {
    if (!row.line || !row.head) return;
    const x = row.x1 + (row.x2 - row.x1) * t;
    const y = Number(row.line.getAttribute('y1'));
    setAttrs(row.line, { x2: x.toFixed(1) });
    setAttrs(row.head, { points: arrowHead(x, y, Math.sign(row.x2 - row.x1) || 1), opacity: t > 0.05 ? 1 : 0 });
  }

  /** Scrolls only this view (never the page) so the current row and its columns are visible. */
  private keepInView(index: number): void {
    const el = this.element;
    const scale = this.svgEl.getBoundingClientRect().height / Number(this.svgEl.viewBox.baseVal.height || 1);
    const row = this.rows[index];
    if (row && el.scrollWidth > el.clientWidth && scale > 0) {
      const left = (Math.min(row.x1, row.x2) - COL / 2) * scale;
      const right = (Math.max(row.x1, row.x2) + COL * 1.5) * scale;
      if (left < el.scrollLeft || right > el.scrollLeft + el.clientWidth) {
        el.scrollLeft = Math.max(0, Math.min(left - AXIS * scale, right - el.clientWidth));
      }
    }
    if (el.scrollHeight <= el.clientHeight) return;
    const top = (HEAD + index * ROW) * scale;
    const bottom = top + ROW * scale;
    if (top < el.scrollTop + HEAD * scale) el.scrollTop = Math.max(0, top - HEAD * scale);
    else if (bottom > el.scrollTop + el.clientHeight) el.scrollTop = bottom - el.clientHeight + ROW * scale;
  }
}

/** Shortens a monospace label (0.5em per Latin glyph, 1em per Hangul) to fit `width`. */
function fit(value: string, width: number, fontSize: number): string {
  const w = (s: string): number => [...s].reduce((n, ch) => n + (/[\u1100-\u11ff\u3000-\u9fff\uac00-\ud7af]/.test(ch) ? 1 : 0.5) * fontSize, 0);
  if (w(value) <= width) return value;
  let out = '';
  for (const ch of value) {
    if (w(`${out}${ch}…`) > width) break;
    out += ch;
  }
  return `${out}…`;
}

function arrowHead(x: number, y: number, dir: number): string {
  return `${x},${y} ${x - 9 * dir},${y - 5} ${x - 9 * dir},${y + 5}`;
}
