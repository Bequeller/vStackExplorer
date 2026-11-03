import { mountLesson, type Player, type PlayerState } from '../engine';
import type { DecodedRecord, Lesson, NodeKind, Step, TokenKind, TopicMeta } from '../lessons/types';
import { h, inlineCode, prose, replace } from './dom';
import { lessonHref } from './router';

const KIND_LABEL: Record<Step['kind'], string> = { move: '이동', mutate: '상태 변경' };

const NODE_KIND_LABEL: Record<NodeKind, string> = {
  client: '클라이언트',
  container: '컨테이너·런타임',
  framework: '프레임워크',
  app: '애플리케이션 코드',
  storage: '저장소',
};

const TOKEN_KIND_LABEL: Record<TokenKind, string> = { request: '요청', response: '응답', call: '호출', data: '데이터' };

export interface LessonPage {
  element: HTMLElement;
  /** Go to a step (0-based), for example when the URL hash changes. */
  seek(index: number): void;
  destroy(): void;
}

const reducedMotion = (): boolean => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function renderLessonPage(lesson: Lesson, meta: TopicMeta, startIndex: number): LessonPage {
  const sceneHost = h('div', { class: 'scene-host' });
  const prevButton = h('button', { type: 'button', class: 'ctl', 'aria-label': '이전 단계 (←)' }, '← 이전');
  const playButton = h('button', { type: 'button', class: 'ctl ctl-play', 'aria-label': '재생 (Space)' }, '재생');
  const nextButton = h('button', { type: 'button', class: 'ctl', 'aria-label': '다음 단계 (→)' }, '다음 →');
  const counter = h('span', { class: 'counter', 'aria-live': 'polite' });
  const progress = h('div', { class: 'progress', 'aria-hidden': 'true' }, h('div', { class: 'progress-bar' }));
  const controls = h('div', { class: 'controls', role: 'group', 'aria-label': '재생 제어' },
    prevButton, playButton, nextButton, counter,
    h('span', { class: 'kbd-hint' }, '← → 단계 · Space 재생/정지'),
  );

  const stepButtons = lesson.steps.map((step, i) =>
    h('button', { type: 'button', class: 'step-btn', 'data-index': i },
      h('span', { class: 'step-no' }, String(i + 1).padStart(2, '0')),
      h('span', { class: 'step-text' },
        h('span', { class: 'step-title' }, ...inlineCode(step.title)),
        h('span', { class: 'step-summary' }, ...inlineCode(step.summary)),
      ),
      h('span', { class: `step-kind step-kind--${step.kind}` }, KIND_LABEL[step.kind]),
    ),
  );
  const stepList = h('ol', { class: 'step-list', 'aria-label': '단계 목록' },
    ...stepButtons.map((b) => h('li', {}, b)),
  );

  const detail = h('section', { class: 'detail', 'aria-live': 'polite', 'aria-labelledby': 'detail-title' });
  const record = h('section', { class: 'record', 'aria-label': '디코딩된 레코드' });
  const selfCheck = renderSelfCheck(lesson);

  const element = h('main', { class: 'lesson-page' },
    h('section', { class: 'lesson-head' },
      h('p', { class: 'crumbs' }, h('a', { href: '#/' }, '전체 주제'), ' / ', meta.title),
      h('h1', {}, lesson.title),
      h('p', { class: 'lesson-summary' }, ...inlineCode(lesson.summary)),
      h('ul', { class: 'versions', 'aria-label': '기준 버전' },
        ...Object.entries(lesson.versions).map(([name, version]) => h('li', {}, `${name} ${version}`)),
      ),
    ),
    h('div', { class: 'lesson-grid' },
      h('div', { class: 'col-main' },
        h('div', { class: 'stage' }, sceneHost, renderLegend(lesson), progress, controls),
        record,
      ),
      h('div', { class: 'col-side' },
        detail,
        h('div', { class: 'steps-panel' }, h('h2', { class: 'panel-heading' }, '단계'), stepList),
      ),
    ),
    selfCheck,
  );

  const player: Player = mountLesson(sceneHost, lesson, startIndex, { reducedMotion });
  let shownIndex = -1;

  const onState = (state: PlayerState): void => {
    playButton.textContent = state.playing ? '정지' : '재생';
    playButton.setAttribute('aria-label', state.playing ? '정지 (Space)' : '재생 (Space)');
    playButton.setAttribute('aria-pressed', String(state.playing));
    prevButton.disabled = state.index === 0;
    nextButton.disabled = state.index === state.total - 1;
    counter.textContent = `${state.index + 1} / ${state.total}`;
    progress.firstElementChild?.classList.toggle('is-full', state.index === state.total - 1);
    progress.style.setProperty('--progress', String((state.index + 1) / state.total));
    if (state.index === shownIndex) return;
    shownIndex = state.index;
    const step = lesson.steps[state.index];
    if (!step) return;
    stepButtons.forEach((b, i) => {
      b.classList.toggle('is-current', i === state.index);
      b.classList.toggle('is-done', i < state.index);
      if (i === state.index) b.setAttribute('aria-current', 'step');
      else b.removeAttribute('aria-current');
    });
    keepInView(stepList, stepButtons[state.index]);
    renderDetail(detail, step, state.index, state.total, () => selfCheck.scrollIntoView({ block: 'start' }));
    renderRecord(record, step.record);
    history.replaceState(null, '', lessonHref(lesson.topic, lesson.id, state.index));
  };
  const unsubscribe = player.subscribe(onState);

  prevButton.addEventListener('click', () => player.previous());
  nextButton.addEventListener('click', () => player.next());
  playButton.addEventListener('click', () => player.toggle());
  stepList.addEventListener('click', (event) => {
    const button = (event.target as Element).closest<HTMLButtonElement>('.step-btn');
    if (button) player.seek(Number(button.dataset.index));
  });

  const onKey = (event: KeyboardEvent): void => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const target = event.target as HTMLElement | null;
    if (target?.closest('input, textarea, select, [contenteditable="true"]')) return;
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      player.next();
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      player.previous();
    } else if (event.key === ' ' && !target?.closest('button, a, summary')) {
      event.preventDefault();
      player.toggle();
    }
  };
  document.addEventListener('keydown', onKey);

  return {
    element,
    seek: (index) => {
      if (index !== player.state.index) player.seek(index);
    },
    destroy: () => {
      document.removeEventListener('keydown', onKey);
      unsubscribe();
      player.destroy();
    },
  };
}

