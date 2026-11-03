import { describe, expect, it } from 'vitest';
import { Player, type PlayerTimings } from '../src/engine/player';
import type { Clock } from '../src/engine/clock';
import type { NodeStates, SceneDriver } from '../src/scene/driver';
import type { Lesson, Step } from '../src/lessons/types';

const source = [{ url: 'https://example.org/doc', version: '1.0', label: 'doc' }];
const lesson: Pick<Lesson, 'states' | 'steps'> = {
  states: [{ node: 'b', title: 'pool', x: 0, y: 0, width: 100, view: { type: 'list', items: ['idle'] } }],
  steps: [
    { id: 's1', kind: 'move', from: 'a', to: 'b', token: { kind: 'request', label: 'GET /' }, title: 'one', summary: 'one', detail: 'one', facts: [], sources: source },
    { id: 's2', kind: 'mutate', node: 'b', after: { type: 'list', items: ['busy'] }, title: 'two', summary: 'two', detail: 'two', facts: [], sources: source },
    { id: 's3', kind: 'move', from: 'b', to: 'a', token: { kind: 'response', label: '200' }, title: 'three', summary: 'three', detail: 'three', facts: [], sources: source },
  ],
};
const timings: PlayerTimings = { move: 100, mutate: 50, dwell: 200 };

/** A clock that only moves when the test says so. */
class ManualClock implements Clock {
  private time = 0;
  private next = 1;
  private readonly queue = new Map<number, (now: number) => void>();
  now(): number {
    return this.time;
  }
  frame(cb: (now: number) => void): number {
    const id = this.next++;
    this.queue.set(id, cb);
    return id;
  }
  cancel(handle: number): void {
    this.queue.delete(handle);
  }
  /** Advance time in 16 ms frames, running callbacks like requestAnimationFrame. */
  advance(ms: number): void {
    const end = this.time + ms;
    while (this.time < end) {
      this.time = Math.min(this.time + 16, end);
      const due = [...this.queue.values()];
      this.queue.clear();
      for (const cb of due) cb(this.time);
    }
  }
}

interface Drawn {
  step: string;
  before?: NodeStates;
  after?: NodeStates;
  t?: number;
}

class RecordingScene implements SceneDriver {
  readonly calls: Drawn[] = [];
  begin(step: Step, before: NodeStates, after: NodeStates): void {
    this.calls.push({ step: step.id, before, after });
  }
  update(step: Step, t: number): void {
    this.calls.push({ step: step.id, t });
  }
  destroy(): void {}
  lastT(step: string): number | undefined {
    return this.calls.filter((c) => c.step === step && c.t !== undefined).at(-1)?.t;
  }
}

function setup(reducedMotion = false) {
  const clock = new ManualClock();
  const scene = new RecordingScene();
  const player = new Player(lesson, scene, { clock, timings, reducedMotion: () => reducedMotion });
  return { clock, scene, player };
}

describe('engine playback', () => {
  it('steps forward and back, clamped to the lesson', () => {
    const { player } = setup();
    player.seek(0);
    player.previous();
    expect(player.state.index).toBe(0);
    player.next();
    player.next();
    player.next();
    expect(player.state.index).toBe(2);
    player.previous();
    expect(player.state.index).toBe(1);
    player.seek(99);
    expect(player.state.index).toBe(2);
    player.seek(-5);
    expect(player.state.index).toBe(0);
  });

  it('animates a step from start to its final frame', () => {
    const { clock, scene, player } = setup();
    player.seek(0);
    expect(player.state.animating).toBe(true);
    clock.advance(50);
    const midway = scene.lastT('s1') ?? 0;
    expect(midway).toBeGreaterThan(0);
    expect(midway).toBeLessThan(1);
    clock.advance(100);
    expect(scene.lastT('s1')).toBe(1);
    expect(player.state.animating).toBe(false);
  });

  it('plays every step in order, then stops at the end', () => {
    const { clock, scene, player } = setup();
    const seen: number[] = [];
    player.subscribe((s) => {
      if (seen.at(-1) !== s.index) seen.push(s.index);
    });
    player.seek(0);
    player.play();
    clock.advance(5000);
    expect(seen).toEqual([0, 1, 2]);
    expect(player.state.playing).toBe(false);
    for (const id of ['s1', 's2', 's3']) expect(scene.lastT(id)).toBe(1);
  });

  it('pause stops autoplay on the current step', () => {
    const { clock, player } = setup();
    player.seek(0);
    player.play();
    clock.advance(150);
    player.pause();
    clock.advance(5000);
    expect(player.state.index).toBe(0);
    expect(player.state.playing).toBe(false);
  });

  it('play at the last step starts over from the first', () => {
    const { clock, player } = setup();
    player.seek(2);
    clock.advance(500);
    player.play();
    expect(player.state.index).toBe(0);
    expect(player.state.playing).toBe(true);
  });

  it('gives a mutate step the node state before and after it', () => {
    const { scene, player } = setup();
    player.seek(1);
    const begin = scene.calls.find((c) => c.step === 's2' && c.before);
    expect(begin?.before?.b).toEqual({ type: 'list', items: ['idle'] });
    expect(begin?.after?.b).toEqual({ type: 'list', items: ['busy'] });
    player.seek(2);
    const later = scene.calls.find((c) => c.step === 's3' && c.before);
    expect(later?.before?.b).toEqual({ type: 'list', items: ['busy'] });
  });

  it('with reduced motion, draws each step final frame at once', () => {
    const { scene, player } = setup(true);
    player.seek(0);
    expect(scene.lastT('s1')).toBe(1);
    expect(player.state.animating).toBe(false);
  });
});
