import { changedRows, formatTime, mountLesson, speeds, type EventKind, type LessonView, type PlacedLesson, type PlayerState, type SceneMode, type TimelineEvent } from '../engine';
import type { Lesson, NodeKind, StateView, Step, TopicMeta } from '../lessons/types';
import { createDecoder } from './decoder';
import { h, inlineCode, prose, replace } from './dom';
import { glyph } from './glyphs';
import { createOverview } from './overview';
import { markProgress } from './progress';
import { lessonHref } from './router';

export interface ShellSlots {
  /** Top bar area for "now learning", the step bar, and the layer selector. */
  now: HTMLElement;
  /** Compact step counter shown in the top bar on phones. */
  phoneCount: HTMLElement;
  workspace: HTMLElement;
  overlays: HTMLElement;
}

export interface LessonScreen {
  seek(index: number): void;
  destroy(): void;
}

const NODE_KIND_LABEL: Record<NodeKind, string> = {
  client: '클라이언트',
  container: '컨테이너',
  framework: '프레임워크',
  app: '앱 코드',
  storage: '저장소',
  cloud: '클라우드 서비스',
};
const PATH_LABEL = { critical: '핵심 경로', side: '곁가지' } as const;
const EVENT_KIND_LABEL: Record<EventKind, string> = { request: '요청', response: '응답', call: '호출', data: '데이터', state: '상태 변경' };

