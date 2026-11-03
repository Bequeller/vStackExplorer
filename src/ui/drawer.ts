import type { Lesson } from '../lessons/types';
import { h } from './dom';
import { glyph } from './glyphs';
import { progressOf, type Progress } from './progress';
import { loadLesson, topics } from './registry';
import { lessonHref } from './router';

/** Drawer tabs, in docs/PRODUCT.md's first-wave order. Groups without lessons show "준비 중". */
const GROUPS = ['Spring', 'MySQL', 'EKS'] as const;
const PROGRESS_LABEL: Record<Progress, string> = { none: '시작 전', started: '진행 중', done: '완료' };

export interface Drawer {
  element: HTMLElement;
  open(): void;
  close(): void;
  /** Marks the lesson being shown. */
  setCurrent(topic: string, lesson: string): void;
}

/** The topic drawer: slides over from the left, tabs filter by group. */
export function createDrawer(): Drawer {
  let tab = 'All';
  let current = '';
  const list = h('div', { class: 'drawer-list' });
  const tabs = h('div', { class: 'drawer-tabs', role: 'tablist', 'aria-label': '주제 그룹' });
  const closeBtn = h('button', { type: 'button', class: 'icon-btn', 'aria-label': '닫기' }, glyph('close'));
  const panel = h('aside', { class: 'drawer', 'aria-label': '레슨 목록', tabindex: '-1' },
    h('div', { class: 'drawer-head' }, h('h2', {}, '레슨'), closeBtn),
    tabs,
    list,
  );
  const scrim = h('div', { class: 'drawer-scrim' });
  const element = h('div', { class: 'drawer-root', hidden: true }, scrim, panel);

  const lessons: { lesson: Lesson; group: string }[] = [];
  const ready = (async () => {
    for (const meta of topics()) {
      for (const id of meta.lessons) {
        const lesson = await loadLesson(meta.topic, id);
        if (lesson) lessons.push({ lesson, group: meta.group });
      }
    }
  })();

  const render = (): void => {
    tabs.replaceChildren(...['All', ...GROUPS].map((name) =>
      h('button', {
        type: 'button',
        role: 'tab',
        class: 'drawer-tab',
        'aria-selected': String(name === tab),
        'data-tab': name,
      }, name === 'All' ? '전체' : name),
    ));
    const shown = lessons.filter((l) => tab === 'All' || l.group === tab);
    list.replaceChildren(
      ...(shown.length === 0
        ? [h('p', { class: 'drawer-empty' }, '이 그룹의 레슨은 준비 중입니다.')]
        : shown.map(({ lesson, group }) => {
            const progress = progressOf(lesson.topic, lesson.id);
            const key = `${lesson.topic}/${lesson.id}`;
            return h('a', {
              class: 'drawer-item',
              href: lessonHref(lesson.topic, lesson.id),
              'aria-current': key === current ? 'page' : undefined,
            },
              h('span', { class: `progress-dot progress-dot--${progress}`, title: PROGRESS_LABEL[progress], 'aria-label': PROGRESS_LABEL[progress] }),
              h('span', { class: 'drawer-item-text' },
                h('span', { class: 'drawer-item-title' }, lesson.title),
                h('span', { class: 'drawer-item-sub' }, `${group} · ${lesson.subtitle}`),
              ),
            );
          })),
    );
  };

  const onKey = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') close();
  };
  const close = (): void => {
    element.hidden = true;
    document.body.classList.remove('has-drawer');
    document.removeEventListener('keydown', onKey);
  };
  const open = (): void => {
    void ready.then(render);
    render();
    element.hidden = false;
    document.body.classList.add('has-drawer');
    document.addEventListener('keydown', onKey);
    panel.focus();
  };

  tabs.addEventListener('click', (event) => {
    const button = (event.target as Element).closest<HTMLButtonElement>('[data-tab]');
    if (!button) return;
    tab = button.dataset.tab ?? 'All';
    render();
  });
  scrim.addEventListener('click', close);
  closeBtn.addEventListener('click', close);
  list.addEventListener('click', (event) => {
    if ((event.target as Element).closest('a')) close();
  });
  window.addEventListener('vse:progress', render);

  return {
    element,
    open,
    close,
    setCurrent: (topic, lesson) => {
      current = `${topic}/${lesson}`;
      render();
    },
  };
}
