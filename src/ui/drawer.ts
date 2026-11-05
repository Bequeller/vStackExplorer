import type { Lesson } from '../lessons/types';
import { h, inlineCode } from './dom';
import { glyph } from './glyphs';
import { progressOf, type Progress } from './progress';
import { loadLesson, topics } from './registry';
import { lessonHref } from './router';

/** Topic list tabs, in docs/PRODUCT.md's first-wave order. Groups without lessons show "준비 중". */
const GROUPS = ['Spring', 'MySQL', 'EKS'] as const;
const PROGRESS_LABEL: Record<Progress, string> = { none: '시작 전', started: '진행 중', done: '완료' };

export interface Drawer {
  element: HTMLElement;
  open(): void;
  close(): void;
  /** Marks the lesson being shown. */
  setCurrent(topic: string, lesson: string): void;
}

/**
 * The topic list: a permanent left column at 1280px and up (CSS), a drawer that slides over from
 * the left below that. Tabs filter by group; the open lesson lists its numbered steps.
 */
export function createDrawer(): Drawer {
  let tab = 'All';
  let current = '';
  let step = 0;
  const list = h('div', { class: 'drawer-list' });
  const tabs = h('div', { class: 'drawer-tabs', role: 'tablist', 'aria-label': '주제 그룹' });
  const title = h('h2', { class: 'panel-title' });
  const closeBtn = h('button', { type: 'button', class: 'icon-btn drawer-close', 'aria-label': '닫기' }, glyph('close'));
  const panel = h('aside', { class: 'drawer', 'aria-label': '레슨 목록', tabindex: '-1' },
    h('div', { class: 'panel-head drawer-head' }, title, closeBtn),
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

  const keepStepInView = (): void => {
    list.querySelector('.step-item[aria-current="step"]')?.scrollIntoView({ block: 'nearest' });
  };

  const render = (): void => {
    title.textContent = tab === 'All' ? 'Backend stack' : tab;
    tabs.replaceChildren(...['All', ...GROUPS].map((name) =>
      h('button', {
        type: 'button',
        role: 'tab',
        class: 'drawer-tab',
        'aria-selected': String(name === tab),
        'data-tab': name,
      }, name === 'All' ? 'All' : name, h('span', { class: 'tab-count' }, String(lessons.filter((l) => name === 'All' || l.group === name).length))),
    ));
    const shown = lessons.filter((l) => tab === 'All' || l.group === tab);
    list.replaceChildren(
      ...(shown.length === 0
        ? [h('p', { class: 'drawer-empty' }, '이 그룹의 레슨은 준비 중입니다.')]
        : shown.map(({ lesson, group }) => {
            const progress = progressOf(lesson.topic, lesson.id);
            const isCurrent = `${lesson.topic}/${lesson.id}` === current;
            return h('div', { class: 'topic' },
              h('a', {
                class: 'topic-row',
                href: lessonHref(lesson.topic, lesson.id),
                'aria-current': isCurrent ? 'page' : undefined,
              },
                h('span', { class: `progress-dot progress-dot--${progress}`, title: PROGRESS_LABEL[progress], 'aria-label': PROGRESS_LABEL[progress] }),
                h('span', { class: 'topic-text' },
                  h('span', { class: 'topic-title' }, lesson.title),
                  h('span', { class: 'topic-sub' }, `${group} · ${lesson.subtitle}`),
                ),
                glyph('next'),
              ),
              isCurrent
                ? h('ol', { class: 'topic-steps', 'aria-label': `${lesson.title} 단계` },
                    ...lesson.steps.map((s, i) =>
                      h('li', {},
                        h('a', {
                          class: 'step-item',
                          href: lessonHref(lesson.topic, lesson.id, i),
                          'aria-current': i === step ? 'step' : undefined,
                          title: s.title.replace(/`/g, ''),
                        },
                          h('span', { class: 'step-no' }, String(i + 1)),
                          h('span', { class: 'step-item-text' },
                            h('span', { class: 'step-item-title' }, ...inlineCode(s.title)),
                            h('span', { class: 'step-item-sub' }, ...inlineCode(s.summary)),
                          ),
                        ),
                      )),
                  )
                : null,
            );
          })),
    );
    keepStepInView();
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
  // The player reports each step it shows; mark it without rebuilding the list (keeps focus).
  window.addEventListener('vse:step', (event) => {
    step = (event as CustomEvent<{ index: number }>).detail.index;
    list.querySelectorAll('.step-item').forEach((item, i) => {
      if (i === step) item.setAttribute('aria-current', 'step');
      else item.removeAttribute('aria-current');
    });
    keepStepInView();
  });
  // The wide layout shows the list at all times, so fill it in before anyone opens it.
  void ready.then(render);

  return {
    element,
    open,
    close,
    setCurrent: (topic, lesson) => {
      current = `${topic}/${lesson}`;
      step = 0;
      render();
    },
  };
}