const reducedMotion = (): boolean => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** The lesson workspace: scene, step details, event log, decoder, and player controls. */
export function renderLesson(lesson: Lesson, meta: TopicMeta, startIndex: number, slots: ShellSlots): LessonScreen {
  const total = lesson.steps.length;

  // Top bar: now learning, segmented step bar, layer selector.
  const stepCount = h('span', { class: 'now-count' });
  const segButtons = lesson.steps.map((step, i) =>
    h('button', { type: 'button', class: 'seg', 'data-index': i, 'aria-label': `단계 ${i + 1}: ${step.title.replace(/`/g, '')}`, title: `${i + 1}. ${step.title.replace(/`/g, '')}` }),
  );
  const segbar = h('div', { class: 'segbar', role: 'group', 'aria-label': '단계 진행' }, ...segButtons);
  const layerButtons = lesson.layers.map((layer) =>
    h('button', { type: 'button', class: 'layer-btn', 'data-layer': layer.id, 'aria-pressed': 'false' }, layer.label),
  );
  slots.now.replaceChildren(
    h('div', { class: 'now-learning' },
      h('span', { class: 'eyebrow' }, 'NOW LEARNING'),
      h('span', { class: 'now-title', title: lesson.title }, `${meta.title} · ${lesson.subtitle}`),
    ),
    h('div', { class: 'now-step' }, stepCount, segbar),
    h('div', { class: 'layer-select', role: 'group', 'aria-label': '레이어' }, ...layerButtons),
  );

  // Scene panel with the network/sequence toggle and the legend.
  const sceneHost = h('div', { class: 'scene-host' });
  const viewNetwork = h('button', { type: 'button', class: 'toggle-btn', 'aria-pressed': 'true', 'data-mode': 'network' }, glyph('network'), '네트워크');
  const viewSequence = h('button', { type: 'button', class: 'toggle-btn', 'aria-pressed': 'false', 'data-mode': 'sequence' }, glyph('sequence'), '시퀀스');
  const overviewBtn = h('button', { type: 'button', class: 'chip-btn' }, glyph('book'), '개요');
  const replayBadge = h('span', { class: 'replay-badge', hidden: true }, '핵심 경로 리플레이');
  const legendHost = h('div', { class: 'legend-host' });
  const scenePanel = h('section', { class: 'panel scene-panel', 'aria-label': '장면' },
    h('div', { class: 'scene-toolbar' },
      h('div', { class: 'view-toggle', role: 'group', 'aria-label': '보기' }, viewNetwork, viewSequence),
      legendHost,
      replayBadge,
      overviewBtn,
    ),
    sceneHost,
  );

  // Step details.
  const details = h('aside', { class: 'panel details', 'aria-live': 'polite', 'aria-label': '단계 설명' });

  // Event log.
  const timelineRows: HTMLTableRowElement[] = [];
  const logBody = h('tbody', {});
  const logScroll = h('div', { class: 'log-scroll' },
    h('table', { class: 'log' },
      h('thead', {}, h('tr', {},
        ...['No.', '시각', '출발', '도착', '레이어', '정보', '크기'].map((c) => h('th', { scope: 'col' }, c)),
      )),
      logBody,
    ),
  );
  const logCount = h('span', { class: 'log-count' });
  const logPanel = h('section', { class: 'panel log-panel', 'aria-label': '이벤트 로그' },
    h('header', { class: 'log-head' },
      h('h2', {}, '이벤트 로그'),
      logCount,
      renderEventLegend(lesson),
    ),
    logScroll,
  );

  // Player controls.
  const speedButtons = speeds.map((s) => h('button', { type: 'button', class: 'speed-btn', 'data-speed': s, 'aria-pressed': String(s === 1) }, `${s}×`));
  const restartBtn = h('button', { type: 'button', class: 'icon-btn', 'aria-label': '처음부터' , title: '처음부터' }, glyph('restart'));
  const prevBtn = h('button', { type: 'button', class: 'icon-btn', 'aria-label': '이전 단계 (←)', title: '이전 (←)' }, glyph('prev'));
  const playBtn = h('button', { type: 'button', class: 'play-btn', 'aria-label': '재생 (Space)' }, glyph('play'));
  const stepBtn = h('button', { type: 'button', class: 'icon-btn', 'aria-label': '다음 단계 (→)', title: '다음 (→)' }, glyph('step'));
  const replayBtn = h('button', { type: 'button', class: 'chip-btn replay-btn', 'aria-pressed': 'false', title: '핵심 경로를 멈춤 없이 한 번 재생', 'aria-label': '핵심 경로 리플레이' }, glyph('replay'), h('span', { class: 'btn-text' }, '리플레이'));
  const counter = h('span', { class: 'player-count' });
  const player = h('div', { class: 'player', role: 'group', 'aria-label': '재생 제어' },
    h('div', { class: 'speed', role: 'group', 'aria-label': '속도' }, ...speedButtons),
    h('div', { class: 'player-main' }, restartBtn, prevBtn, playBtn, stepBtn),
    counter,
    replayBtn,
    h('span', { class: 'kbd-hint' }, '← → 단계 · Space 재생'),
  );

  slots.workspace.replaceChildren(scenePanel, details, logPanel, player);

  const view: LessonView = mountLesson(sceneHost, lesson, meta, startIndex, { reducedMotion });
  const { timeline, placed } = view;
  legendHost.replaceWith(renderNodeLegend(placed));
  timeline.forEach((event) => {
    const row = renderLogRow(event, total);
    timelineRows.push(row);
    logBody.appendChild(row);
  });

  let lastPlayed = startIndex;
  const decoder = createDecoder({ lesson, timeline, get lastPlayed() { return lastPlayed; }, onClose: () => logScroll.focus() });
  const overview = createOverview(lesson, () => overviewBtn.focus());
  slots.overlays.replaceChildren(decoder.element, overview.element);

  markProgress(lesson.topic, lesson.id, 'started');
  let shown = -1;

  const onState = (state: PlayerState): void => {
    const { index } = state;
    lastPlayed = Math.max(lastPlayed, index);
    playBtn.replaceChildren(glyph(state.playing ? 'pause' : 'play'));
    playBtn.setAttribute('aria-label', state.playing ? '일시정지 (Space)' : '재생 (Space)');
    playBtn.setAttribute('aria-pressed', String(state.playing));
    prevBtn.disabled = index === 0;
    stepBtn.disabled = index === total - 1;
    for (const b of speedButtons) b.setAttribute('aria-pressed', String(Number(b.dataset.speed) === state.speed));
    replayBtn.setAttribute('aria-pressed', String(state.replaying));
    replayBadge.hidden = !state.replaying;
    slots.workspace.classList.toggle('is-replaying', state.replaying);
    const label = `${String(index + 1).padStart(2, '0')} / ${String(total).padStart(2, '0')}`;
    counter.textContent = label;
    stepCount.textContent = `STEP ${label}`;
    slots.phoneCount.textContent = `${index + 1}/${total}`;
    if (index === shown) return;
    shown = index;

    const step = lesson.steps[index];
    if (!step) return;
    segButtons.forEach((b, i) => {
      b.classList.toggle('is-done', i < index);
      b.classList.toggle('is-current', i === index);
      if (i === index) b.setAttribute('aria-current', 'step');
      else b.removeAttribute('aria-current');
    });
    for (const b of layerButtons) b.setAttribute('aria-pressed', String(b.dataset.layer === step.layer));

    timelineRows.forEach((row, i) => {
      row.hidden = i > lastPlayed;
      row.classList.toggle('is-current', i === index);
    });
    logCount.textContent = `${lastPlayed + 1} / ${total} 이벤트`;
    keepRowInView(logScroll, timelineRows[index]);

    const before = index === 0 ? undefined : view.player.statesAfter(index - 1);
    const after = view.player.statesAfter(index);
    renderDetails(details, placed, step, index, timeline[index], {
      before: step.kind === 'mutate' ? before?.[step.node] ?? lesson.states.find((s) => s.node === step.node)?.view : undefined,
      after: step.kind === 'mutate' ? after[step.node] : undefined,
      stateTitle: step.kind === 'mutate' ? lesson.states.find((s) => s.node === step.node)?.title : undefined,
    });
    history.replaceState(null, '', lessonHref(lesson.topic, lesson.id, index));
    if (index === total - 1) markProgress(lesson.topic, lesson.id, 'done');
  };
  const unsubscribe = view.player.subscribe(onState);

  // Wiring.
  restartBtn.addEventListener('click', () => view.player.restart());
  prevBtn.addEventListener('click', () => view.player.previous());
  stepBtn.addEventListener('click', () => view.player.next());
  playBtn.addEventListener('click', () => view.player.toggle());
  replayBtn.addEventListener('click', () => (view.player.state.replaying ? view.player.pause() : view.player.replay()));
  for (const b of speedButtons) b.addEventListener('click', () => view.player.setSpeed(Number(b.dataset.speed)));
  segbar.addEventListener('click', (e) => {
    const b = (e.target as Element).closest<HTMLElement>('[data-index]');
    if (b) view.player.seek(Number(b.dataset.index));
  });
  for (const b of layerButtons) {
    b.addEventListener('click', () => {
      const first = lesson.steps.findIndex((s) => s.layer === b.dataset.layer);
      if (first >= 0) view.player.seek(first);
    });
  }
  const setMode = (mode: SceneMode): void => {
    viewNetwork.setAttribute('aria-pressed', String(mode === 'network'));
    viewSequence.setAttribute('aria-pressed', String(mode === 'sequence'));
    view.setMode(mode);
  };
  viewNetwork.addEventListener('click', () => setMode('network'));
  viewSequence.addEventListener('click', () => setMode('sequence'));
  overviewBtn.addEventListener('click', () => overview.open('overview'));
  // A row with a record opens the decoder; a row without one jumps to that step.
  const openRow = (row: HTMLElement): void => {
    const i = Number(row.dataset.index);
    if (lesson.steps[i]?.record) decoder.show(i);
    else view.player.seek(i);
  };
  logBody.addEventListener('click', (e) => {
    const row = (e.target as Element).closest<HTMLElement>('[data-index]');
    if (row) openRow(row);
  });
  logBody.addEventListener('keydown', (e) => {
    const row = (e.target as Element).closest<HTMLElement>('[data-index]');
    if (row && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      openRow(row);
    }
  });
  details.addEventListener('click', (e) => {
    const action = (e.target as Element).closest<HTMLElement>('[data-action]')?.dataset.action;
    if (action === 'decode') decoder.show(view.player.state.index);
    if (action === 'overview') overview.open('overview');
    if (action === 'selfcheck') overview.open('selfcheck');
    if (action === 'replay') view.player.replay();
  });

  const onKey = (event: KeyboardEvent): void => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    if (decoder.isOpen || overview.isOpen || document.body.classList.contains('has-drawer')) return;
    const target = event.target as HTMLElement | null;
    if (target?.closest('input, textarea, select, [contenteditable="true"]')) return;
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      view.player.next();
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      view.player.previous();
    } else if (event.key === ' ' && !target?.closest('button, a, summary, [data-index]')) {
      event.preventDefault();
      view.player.toggle();
    }
  };
  document.addEventListener('keydown', onKey);

  return {
    seek: (index) => {
      if (index !== view.player.state.index) view.player.seek(index);
    },
    destroy: () => {
      document.removeEventListener('keydown', onKey);
      unsubscribe();
      view.destroy();
      slots.overlays.replaceChildren();
    },
  };
}