/** Scrolls only the step list (never the page) so the current step is visible. */
function keepInView(list: HTMLElement, item: HTMLElement | undefined): void {
  if (!item || list.scrollHeight <= list.clientHeight) return;
  const top = item.offsetTop - list.offsetTop;
  if (top < list.scrollTop) list.scrollTop = top - 6;
  else if (top + item.offsetHeight > list.scrollTop + list.clientHeight) list.scrollTop = top + item.offsetHeight - list.clientHeight + 6;
}

function renderDetail(root: HTMLElement, step: Step, index: number, total: number, toSelfCheck: () => void): void {
  replace(root, 
    h('p', { class: 'detail-meta' },
      h('span', { class: `step-kind step-kind--${step.kind}` }, KIND_LABEL[step.kind]),
      ` 단계 ${index + 1} / ${total}`,
    ),
    h('h2', { id: 'detail-title' }, ...inlineCode(step.title)),
    h('div', { class: 'prose' }, prose(step.detail)),
    step.facts.length > 0 &&
      h('table', { class: 'facts' },
        h('caption', {}, '사실'),
        h('tbody', {}, ...step.facts.map((f) => h('tr', {}, h('th', { scope: 'row' }, f.key), h('td', {}, ...inlineCode(f.value))))),
      ),
    h('div', { class: 'sources' },
      h('h3', {}, '출처'),
      h('ul', {}, ...step.sources.map((s) =>
        h('li', {},
          h('a', { href: s.url, target: '_blank', rel: 'noopener noreferrer' }, s.label),
          h('span', { class: 'source-version' }, s.version),
        ),
      )),
    ),
    index === total - 1 &&
      h('p', { class: 'to-selfcheck' }, h('button', { type: 'button', class: 'ctl', 'data-action': 'selfcheck' }, '셀프 체크로 →')),
  );
  root.querySelector('[data-action="selfcheck"]')?.addEventListener('click', toSelfCheck);
}

function renderRecord(root: HTMLElement, record: DecodedRecord | undefined): void {
  if (!record) {
    replace(root, 
      h('h2', { class: 'panel-heading' }, '디코딩'),
      h('p', { class: 'record-empty' }, '이 단계에는 새로 디코딩할 레코드가 없습니다.'),
    );
    return;
  }
  replace(root, 
    h('h2', { class: 'panel-heading' }, `디코딩 · ${record.title}`),
    record.raw ? h('pre', { class: 'record-raw' }, h('code', {}, record.raw)) : null,
    h('table', { class: 'record-fields' },
      h('thead', {}, h('tr', {}, h('th', { scope: 'col' }, '필드'), h('th', { scope: 'col' }, '값'), h('th', { scope: 'col' }, '설명'))),
      h('tbody', {}, ...record.fields.map((f) =>
        h('tr', {},
          h('th', { scope: 'row' }, h('code', {}, f.name)),
          h('td', {}, h('code', {}, f.value)),
          h('td', {}, ...inlineCode(f.note ?? '')),
        ),
      )),
    ),
  );
}

/** Colors carry meaning, so every color on the scene gets a text label. */
function renderLegend(lesson: Lesson): HTMLElement {
  const nodeKinds = [...new Set(lesson.nodes.map((n) => n.kind))];
  const tokenKinds = [...new Set(lesson.steps.flatMap((s) => (s.kind === 'move' ? [s.token.kind] : [])))];
  return h('ul', { class: 'legend', 'aria-label': '색 범례' },
    ...nodeKinds.map((k) => h('li', { class: `node--${k}` }, h('span', { class: 'swatch' }), NODE_KIND_LABEL[k])),
    ...tokenKinds.map((k) => h('li', { class: `token--${k}` }, h('span', { class: 'swatch swatch--dot' }), `${TOKEN_KIND_LABEL[k]} 토큰`)),
  );
}

function renderSelfCheck(lesson: Lesson): HTMLElement {
  return h('section', { class: 'selfcheck', id: 'selfcheck', 'aria-labelledby': 'selfcheck-title' },
    h('h2', { id: 'selfcheck-title' }, '셀프 체크'),
    h('p', { class: 'selfcheck-intro' }, '페이지를 보지 않고 소리 내어 답해 보세요. 그 다음 펼쳐서 확인합니다.'),
    h('ol', {}, ...lesson.selfCheck.map((item) =>
      h('li', {},
        h('details', {},
          h('summary', {}, ...inlineCode(item.question)),
          h('div', { class: 'prose' }, prose(item.answer)),
        ),
      ),
    )),
  );
}
