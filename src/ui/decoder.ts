import { formatTime, layoutRecord, type TimelineEvent } from '../engine';
import type { DecodedRecord, Lesson, Step } from '../lessons/types';
import { h, inlineCode } from './dom';
import { glyph } from './glyphs';

export interface DecoderOptions {
  lesson: Lesson;
  timeline: TimelineEvent[];
  /** Highest event index that has been played; navigation stays within played events. */
  lastPlayed: number;
  onClose(): void;
}

export interface Decoder {
  element: HTMLElement;
  show(index: number): void;
  close(): void;
  readonly isOpen: boolean;
}

/**
 * Full-screen decoder for one event: a proportional layer bar, every field with its real name,
 * value, and meaning, and the raw text colored per layer. Hovering a field highlights its bytes,
 * and the other way round.
 */
export function createDecoder(options: DecoderOptions): Decoder {
  const { lesson, timeline } = options;
  let index = 0;
  let open = false;

  const title = h('h2', { id: 'decoder-title', class: 'decoder-title' });
  const meta = h('p', { class: 'decoder-meta' });
  const prev = h('button', { type: 'button', class: 'icon-btn', 'aria-label': '이전 이벤트' }, glyph('prev'));
  const next = h('button', { type: 'button', class: 'icon-btn', 'aria-label': '다음 이벤트' }, glyph('next'));
  const close = h('button', { type: 'button', class: 'icon-btn', 'aria-label': '닫기 (Esc)' }, glyph('close'));
  const bar = h('div', { class: 'layer-bar', role: 'img' });
  const fields = h('div', { class: 'decoder-fields' });
  const raw = h('pre', { class: 'decoder-raw' });
  const footer = h('footer', { class: 'decoder-foot' });
  const dialog = h('div', { class: 'decoder', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'decoder-title', tabindex: '-1' },
    h('header', { class: 'decoder-head' },
      h('div', { class: 'decoder-heading' }, title, meta),
      h('div', { class: 'decoder-nav' }, prev, next, close),
    ),
    bar,
    h('div', { class: 'decoder-body' },
      h('section', { class: 'decoder-col', 'aria-label': '필드' }, fields),
      h('section', { class: 'decoder-col decoder-col--raw', 'aria-label': '원문' }, raw),
    ),
    footer,
  );
  const element = h('div', { class: 'overlay', hidden: true }, dialog);

  const hide = (): void => {
    open = false;
    element.hidden = true;
    options.onClose();
  };

  const show = (i: number): void => {
    index = Math.max(0, Math.min(i, options.lastPlayed, timeline.length - 1));
    const event = timeline[index];
    const step = lesson.steps[index];
    if (!event || !step) return;
    open = true;
    element.hidden = false;
    prev.disabled = index === 0;
    next.disabled = index >= Math.min(options.lastPlayed, timeline.length - 1);
    const record = step.record ?? summaryRecord(step);
    title.replaceChildren(h('span', { class: 'decoder-no' }, `#${index + 1}`), ` ${record.title}`);
    meta.textContent = [
      formatTime(event.time),
      `${event.source} → ${event.destination}`,
      record.protocol,
      event.bytes !== null ? `${event.bytes} bytes` : record.wire ? '' : '객체 (크기 없음)',
    ].filter(Boolean).join(' · ');
    renderRecord(record, bar, fields, raw);
    footer.replaceChildren(
      h('span', { class: 'tag tag--eg' }, 'E.G.'), ' 실행마다 달라지는 값(예시)',
      h('span', { class: 'foot-sep' }),
      record.wire ? '오른쪽은 전송되는 그대로의 바이트입니다. \\r\\n 은 CRLF(2 bytes).' : '오른쪽은 객체를 읽기 쉽게 적은 덤프입니다.',
    );
    dialog.focus();
  };

  // Hovering or focusing a field highlights its bytes, and the other way round.
  const link = (target: EventTarget | null, on: boolean): void => {
    const id = (target as Element | null)?.closest<HTMLElement>('[data-field]')?.dataset.field;
    if (id === undefined) return;
    for (const el of dialog.querySelectorAll(`[data-field="${id}"]`)) el.classList.toggle('is-linked', on);
  };
  for (const root of [fields, raw]) {
    root.addEventListener('pointerover', (e) => link(e.target, true));
    root.addEventListener('pointerout', (e) => link(e.target, false));
    root.addEventListener('focusin', (e) => link(e.target, true));
    root.addEventListener('focusout', (e) => link(e.target, false));
  }

  prev.addEventListener('click', () => show(index - 1));
  next.addEventListener('click', () => show(index + 1));
  close.addEventListener('click', hide);
  element.addEventListener('click', (e) => {
    if (e.target === element) hide();
  });
  element.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') hide();
    else if (e.key === 'ArrowLeft') show(index - 1);
    else if (e.key === 'ArrowRight') show(index + 1);
    else return;
    e.preventDefault();
    e.stopPropagation();
  });

  return {
    element,
    show,
    close: hide,
    get isOpen() {
      return open;
    },
  };
}

