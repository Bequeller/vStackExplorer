import { describe, expect, it } from 'vitest';
import { validateLesson } from '../src/engine/validate';
import type { Lesson, TopicMeta } from '../src/lessons/types';

const lessonModules = import.meta.glob<Lesson>(['../src/lessons/*/*.ts', '!../src/lessons/*/meta.ts'], {
  eager: true,
  import: 'lesson',
});
const metaModules = import.meta.glob<TopicMeta>('../src/lessons/*/meta.ts', { eager: true, import: 'meta' });

const lessons = Object.entries(lessonModules).map(([path, lesson]) => {
  const [, folder = '', file = ''] = /lessons\/([^/]+)\/([^/]+)\.ts$/.exec(path) ?? [];
  return { path, folder, file, lesson, meta: metaModules[`../src/lessons/${folder}/meta.ts`] };
});

describe('lesson schema', () => {
  it('finds at least one lesson', () => {
    expect(lessons.length).toBeGreaterThan(0);
  });

  it.each(lessons.map((l) => [l.path, l] as const))('%s passes the schema', (_path, { folder, file, lesson, meta }) => {
    expect(meta, `missing src/lessons/${folder}/meta.ts`).toBeDefined();
    expect(lesson.id).toBe(file);
    expect(validateLesson(lesson, meta)).toEqual([]);
  });

  it.each([
    ['no sources', (l: Lesson) => { l.steps[0]!.sources = []; }],
    ['a source without a version', (l: Lesson) => { l.steps[0]!.sources = [{ url: 'https://example.org/doc', version: '', label: 'doc' }]; }],
    ['a source without a url', (l: Lesson) => { l.steps[0]!.sources = [{ url: '', version: '1.0', label: 'doc' }]; }],
  ])('rejects a step with %s', (_case, breakIt) => {
    const lesson = structuredClone(lessons[0]!.lesson);
    breakIt(lesson);
    expect(validateLesson(lesson).some((e) => e.includes('step 1'))).toBe(true);
  });

  it('rejects a record field whose span is not in the raw message', () => {
    const lesson = structuredClone(lessons[0]!.lesson);
    const step = lesson.steps.find((st) => st.record?.fields.some((f) => f.span));
    const field = step?.record?.fields.find((f) => f.span);
    if (!step || !field) throw new Error('fixture lesson needs a record with spans');
    field.span = 'not in the message';
    expect(validateLesson(lesson).some((e) => e.includes('is not in raw'))).toBe(true);
  });

  it('rejects a step with more than four facts', () => {
    const lesson = structuredClone(lessons[0]!.lesson);
    lesson.steps[0]!.facts = Array.from({ length: 5 }, (_, i) => ({ key: `k${i}`, value: 'v' }));
    expect(validateLesson(lesson).some((e) => e.includes('facts'))).toBe(true);
  });

  it('rejects a mutate step on a node without a state panel', () => {
    const lesson = structuredClone(lessons[0]!.lesson);
    const mutate = lesson.steps.find((s) => s.kind === 'mutate');
    if (!mutate || mutate.kind !== 'mutate') throw new Error('fixture lesson needs a mutate step');
    lesson.states = lesson.states.filter((s) => s.node !== mutate.node);
    expect(validateLesson(lesson).some((e) => e.includes('has no state view'))).toBe(true);
  });
});
