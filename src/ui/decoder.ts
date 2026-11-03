import { formatTime, layoutRecord, type RecordLayout, type TimelineEvent } from '../engine';
import type { DecodedRecord, Lesson } from '../lessons/types';
import { h, inlineCode } from './dom';
import { glyph } from './glyphs';

export interface DecoderOptions {
  lesson: Lesson;
  timeline: TimelineEvent[];
  /** Highest event index that has been played; navigation stays within played events. */
  readonly lastPlayed: number;
  onClose(): void;
}

export interface Decoder {
  element: HTMLElement;
  /** Opens the decoder on step `index`. Does nothing for a step without a record. */
  show(index: number): void;
  close(): void;
  readonly isOpen: boolean;
}

/**
 * Full-screen decoder for one step's record. Wire records (text or binary) show a proportional
 * layer bar, every field with its real name, value, and meaning, and the raw bytes colored per
 * segment; hovering a field highlights its bytes and the other way round. Non-wire records
 * (in-memory structs, Kubernetes objects, CLI output) show the field table only.
 */
export function createDecoder(options: DecoderOptions): Decoder {
  const { lesson, timeline } = options;
  let index = 0;
  let open = false;

  const title = h('h2', { id: 'decoder-title', class: 'decoder-title' });
  const meta = h('p', { class: 'decoder-meta' });
  const prev = h('button', { type: 'button', class: 'icon-btn', 'aria-label': '이전 레코드' }, glyph('prev'));
  const next = h('button', { type: 'button', class: 'icon-btn', 'aria-label': '다음 레코드' }, glyph('next'));
  const close = h('button', { type: 'button', class: 'icon-btn', 'aria-label': '닫기 (Esc)' }, glyph('close'));
  const bar = h('div', { class: 'layer-bar', role: 'img' });
  const fields = h('div', { class: 'decoder-fields' });
  const raw = h('div', { class: 'decoder-raw' });
  const rawCol = h('section', { class: 'decoder-col decoder-col--raw', 'aria-label': '원문 바이트' }, raw);
  const body = h('div', { class: 'decoder-body' }, h('section', { class: 'decoder-col', 'aria-label': '필드' }, fields), rawCol);
  const footer = h('footer', { class: 'decoder-foot' });
  const dialog = h('div', { class: 'decoder', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'decoder-title', tabindex: '-1' },
    h('header', { class: 'decoder-head' },
      h('div', { class: 'decoder-heading' }, title, meta),
      h('div', { class: 'decoder-nav' }, prev, next, close),
    ),
    bar,
    body,
    footer,
  );
  const element = h('div', { class: 'overlay', hidden: true }, dialog);

  /** Played steps that have a record, in order. */
  const decodable = (): number[] =>
    lesson.steps.flatMap((s, i) => (s.record && i <= options.lastPlayed ? [i] : []));

  const hide = (): void => {
    open = false;
    element.hidden = true;
    options.onClose();
  };

  const show = (i: number): void => {
    const record = lesson.steps[i]?.record;
    const event = timeline[i];
    if (!record || !event) return;
    index = i;
    open = true;
    element.hidden = false;
    const list = decodable();
    prev.disabled = list.indexOf(i) <= 0;
    next.disabled = list.indexOf(i) === -1 || list.indexOf(i) >= list.length - 1;
    title.replaceChildren(h('span', { class: 'decoder-no' }, `#${i + 1}`), ` ${record.title}`);
    meta.textContent = [
      formatTime(event.time),
      `${event.source} → ${event.destination}`,
      record.protocol,
      event.bytes !== null ? `${event.bytes} bytes` : '필드 표 (전송 바이트 아님)',
    ].join(' · ');
    const layout = layoutRecord(record);
    renderBar(record, layout, bar);
    renderFields(record, layout, fields);
    rawCol.hidden = record.format === 'fields';
    body.classList.toggle('decoder-body--fields', record.format === 'fields');
    if (record.format !== 'fields') renderRaw(record, layout, raw);
    footer.replaceChildren(
      h('span', { class: 'tag tag--eg' }, 'E.G.'), ' 실행마다 달라지는 값(예시)',
      h('span', { class: 'foot-sep' }),
      record.format === 'text'
        ? '오른쪽은 전송되는 그대로의 바이트입니다. \\r\\n 은 CRLF(2 bytes).'
        : record.format === 'binary'
          ? '오른쪽은 16진수 바이트입니다. 왼쪽 숫자는 구조체 시작부터의 offset.'
          : '메모리 속 구조나 출력이라 바이트 대신 필드만 보여 줍니다.',
    );
    dialog.focus();
  };

  const step = (direction: -1 | 1): void => {
    const list = decodable();
    const at = list.indexOf(index);
    const target = list[at + direction];
    if (target !== undefined) show(target);
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

  prev.addEventListener('click', () => step(-1));
  next.addEventListener('click', () => step(1));
  close.addEventListener('click', hide);
  element.addEventListener('click', (e) => {
    if (e.target === element) hide();
  });
  element.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') hide();
    else if (e.key === 'ArrowLeft') step(-1);
    else if (e.key === 'ArrowRight') step(1);
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

function segmentIndex(record: DecodedRecord): Map<string, number> {
  return new Map(record.segments.map((s, i) => [s.id, i % 6]));
}

function renderBar(record: DecodedRecord, layout: RecordLayout, bar: HTMLElement): void {
  const seg = segmentIndex(record);
  const total = layout.segmentWeights.reduce((n, s) => n + s.weight, 0) || 1;
  const unit = record.format === 'fields' ? '개' : 'B';
  bar.setAttribute('aria-label', layout.segmentWeights.map((s) => `${s.label} ${s.weight}${unit}`).join(', '));
  bar.replaceChildren(...layout.segmentWeights.filter((s) => s.weight > 0).map((s) => {
    const band = h('div', { class: `layer-band seg-${seg.get(s.id) ?? 0}`, title: `${s.label}: ${s.weight}${unit}` },
      h('span', { class: 'layer-band-label' }, s.label),
      h('span', { class: 'layer-band-size' }, `${s.weight} ${unit}`),
    );
    band.style.setProperty('flex-grow', String(s.weight / total));
    return band;
  }));
}

function renderFields(record: DecodedRecord, layout: RecordLayout, root: HTMLElement): void {
  const seg = segmentIndex(record);
  const base = record.format === 'binary' ? record.baseOffset ?? 0 : 0;
  root.replaceChildren(
    h('div', { class: 'field-row field-row--head' }, h('span', {}), h('span', {}, '필드'), h('span', {}, '값'), h('span', {}, '의미')),
    ...record.fields.map((field, i) => {
      const range = layout.fieldRanges[i];
      const where = record.format === 'binary' && range ? `@${base + range[0]} · ${range[1] - range[0]}B` : null;
      return h('div', { class: `field-row seg-${seg.get(field.segment) ?? 0}`, 'data-field': range ? i : undefined, tabindex: range ? '0' : undefined },
        h('span', { class: 'field-chip', 'aria-hidden': 'true' }),
        h('span', { class: 'field-name' }, h('code', {}, field.name), where ? h('span', { class: 'field-where' }, where) : null),
        h('code', { class: 'field-value' }, field.value, field.example ? h('span', { class: 'tag tag--eg' }, 'E.G.') : null),
        h('span', { class: 'field-note' }, ...inlineCode(field.note)),
      );
    }),
  );
}

function renderRaw(record: DecodedRecord, layout: RecordLayout, root: HTMLElement): void {
  const seg = segmentIndex(record);
  const cls = (run: { segment: string; field: number | null }): string =>
    `raw-run seg-${seg.get(run.segment) ?? 0}${run.field !== null ? ' raw-run--field' : ''}`;

  if (record.format === 'text') {
    root.className = 'decoder-raw decoder-raw--text';
    root.replaceChildren(...layout.runs.map((run) => {
      // Show CRLF as a faint "\r\n" mark, then break the line.
      const parts = record.raw.slice(run.start, run.end).split('\r\n');
      const children = parts.flatMap((part, i) => (i === 0 ? [part] : [h('span', { class: 'crlf' }, '\\r\\n'), '\n', part]));
      return h('span', { class: cls(run), 'data-field': run.field ?? undefined }, ...children);
    }));
    return;
  }

  // Binary: a hex dump, 16 bytes per row, with the structure offset on the left.
  root.className = 'decoder-raw decoder-raw--hex';
  const base = record.format === 'binary' ? record.baseOffset ?? 0 : 0;
  const runOf = (byte: number) => layout.runs.find((r) => byte >= r.start && byte < r.end);
  const rows: HTMLElement[] = [];
  for (let start = 0; start < layout.bytes.length; start += 16) {
    const cells = layout.bytes.slice(start, start + 16).map((b, k) => {
      const run = runOf(start + k);
      return h('span', { class: run ? cls(run) : 'raw-run', 'data-field': run?.field ?? undefined }, b);
    });
    rows.push(h('div', { class: 'hex-row' }, h('span', { class: 'hex-offset' }, String(base + start).padStart(4, ' ')), ...cells));
  }
  root.replaceChildren(...rows);
}
