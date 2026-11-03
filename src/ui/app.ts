import { h } from './dom';
import { createDrawer } from './drawer';
import { glyph } from './glyphs';
import { renderLesson, type LessonScreen } from './lessonView';
import { doneCount } from './progress';
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
  const learned = h('span', { class: 'learned' });
  const workspace = h('main', { class: 'workspace' });
  const overlays = h('div', { class: 'overlays' });

  root.replaceChildren(
    h('div', { class: 'app' },
      h('header', { class: 'topbar' },
        menuBtn,
        h('a', { class: 'brand', href: '#/' }, 'vStackExplorer'),
        phoneCount,
        now,
        h('div', { class: 'topbar-end' }, learned, themeToggle()),
      ),
      workspace,
    ),
    overlays,
    drawer.element,
  );

  const allLessons = topics().flatMap((t) => t.lessons.map((id) => `${t.topic}/${id}`));
  const renderLearned = (): void => {
    learned.textContent = `학습 ${doneCount(allLessons)}/${allLessons.length} 완료`;
  };
  renderLearned();
  window.addEventListener('vse:progress', renderLearned);
  menuBtn.addEventListener('click', () => drawer.open());

  let screen: LessonScreen | null = null;
  let screenKey = '';
  let generation = 0;

  const show = async (route: Route): Promise<void> => {
    if (route.page === 'home') {
      // No separate home page: open the first lesson and the drawer to pick another.
      const first = topics()[0];
      const id = first?.lessons[0];
      if (first && id) {
        history.replaceState(null, '', lessonHref(first.topic, id));
        await show({ page: 'lesson', topic: first.topic, lesson: id, step: 0 });
        drawer.open();
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
        h('p', {}, h('a', { href: '#/' }, '첫 레슨으로 가기')),
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