interface StateChange {
  before: StateView | undefined;
  after: StateView | undefined;
  stateTitle: string | undefined;
}

function renderDetails(root: HTMLElement, lesson: PlacedLesson, step: Step, index: number, event: TimelineEvent | undefined, state: StateChange): void {
  const total = lesson.steps.length;
  const layer = lesson.layers.find((l) => l.id === step.layer)?.label ?? step.layer;
  const kind: EventKind = step.kind === 'move' ? step.token.kind : 'state';
  const lines = step.lines ?? (step.record?.format === 'text'
    ? step.record.raw.split('\r\n').join('\n').split('\n').filter(Boolean).slice(0, 3)
    : [step.kind === 'move' ? step.token.label : step.title]);
  const size = event?.bytes !== null && event?.bytes !== undefined ? `${event.bytes} bytes` : step.record ? '필드 표' : '레코드 없음';
  const isLast = index === total - 1;

  replace(root,
    h('p', { class: 'step-eyebrow' },
      h('span', {}, `STEP ${index + 1} OF ${total}`),
      h('span', { class: 'chips' },
        h('span', { class: `path-chip path-chip--${step.path}` }, PATH_LABEL[step.path]),
        h('span', { class: 'layer-chip' }, layer),
      ),
    ),
    h('h1', { class: 'step-title' }, ...inlineCode(step.title)),
    h('p', { class: 'step-subtitle' }, ...inlineCode(step.summary)),
    h('div', { class: 'prose step-prose' }, prose(step.detail)),
    h('table', { class: 'facts' },
      h('tbody', {}, ...step.facts.map((f) => h('tr', {}, h('th', { scope: 'row' }, f.key), h('td', {}, ...inlineCode(f.value))))),
    ),
    state.after ? renderState(state.stateTitle ?? '상태', state.before, state.after) : null,
    h('div', { class: `msg-card kind-${kind}` },
      h('div', { class: 'msg-head' },
        h('span', { class: 'kind-badge' }, EVENT_KIND_LABEL[kind]),
        h('span', { class: 'msg-route' }, !event ? '' : step.kind === 'mutate' ? `${event.source} · 내부 상태` : `${event.source} → ${event.destination}`),
      ),
      h('pre', { class: 'msg-lines' }, h('code', {}, lines.join('\n'))),
      h('div', { class: 'msg-foot' },
        h('span', {}, `event ${index + 1} of ${total} · ${event?.protocol ?? layer} · ${size}`),
        step.record ? h('button', { type: 'button', class: 'link-btn', 'data-action': 'decode' }, glyph('decode'), '디코드') : null,
      ),
    ),
    h('details', { class: 'sources' },
      h('summary', {}, `출처 ${step.sources.length}`),
      h('ul', {}, ...step.sources.map((s) =>
        h('li', {}, h('a', { href: s.url, target: '_blank', rel: 'noopener noreferrer' }, s.label), h('span', { class: 'source-version' }, s.version)),
      )),
    ),
    h('div', { class: 'details-actions' },
      h('button', { type: 'button', class: 'chip-btn', 'data-action': 'overview' }, glyph('book'), '개요'),
      isLast ? h('button', { type: 'button', class: 'chip-btn chip-btn--accent', 'data-action': 'replay' }, glyph('replay'), '핵심 경로 리플레이') : null,
      isLast ? h('button', { type: 'button', class: 'chip-btn chip-btn--accent', 'data-action': 'selfcheck' }, `셀프 체크 ${lesson.selfCheck.length}문항 →`) : null,
    ),
  );
  root.scrollTop = 0;
}

