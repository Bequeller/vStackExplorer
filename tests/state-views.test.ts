import { describe, expect, it } from 'vitest';
import { Player, validateLesson } from '../src/engine';
import type { Clock } from '../src/engine/clock';
import type { Lesson, StateView, Step } from '../src/lessons/types';
import type { SceneDriver, StateChange, StepContext } from '../src/scene/driver';
import { lesson, meta } from './fixtures/state-views';

const copy = (): Lesson => structuredClone(lesson);
const has = (l: Lesson, text: string): boolean => validateLesson(l, meta).some((e) => e.includes(text));
const mutate = (l: Lesson, id: string): Step & { kind: 'mutate' } => {
  const step = l.steps.find((s) => s.id === id);
  if (step?.kind !== 'mutate') throw new Error(`no mutate ${id}`);
  return step;
};

describe('structural state views', () => {
  it('the fixture with a log, two queues on one node, and a tree passes the schema', () => {
    expect(validateLesson(lesson, meta)).toEqual([]);
  });

  it.each([
    ['a log marker with a negative offset', (l: Lesson) => { (mutate(l, 'hw').after as Extract<StateView, { type: 'log' }>).markers[0]!.offset = -1; }, 'offset ≥ 0'],
    ['log entries out of order', (l: Lesson) => { (mutate(l, 'hw').after as Extract<StateView, { type: 'log' }>).entries.reverse(); }, 'ascending order'],
    ['a queue mark past the tail', (l: Lesson) => { (mutate(l, 'lru').after as Extract<StateView, { type: 'queue' }>).marks[0]!.at = 9; }, 'must be between 0 and 5'],
    ['duplicate queue items', (l: Lesson) => { (mutate(l, 'lru').after as Extract<StateView, { type: 'queue' }>).items.push('p1'); }, 'must be unique'],
    ['a tree child that is not in the next level', (l: Lesson) => { (mutate(l, 'split').after as Extract<StateView, { type: 'tree' }>).levels[0]![0]!.children = ['nope']; }, 'not in the next level'],
    ['a mutate on a two-view node that does not name its view', (l: Lesson) => { delete mutate(l, 'lru').state; }, 'name the one this step changes'],
  ])('rejects %s', (_case, breakIt, message) => {
    const l = copy();
    breakIt(l);
    expect(has(l, message)).toBe(true);
  });

  it('playback hands the scene a per-type diff for each mutate', () => {
    const changes: Record<string, StateChange | undefined> = {};
    const scene: SceneDriver = {
      begin: (step: Step, _i, _b, _a, context: StepContext) => { changes[step.id] = context.state; },
      update: () => {},
      destroy: () => {},
    };
    const clock: Clock = { now: () => 0, frame: () => 0, cancel: () => {} };
    const player = new Player(lesson, scene, { clock, reducedMotion: () => true, autoReplay: false });
    lesson.steps.forEach((_, i) => player.seek(i));

    expect(changes.go).toBeUndefined();
    expect(changes.hw?.diff).toEqual({
      type: 'log',
      added: [5],
      markers: [{ name: 'HW', from: 3, to: 5 }, { name: 'LEO', from: 5, to: 6 }],
    });
    const lru = changes.lru?.diff;
    expect(lru?.type === 'queue' && lru.items.find((m) => m.item === 'p4')).toEqual({ item: 'p4', from: 3, to: 0 });
    expect(changes.lru?.title).toBe('LRU list');
    const flush = changes.flush?.diff;
    expect(flush?.type === 'queue' && flush.items.find((m) => m.item === 'p4')).toEqual({ item: 'p4', from: null, to: 1 });
    expect(changes.split?.diff).toEqual({ type: 'tree', added: ['leaf2'], removed: [], changed: ['root', 'leaf1'] });
  });
});
