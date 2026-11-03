import { describe, expect, it } from 'vitest';
import { layoutRecord, validateLesson, validateTopic } from '../src/engine';
import type { BinaryRecord, Lesson, TopicMeta } from '../src/lessons/types';

const lessonModules = import.meta.glob<Lesson>(['../src/lessons/*/*.ts', '!../src/lessons/*/meta.ts'], {
  eager: true,
  import: 'lesson',
});
const metaModules = import.meta.glob<TopicMeta>('../src/lessons/*/meta.ts', { eager: true, import: 'meta' });

const lessons = Object.entries(lessonModules).map(([path, lesson]) => {
  const [, folder = '', file = ''] = /lessons\/([^/]+)\/([^/]+)\.ts$/.exec(path) ?? [];
  return { path, folder, file, lesson, meta: metaModules[`../src/lessons/${folder}/meta.ts`] };
});

const fixture = lessons[0]!;
const meta = fixture.meta!;
/** A fresh copy of the first shipped lesson, to break one rule at a time. */
const copy = (): Lesson => structuredClone(fixture.lesson);
const errorsFor = (lesson: Lesson): string[] => validateLesson(lesson, meta);
const has = (errors: string[], text: string): boolean => errors.some((e) => e.includes(text));

describe('lesson schema', () => {
  it('finds at least one lesson', () => {
    expect(lessons.length).toBeGreaterThan(0);
  });

  it.each(Object.entries(metaModules))('%s passes the topic checks', (_path, topicMeta) => {
    expect(validateTopic(topicMeta)).toEqual([]);
  });

  it.each(lessons.map((l) => [l.path, l] as const))('%s passes the schema', (_path, { folder, file, lesson, meta: topicMeta }) => {
    expect(topicMeta, `missing src/lessons/${folder}/meta.ts`).toBeDefined();
    expect(lesson.id).toBe(file);
    expect(validateLesson(lesson, topicMeta!)).toEqual([]);
  });

  it.each([
    ['no sources', (l: Lesson) => { l.steps[0]!.sources = []; }],
    ['a source without a version', (l: Lesson) => { l.steps[0]!.sources = [{ url: 'https://example.org/doc', version: '', label: 'doc' }]; }],
    ['a source without a url', (l: Lesson) => { l.steps[0]!.sources = [{ url: '', version: '1.0', label: 'doc' }]; }],
  ])('rejects a step with %s', (_case, breakIt) => {
    const lesson = copy();
    breakIt(lesson);
    expect(has(errorsFor(lesson), 'step 1')).toBe(true);
  });

  it('rejects a move step that carries a state change', () => {
    const lesson = copy();
    const move = lesson.steps.find((s) => s.kind === 'move');
    Object.assign(move!, { after: { type: 'list', items: ['changed'] } });
    expect(has(errorsFor(lesson), 'a move never changes state')).toBe(true);
  });

  it('rejects a mutate step on a node without a state view', () => {
    const lesson = copy();
    const mutate = lesson.steps.find((s) => s.kind === 'mutate');
    if (mutate?.kind !== 'mutate') throw new Error('fixture lesson needs a mutate step');
    lesson.states = lesson.states.filter((s) => s.node !== mutate.node);
    expect(has(errorsFor(lesson), 'has no state view')).toBe(true);
  });

  it('rejects a mutate step that gives only part of the view or changes nothing', () => {
    const partial = copy();
    const table = partial.steps.find((s) => s.kind === 'mutate' && s.after.type === 'table');
    if (table?.kind !== 'mutate' || table.after.type !== 'table') throw new Error('fixture lesson needs a table mutate');
    table.after = { type: 'table', columns: table.after.columns.slice(0, 1), rows: [[table.after.rows[0]![0]!]] };
    expect(has(errorsFor(partial), "keep the state view's columns")).toBe(true);

    const same = copy();
    const first = same.steps.find((s) => s.kind === 'mutate');
    if (first?.kind !== 'mutate') throw new Error('fixture lesson needs a mutate step');
    first.after = same.states.find((st) => st.node === first.node)!.view;
    expect(has(errorsFor(same), 'a mutate must change state')).toBe(true);
  });

  it('rejects records outside steps', () => {
    const lesson = copy();
    Object.assign(lesson, { records: [lesson.steps.find((s) => s.record)!.record] });
    expect(has(errorsFor(lesson), 'records belong to the step')).toBe(true);
  });

  it('rejects a record that does not say whether it is wire bytes, or mixes formats', () => {
    const lesson = copy();
    const withText = lesson.steps.find((s) => s.record?.format === 'text')!;
    const record = withText.record as unknown as Record<string, unknown>;
    delete record.wire;
    expect(has(errorsFor(lesson), 'whether it is real wire bytes')).toBe(true);

    const fields = copy();
    const fieldsStep = fields.steps.find((s) => s.record?.format === 'fields')!;
    Object.assign(fieldsStep.record!, { raw: 'a dump' });
    expect(has(errorsFor(fields), 'does not belong in a "fields" record')).toBe(true);
  });

  it('rejects a text record field whose span is not in the raw message', () => {
    const lesson = copy();
    const field = lesson.steps.find((s) => s.record?.format === 'text')!.record!.fields.find((f) => f.span)!;
    field.span = 'not in the message';
    expect(has(errorsFor(lesson), 'is not in raw')).toBe(true);
  });

  it('rejects a binary record field outside its bytes', () => {
    const lesson = copy();
    const binary: BinaryRecord = {
      title: 'header',
      protocol: 'test',
      wire: true,
      format: 'binary',
      hex: '00 01 02 03',
      segments: [{ id: 'h', label: 'header' }],
      fields: [{ name: 'tail', value: '3', note: 'past the end', segment: 'h', offset: 3, length: 2 }],
    };
    lesson.steps[0]!.record = binary;
    expect(has(errorsFor(lesson), 'outside the 4-byte hex')).toBe(true);
  });

  it('rejects a step with more than four facts', () => {
    const lesson = copy();
    lesson.steps[0]!.facts = Array.from({ length: 5 }, (_, i) => ({ key: `k${i}`, value: 'v' }));
    expect(has(errorsFor(lesson), 'facts')).toBe(true);
  });

  it('rejects a node that is not on the topic map, and a step without a path', () => {
    const lesson = copy();
    lesson.nodes = [...lesson.nodes, 'not-on-the-map'];
    expect(has(errorsFor(lesson), 'is not in the spring-boot topic layout')).toBe(true);

    const noPath = copy();
    delete (noPath.steps[1] as unknown as Record<string, unknown>).path;
    expect(has(errorsFor(noPath), 'path must be "critical" or "side"')).toBe(true);
  });

  it('lets a lesson relabel a map node but not move it', () => {
    const relabeled = copy();
    relabeled.nodes = relabeled.nodes.map((n) => (n === 'tomcat' ? { id: 'tomcat', label: 'Tomcat (node A)' } : n));
    expect(errorsFor(relabeled)).toEqual([]);

    const moved = copy();
    moved.nodes = moved.nodes.map((n) => (n === 'tomcat' ? ({ id: 'tomcat', x: 10 } as unknown as string) : n));
    expect(has(errorsFor(moved), 'cannot be set per lesson')).toBe(true);
  });

  it('lays out a binary record by byte offsets, with segment sizes for the layer bar', () => {
    const layout = layoutRecord({
      title: 'two fields',
      protocol: 'test',
      wire: true,
      format: 'binary',
      hex: 'AA BB CC DD EE',
      segments: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }],
      fields: [
        { name: 'first', value: '0xAABB', note: 'two bytes', segment: 'a', offset: 0, length: 2 },
        { name: 'last', value: '0xEE', note: 'one byte', segment: 'b', offset: 4, length: 1 },
      ],
    });
    expect(layout.fieldRanges).toEqual([[0, 2], [4, 5]]);
    expect(layout.segmentWeights.map((s) => s.weight)).toEqual([4, 1]);
    expect(layout.problems).toEqual([]);
  });
});