function renderState(title: string, before: StateView | undefined, after: StateView): HTMLElement {
  const changed = new Set(changedRows(before, after));
  const rows = after.type === 'table' ? after.rows : after.items.map((i) => [i]);
  const oldRows = before ? (before.type === 'table' ? before.rows : before.items.map((i) => [i])) : [];
  return h('div', { class: 'state-card' },
    h('p', { class: 'state-title' }, h('span', { class: 'badge-dot' }), `상태 변경 · ${title}`),
    h('table', { class: 'state-table' },
      after.type === 'table' ? h('thead', {}, h('tr', {}, ...after.columns.map((c) => h('th', { scope: 'col' }, c)))) : null,
      h('tbody', {}, ...rows.map((row, r) =>
        h('tr', { class: changed.has(r) ? 'is-changed' : undefined },
          ...row.map((cell, c) => {
            const old = oldRows[r]?.[c];
            return h('td', {}, changed.has(r) && old !== undefined && old !== cell ? h('del', {}, old) : null, cell);
          }),
        ),
      )),
    ),
  );
}

function renderLogRow(event: TimelineEvent, total: number): HTMLTableRowElement {
  return h('tr', {
    'data-index': event.index,
    class: `log-row--${event.path}${event.decodable ? ' log-row--decodable' : ''}`,
    tabindex: '0',
    hidden: true,
    title: event.decodable ? '클릭하면 디코더가 열립니다' : '클릭하면 이 단계로 이동합니다 (디코딩할 레코드 없음)',
  },
    h('td', { class: 'log-no' }, h('span', { class: `kind-dot kind-${event.kind}`, 'aria-label': EVENT_KIND_LABEL[event.kind] }), String(event.index + 1).padStart(String(total).length, '0')),
    h('td', { class: 'log-time' }, formatTime(event.time)),
    h('td', {}, event.source),
    h('td', {}, event.destination),
    h('td', { class: 'log-layer' }, event.layer),
    h('td', { class: 'log-info' }, ...inlineCode(event.info)),
    h('td', { class: 'log-size' }, event.bytes !== null ? `${event.bytes} B` : event.decodable ? '필드' : '—'),
  );
}

