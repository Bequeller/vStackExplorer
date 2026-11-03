import { h } from './dom';
import { renderHome } from './home';
import { renderLessonPage, type LessonPage } from './lessonPage';
import { loadLesson, topic } from './registry';
import { parseRoute, type Route } from './router';
import { applyStoredTheme, themeToggle } from './theme';

/** Mounts the app shell into `root` and follows the URL hash. */
export function startApp(root: HTMLElement): void {
  applyStoredTheme();
  const outlet = h('div', { class: 'outlet' });
  root.replaceChildren(
    h('header', { class: 'topbar' },
      h('a', { class: 'brand', href: '#/' }, 'vStackExplorer'),
      themeToggle(),
    ),
    outlet,
    h('footer', { class: 'footer' },
      h('p', {}, '모든 단계의 사실은 공식 문서나 고정된 버전의 소스 코드에서 왔습니다. 각 단계의 출처를 확인하세요.'),
    ),
  );

  let page: LessonPage | null = null;
  let pageKey = '';
  let generation = 0;

  const show = async (route: Route): Promise<void> => {
    const key = route.page === 'lesson' ? `${route.topic}/${route.lesson}` : 'home';
    if (route.page === 'lesson' && page && key === pageKey) {
      page.seek(route.step);
      return;
    }
    const current = ++generation;
    page?.destroy();
    page = null;
    pageKey = key;

    if (route.page === 'home') {
      const home = await renderHome();
      if (current !== generation) return;
      outlet.replaceChildren(home);
      document.title = 'vStackExplorer';
      return;
    }
    const meta = topic(route.topic);
    const lesson = meta && (await loadLesson(route.topic, route.lesson));
    if (current !== generation) return;
    if (!meta || !lesson) {
      outlet.replaceChildren(notFound());
      document.title = '찾을 수 없음 · vStackExplorer';
      return;
    }
    page = renderLessonPage(lesson, meta, Math.min(route.step, lesson.steps.length - 1));
    outlet.replaceChildren(page.element);
    document.title = `${lesson.title} · vStackExplorer`;
    window.scrollTo(0, 0);
  };

  window.addEventListener('hashchange', () => void show(parseRoute(location.hash)));
  void show(parseRoute(location.hash));
}

function notFound(): HTMLElement {
  return h('main', { class: 'home' },
    h('h1', {}, '레슨을 찾을 수 없습니다'),
    h('p', {}, h('a', { href: '#/' }, '전체 주제로 돌아가기')),
  );
}
