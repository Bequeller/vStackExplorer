import type { Lesson, TopicMeta } from '../lessons/types';
import { h, inlineCode } from './dom';
import { loadLesson, topics } from './registry';
import { lessonHref } from './router';

export async function renderHome(): Promise<HTMLElement> {
  const sections = await Promise.all(topics().map(renderTopic));
  return h('main', { class: 'home' },
    h('section', { class: 'home-head' },
      h('h1', {}, 'vStackExplorer'),
      h('p', {}, '백엔드 내부 동작을 단계별 애니메이션과 출처가 달린 사실로 살펴봅니다. 각 레슨은 셀프 체크로 끝납니다.'),
    ),
    ...sections,
  );
}

async function renderTopic(meta: TopicMeta): Promise<HTMLElement> {
  const lessons = (await Promise.all(meta.lessons.map((id) => loadLesson(meta.topic, id))))
    .filter((l): l is Lesson => l !== undefined);
  return h('section', { class: 'topic' },
    h('h2', {}, meta.title),
    h('p', { class: 'topic-summary' }, ...inlineCode(meta.summary)),
    h('ul', { class: 'versions' }, ...Object.entries(meta.versions).map(([n, v]) => h('li', {}, `${n} ${v}`))),
    h('ul', { class: 'lesson-cards' }, ...lessons.map((lesson) =>
      h('li', {},
        h('a', { class: 'lesson-card', href: lessonHref(lesson.topic, lesson.id) },
          h('span', { class: 'lesson-card-title' }, lesson.title),
          h('span', { class: 'lesson-card-summary' }, ...inlineCode(lesson.summary)),
          h('span', { class: 'lesson-card-meta' }, `${lesson.steps.length}단계 · 셀프 체크 ${lesson.selfCheck.length}문항`),
        ),
      ),
    )),
  );
}