function renderNodeLegend(lesson: PlacedLesson): HTMLElement {
  const kinds = [...new Set(lesson.nodes.map((n) => n.kind))];
  return h('ul', { class: 'legend', 'aria-label': '노드 색 범례' },
    ...kinds.map((k) => h('li', { class: `node--${k}` }, h('span', { class: 'swatch' }), NODE_KIND_LABEL[k])),
  );
}

function renderEventLegend(lesson: Lesson): HTMLElement {
  const kinds = [...new Set(lesson.steps.map((s): EventKind => (s.kind === 'move' ? s.token.kind : 'state')))];
  return h('ul', { class: 'legend legend--events', 'aria-label': '이벤트 색 범례' },
    ...kinds.map((k) => h('li', {}, h('span', { class: `kind-dot kind-${k}` }), EVENT_KIND_LABEL[k])),
  );
}

/** Scrolls only the log (never the page) so the row is visible. */
function keepRowInView(scroller: HTMLElement, row: HTMLElement | undefined): void {
  if (!row) return;
  const top = row.offsetTop;
  const head = 30;
  if (top - head < scroller.scrollTop) scroller.scrollTop = top - head;
  else if (top + row.offsetHeight > scroller.scrollTop + scroller.clientHeight) scroller.scrollTop = top + row.offsetHeight - scroller.clientHeight;
}