/** For a step without a decoded record: its key lines and facts, so the decoder still explains the event. */
function summaryRecord(step: Step): DecodedRecord {
  const raw = (step.lines ?? [step.kind === 'move' ? step.token.label : step.title]).join('\n');
  return {
    title: step.title,
    protocol: '요약',
    raw,
    wire: false,
    segments: [{ id: 'facts', label: '사실' }],
    fields: step.facts.map((f) => ({ name: f.key, value: f.value.replace(/`/g, ''), note: '이 단계의 사실', segment: 'facts' })),
  };
}

function renderRecord(record: DecodedRecord, bar: HTMLElement, fields: HTMLElement, raw: HTMLElement): void {
  const layout = layoutRecord(record);
  const segIndex = new Map(record.segments.map((s, i) => [s.id, i % 6]));
  const total = layout.segmentBytes.reduce((n, s) => n + s.bytes, 0) || 1;

  bar.setAttribute('aria-label', layout.segmentBytes.map((s) => `${s.label} ${s.bytes} bytes`).join(', '));
  bar.replaceChildren(...layout.segmentBytes.filter((s) => s.bytes > 0).map((s) => {
    const band = h('div', { class: `layer-band seg-${segIndex.get(s.id) ?? 0}`, title: `${s.label}: ${s.bytes} bytes` },
      h('span', { class: 'layer-band-label' }, s.label),
      h('span', { class: 'layer-band-size' }, record.wire ? `${s.bytes} B` : ''),
    );
    band.style.setProperty('flex-grow', String(s.bytes / total));
    return band;
  }));

  const rows = record.fields.map((field, i) =>
    h('div', { class: `field-row seg-${segIndex.get(field.segment) ?? 0}`, 'data-field': i, tabindex: layout.fieldRanges[i] ? '0' : undefined },
      h('span', { class: 'field-chip', 'aria-hidden': 'true' }),
      h('code', { class: 'field-name' }, field.name),
      h('code', { class: 'field-value' }, field.value, field.example ? h('span', { class: 'tag tag--eg' }, 'E.G.') : null),
      h('span', { class: 'field-note' }, ...inlineCode(field.note)),
    ),
  );
  fields.replaceChildren(
    h('div', { class: 'field-row field-row--head' }, h('span', {}), h('span', {}, '필드'), h('span', {}, '값'), h('span', {}, '의미')),
    ...rows,
  );

  raw.replaceChildren(...layout.runs.map((run) => {
    // Show CRLF as a faint "\r\n" mark, then break the line.
    const parts = record.raw.slice(run.start, run.end).split('\r\n');
    const children = parts.flatMap((part, i) => (i === 0 ? [part] : [h('span', { class: 'crlf' }, '\\r\\n'), '\n', part]));
    return h('span', {
      class: `raw-run seg-${segIndex.get(run.segment) ?? 0}${run.field !== null ? ' raw-run--field' : ''}`,
      'data-field': run.field ?? undefined,
    }, ...children);
  }));
}
