import { h } from './dom';
import { createDrawer } from './drawer';
import { glyph, iconDefs, logo } from './glyphs';
import { renderLesson, type LessonScreen } from './lessonView';
import { doneCount, startedCount } from './progress';
import { loadLesson, topic, topics } from './registry';
import { lessonHref, parseRoute, type Route } from './router';
import { applyStoredTheme, themeToggle } from './theme';

/** Mounts the fixed app shell into `root` and follows the URL hash. */
export function startApp(root: HTMLElement): void {
  applyStoredTheme();
  const drawer = createDrawer();
  const menuBtn = h('button', { type: 'button', class: 'icon-btn menu-btn', 'aria-label': '레슨 목록 열기' }, glyph('menu'));
  const now = h('div', { class: 'now' });
  const phoneCount = h('span', { class: 'phone-count' });
  const learnedPercent = h('span', { class: 'tb-value' });
  const learnedBar = h('div', { class: 'learn-bar', role: 'presentation' });
  const learned = h('span', { class: 'learned' });
  const workspace = h('main', { class: 'workspace' });
  const overlays = h('div', { class: 'overlays' });

  root.replaceChildren(
    h('div', { class: 'app' },
      h('header', { class: 'topbar' },
        menuBtn,
        h('a', { class: 'brand', href: '#', 'aria-label': 'vStackExplorer' },
          logo(),
          h('span', { class: 'brand-text' },
            h('span', { class: 'brand-title' }, 'vStack ', h('em', {}, 'Explorer')),
            h('span', { class: 'brand-tag' }, 'Backend internals, step by step'),
          ),
        ),
        phoneCount,
        now,
        h('div', { class: 'tb-group learn-group' },
          h('div', { class: 'tb-head' }, h('span', { class: 'eyebrow' }, 'Learning progress'), learnedPercent),
          learnedBar,
          learned,
        ),
        h('div', { class: 'topbar-end' }, themeToggle()),
      ),
      drawer.element,
      workspace,
    ),
    overlays,
    iconDefs(),
  );

  const allLessons = topics().flatMap((t) => t.lessons.map((id) => `${t.topic}/${id}`));
  const renderLearned = (): void => {
    const done = doneCount(allLessons);
    const started = startedCount(allLessons);
    const total = allLessons.length;
    learnedPercent.textContent = `${total === 0 ? 0 : Math.round((done / total) * 100)}%`;
    learned.textContent = `${done} / ${total} complete · ${started} in progress`;
    learnedBar.replaceChildren(...allLessons.map((_, i) => h('i', { class: i < done ? 'is-done' : i < done + started ? 'is-started' : undefined })));
  };
  renderLearned();
  window.addEventListener('vse:progress', renderLearned);
  menuBtn.addEventListener('click', () => drawer.open());
  // At 1280px and up the topic list is a permanent column, so an open drawer has nothing left to do.
  const wide = window.matchMedia('(min-width: 1280px)');
  wide.addEventListener('change', (event) => {
    if (event.matches) drawer.close();
  });

  let screen: LessonScreen | null = null;
  let screenKey = '';
  let generation = 0;

  const show = async (route: Route): Promise<void> => {
    if (route.page === 'home') {
      // No separate home page: open the first lesson, and below 1280px the drawer to pick another.
      const first = topics()[0];
      const id = first?.lessons[0];
      if (first && id) {
        history.replaceState(null, '', lessonHref(first.topic, id));
        await show({ page: 'lesson', topic: first.topic, lesson: id, step: 0 });
        if (!wide.matches) drawer.open();
      }
      return;
    }
    const key = `${route.topic}/${route.lesson}`;
    if (screen && key === screenKey) {
      screen.seek(route.step);
      return;
    }
    const current = ++generation;
    const meta = topic(route.topic);
    const lesson = meta && (await loadLesson(route.topic, route.lesson));
    if (current !== generation) return;
    screen?.destroy();
    screen = null;
    screenKey = key;
    if (!meta || !lesson) {
      now.replaceChildren();
      workspace.replaceChildren(h('div', { class: 'not-found' },
        h('h1', {}, '레슨을 찾을 수 없습니다'),
        h('p', {}, h('a', { href: '#' }, '첫 레슨으로 가기')),
      ));
      document.title = '찾을 수 없음 · vStackExplorer';
      return;
    }
    drawer.setCurrent(lesson.topic, lesson.id);
    screen = renderLesson(lesson, meta, Math.min(route.step, lesson.steps.length - 1), { now, phoneCount, workspace, overlays });
    document.title = `${lesson.title} · vStackExplorer`;
  };

  window.addEventListener('hashchange', () => void show(parseRoute(location.hash)));
  void show(parseRoute(location.hash));
}
