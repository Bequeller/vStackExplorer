import type { Lesson } from '../lessons/types';
import { h, inlineCode, prose } from './dom';
import { glyph } from './glyphs';

export type OverviewTab = 'overview' | 'selfcheck';

export interface OverviewSheet {
  element: HTMLElement;
  open(tab: OverviewTab): void;
  close(): void;
  readonly isOpen: boolean;
}

/** The lesson-level explanation and the closing self-check, in one sheet over the workspace. */
export function createOverview(lesson: Lesson, onClose: () => void): OverviewSheet {
  let open = false;
  const tabOverview = h('button', { type: 'button', role: 'tab', class: 'sheet-tab', 'data-tab': 'overview' }, '개요');
  const tabCheck = h('button', { type: 'button', role: 'tab', class: 'sheet-tab', 'data-tab': 'selfcheck' }, `셀프 체크 ${lesson.selfCheck.length}`);
  const closeBtn = h('button', { type: 'button', class: 'icon-btn', 'aria-label': '닫기 (Esc)' }, glyph('close'));

  const overviewPane = h('div', { class: 'sheet-pane', role: 'tabpanel' },
    h('p', { class: 'sheet-lead' }, ...inlineCode(lesson.summary)),
    ...lesson.overview.map((section) =>
      h('section', { class: 'sheet-section' },
        h('h3', {}, ...inlineCode(section.title)),
        h('div', { class: 'prose' }, prose(section.body)),
        h('details', { class: 'sources' },
          h('summary', {}, `출처 ${section.sources.length}`),
          h('ul', {}, ...section.sources.map((s) =>
            h('li', {}, h('a', { href: s.url, target: '_blank', rel: 'noopener noreferrer' }, s.label), h('span', { class: 'source-version' }, s.version)),
          )),
        ),
      ),
    ),
  );
  const checkPane = h('div', { class: 'sheet-pane', role: 'tabpanel' },
    h('p', { class: 'sheet-lead' }, '페이지를 보지 않고 소리 내어 답해 보세요. 그 다음 펼쳐서 확인합니다.'),
    h('ol', { class: 'selfcheck' }, ...lesson.selfCheck.map((item) =>
      h('li', {},
        h('details', {},
          h('summary', {}, ...inlineCode(item.question)),
          h('div', { class: 'prose' }, prose(item.answer)),
        ),
      ),
    )),
  );

  const dialog = h('div', { class: 'sheet', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'sheet-title', tabindex: '-1' },
    h('header', { class: 'sheet-head' },
      h('div', {},
        h('p', { class: 'eyebrow' }, 'LESSON OVERVIEW'),
        h('h2', { id: 'sheet-title' }, lesson.title),
      ),
      closeBtn,
    ),
    h('div', { class: 'sheet-tabs', role: 'tablist' }, tabOverview, tabCheck),
    overviewPane,
    checkPane,
  );
  const element = h('div', { class: 'overlay', hidden: true }, dialog);

  const select = (tab: OverviewTab): void => {
    tabOverview.setAttribute('aria-selected', String(tab === 'overview'));
    tabCheck.setAttribute('aria-selected', String(tab === 'selfcheck'));
    overviewPane.hidden = tab !== 'overview';
    checkPane.hidden = tab !== 'selfcheck';
  };
  const hide = (): void => {
    open = false;
    element.hidden = true;
    onClose();
  };

  for (const tab of [tabOverview, tabCheck]) tab.addEventListener('click', () => select(tab.dataset.tab as OverviewTab));
  closeBtn.addEventListener('click', hide);
  element.addEventListener('click', (e) => {
    if (e.target === element) hide();
  });
  element.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      hide();
    }
  });

  return {
    element,
    open: (tab) => {
      select(tab);
      open = true;
      element.hidden = false;
      dialog.focus();
    },
    close: hide,
    get isOpen() {
      return open;
    },
  };
}
