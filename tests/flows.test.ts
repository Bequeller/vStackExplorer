import { describe, expect, it } from 'vitest';
import { Player, buildTimeline, validateLesson } from '../src/engine';
import type { Clock } from '../src/engine/clock';
import type { Lesson, Step } from '../src/lessons/types';
import type { SceneDriver } from '../src/scene/driver';
import { flightProgress, hopsOf, laneKeys } from '../src/scene/flights';
import { lesson, meta } from './fixtures/flows';

const copy = (): Lesson => structuredClone(lesson);
const has = (l: Lesson, text: string): boolean => validateLesson(l, meta).some((e) => e.includes(text));
const move = (l: Lesson, id: string): Step & { kind: 'move' } => {
  const step = l.steps.find((s) => s.id === id);
  if (step?.kind !== 'move') throw new Error(`no move ${id}`);
  return step;
};

describe('concurrent and return flows', () => {
  it('the fixture with a burst, parallel moves, and a return passes the schema', () => {
    expect(validateLesson(lesson, meta)).toEqual([]);
  });

  it.each([
    ['a parallel move to a node the lesson does not list', (l: Lesson) => { move(l, 'race').parallel![0]!.to = 'nowhere'; }, 'parallel move 1: "nowhere"'],
    ['a parallel move without a token label', (l: Lesson) => { move(l, 'race').parallel![0]!.token.label = ''; }, 'parallel move 1 needs a token'],
    ['a count below 2', (l: Lesson) => { move(l, 'stampede').count = 1; }, 'count must be an integer ≥ 2'],
  ])('rejects %s', (_case, breakIt, message) => {
    const l = copy();
    breakIt(l);
    expect(has(l, message)).toBe(true);
  });

  it('every move of a parallel step, and every token of a burst, finishes when the step does', () => {
    const ts: number[] = [];
    const scene: SceneDriver = { begin: () => {}, update: (_s, t) => ts.push(t), destroy: () => {} };
    let now = 0;
    const queue: ((n: number) => void)[] = [];
    const clock: Clock = { now: () => now, frame: (cb) => queue.push(cb), cancel: () => {} };
    const player = new Player(lesson, scene, { clock, autoReplay: false });
    player.seek(2);
    while (queue.length) {
      now += 16;
      queue.shift()!(now);
    }
    expect(ts.at(-1)).toBe(1);
    const race = move(lesson, 'race');
    expect(hopsOf(race).map((h) => h.to)).toEqual(['lb', 'db']);
    // Parallel hops each have one token: their progress is the step's progress, so they move together.
    expect(flightProgress(0.5, 0, 1)).toBe(0.5);
    // Burst tokens start staggered and all arrive at t = 1.
    expect(flightProgress(0.2, 7, 8)).toBe(0);
    expect([0, 3, 7].map((k) => flightProgress(1, k, 8))).toEqual([1, 1, 1]);
    // The event log shows one row per step, parallel moves joined by "‖", the burst as ×N.
    const log = buildTimeline({ ...lesson, nodes: meta.layout.nodes });
    expect(log[1]!.info).toContain('SELECT ×200');
    expect(log[2]!.info).toContain('deregister ‖ close pool');
  });

  it('a move back along a link takes the return lane', () => {
    const lane = laneKeys(lesson.steps);
    expect(lane('users', 'app')).toEqual({ key: 'app|users', back: false });
    expect(lane('app', 'users')).toEqual({ key: 'app|users#back', back: true });
  });
});
