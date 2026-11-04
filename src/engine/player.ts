import type { Lesson, NodeState, Step } from '../lessons/types';
import type { SceneDriver, StateChange } from '../scene/driver';
import { browserClock, type Clock } from './clock';
import { easeInOutCubic, easeOutQuart } from './easing';
import { diffView, initialStates, mutateKey, stateOf, statesAfterEachStep, type NodeStates } from './states';

export interface PlayerTimings {
  /** Duration of a `move` step animation, in ms. */
  move: number;
  /** Duration of a `mutate` step animation, in ms. */
  mutate: number;
  /** While playing, how long a finished step stays on screen before the next one, in ms. */
  dwell: number;
  /** In a replay with reduced motion, how long each step stays before the next one, in ms. */
  replayHold: number;
}

export const defaultTimings: PlayerTimings = { move: 1200, mutate: 900, dwell: 2800, replayHold: 600 };

/** Playback speeds offered by the player controls. */
export const speeds = [0.5, 1, 2] as const;

export interface PlayerOptions {
  clock?: Clock;
  /** Read on every step, so a change to the system setting applies at once. */
  reducedMotion?: () => boolean;
  timings?: PlayerTimings;
  /** Start the replay by itself when playback reaches the end of the last step. Default true. */
  autoReplay?: boolean;
}

export interface PlayerState {
  /** Current step, 0-based. */
  index: number;
  total: number;
  playing: boolean;
  /** True while the end-of-lesson replay runs. */
  replaying: boolean;
  /** Speed multiplier: 2 plays twice as fast. */
  speed: number;
  /** True while the current step's animation runs. */
  animating: boolean;
}

type Phase = 'idle' | 'animating' | 'dwell';

/**
 * Step playback: play, pause, next, previous, seek, and the end-of-lesson replay.
 * Knows no topic: it reads steps and node states and tells the scene what to draw.
 */
export class Player {
  private readonly steps: readonly Step[];
  private readonly states: NodeState[];
  private readonly initial: NodeStates;
  private readonly after: NodeStates[];
  private readonly critical: number[];
  private readonly clock: Clock;
  private readonly reducedMotion: () => boolean;
  private readonly timings: PlayerTimings;
  private readonly autoReplay: boolean;
  private readonly listeners = new Set<(state: PlayerState) => void>();

  private index = 0;
  private playing = false;
  private phase: Phase = 'idle';
  private phaseStart = 0;
  private frameHandle: number | null = null;
  private speed = 1;
  /** Remaining critical step indexes while a replay runs; null when not replaying. */
  private replayQueue: number[] | null = null;

  constructor(
    lesson: Pick<Lesson, 'states' | 'steps'>,
    private readonly scene: SceneDriver,
    options: PlayerOptions = {},
  ) {
    if (lesson.steps.length === 0) throw new Error('A lesson needs at least one step.');
    this.steps = lesson.steps;
    this.states = lesson.states;
    this.initial = initialStates(lesson);
    this.after = statesAfterEachStep(lesson);
    this.critical = lesson.steps.flatMap((s, i) => (s.path === 'critical' ? [i] : []));
    this.clock = options.clock ?? browserClock;
    this.reducedMotion = options.reducedMotion ?? (() => false);
    this.timings = options.timings ?? defaultTimings;
    this.autoReplay = options.autoReplay ?? true;
  }

  get state(): PlayerState {
    return {
      index: this.index,
      total: this.steps.length,
      playing: this.playing,
      replaying: this.replayQueue !== null,
      speed: this.speed,
      animating: this.phase === 'animating',
    };
  }

  /** Node states once the given step has finished. */
  statesAfter(index: number): NodeStates {
    return this.after[this.clamp(index)] ?? this.initial;
  }

  subscribe(listener: (state: PlayerState) => void): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  /** Go to a step and play its animation. Out-of-range indexes are clamped. Stops a replay. */
  seek(index: number): void {
    this.stopReplay();
    this.show(index);
  }

  next(): void {
    this.stopReplay();
    if (this.index < this.steps.length - 1) this.show(this.index + 1);
    else this.pause();
  }

  previous(): void {
    this.stopReplay();
    if (this.index > 0) this.show(this.index - 1);
  }

  play(): void {
    if (this.playing) return;
    this.stopReplay();
    this.playing = true;
    const atEnd = this.index === this.steps.length - 1 && this.phase !== 'animating';
    if (atEnd) {
      this.show(0);
      return;
    }
    if (this.phase === 'idle') this.setPhase('dwell');
    this.emit();
  }

  pause(): void {
    if (!this.playing) return;
    this.playing = false;
    if (this.replayQueue) {
      this.stopReplay();
      this.cancelFrame();
      this.phase = 'idle';
    } else if (this.phase === 'dwell') {
      this.cancelFrame();
      this.phase = 'idle';
    }
    this.emit();
  }

  toggle(): void {
    if (this.playing) this.pause();
    else this.play();
  }

  /** Changes how fast steps animate and advance. Takes effect from the next frame. */
  setSpeed(speed: number): void {
    if (!(speed > 0) || speed === this.speed) return;
    // Keep the current phase's progress: rescale the elapsed time to the new speed.
    const now = this.clock.now();
    this.phaseStart = now - ((now - this.phaseStart) * this.speed) / speed;
    this.speed = speed;
    this.emit();
  }

  /** Go back to the first step. */
  restart(): void {
    this.seek(0);
  }

  /**
   * Plays every critical step once, in order, continuously: no dwell between steps. Ends on
   * the last critical step. Any seek, step, play, or pause stops it.
   */
  replay(): void {
    if (this.critical.length === 0) return;
    this.replayQueue = [...this.critical];
    this.playing = true;
    this.advanceReplay();
  }

  destroy(): void {
    this.cancelFrame();
    this.listeners.clear();
    this.scene.destroy();
  }

  private stopReplay(): void {
    if (this.replayQueue === null) return;
    this.replayQueue = null;
    this.playing = false;
  }

  private advanceReplay(): void {
    const next = this.replayQueue?.shift();
    if (next === undefined) {
      this.replayQueue = null;
      this.playing = false;
      this.phase = 'idle';
      this.emit();
      return;
    }
    this.show(next);
  }

  /** Draws step `index` and starts its animation. */
  private show(index: number): void {
    this.cancelFrame();
    this.index = this.clamp(index);
    const step = this.currentStep();
    const before = this.index === 0 ? this.initial : this.statesAfter(this.index - 1);
    const after = this.statesAfter(this.index);
    this.scene.begin(step, this.index, before, after, {
      replay: this.replayQueue !== null,
      ...(step.kind === 'mutate' ? { state: this.change(step, before, after) } : {}),
    });
    if (this.reducedMotion()) {
      this.scene.update(step, 1);
      this.enterAfterAnimation();
    } else {
      this.setPhase('animating');
    }
    this.emit();
  }

  /** The view a mutate step changes, before and after, with its per-type diff. */
  private change(step: Step & { kind: 'mutate' }, before: NodeStates, after: NodeStates): StateChange {
    const key = mutateKey(step);
    const view = after[key] ?? step.after;
    return {
      node: step.node,
      title: stateOf(this.states, step)?.title ?? '',
      before: before[key],
      after: view,
      diff: diffView(before[key], view),
    };
  }

  private currentStep(): Step {
    const step = this.steps[this.index];
    if (!step) throw new Error(`No step at index ${this.index}.`);
    return step;
  }

  private clamp(index: number): number {
    return Math.min(Math.max(Math.trunc(index), 0), this.steps.length - 1);
  }

  private duration(step: Step): number {
    return (step.kind === 'move' ? this.timings.move : this.timings.mutate) / this.speed;
  }

  private setPhase(phase: Exclude<Phase, 'idle'>): void {
    this.phase = phase;
    this.phaseStart = this.clock.now();
    this.requestFrame();
  }

  private enterAfterAnimation(): void {
    if (this.replayQueue) {
      // With motion, go straight on; with reduced motion, hold briefly so the replay is visible.
      if (this.reducedMotion()) this.setPhase('dwell');
      else this.advanceReplay();
    } else if (this.playing) {
      this.setPhase('dwell');
    } else {
      this.phase = 'idle';
    }
  }

  private requestFrame(): void {
    if (this.frameHandle !== null) return;
    this.frameHandle = this.clock.frame((now) => {
      this.frameHandle = null;
      this.tick(now);
    });
  }

  private cancelFrame(): void {
    if (this.frameHandle !== null) this.clock.cancel(this.frameHandle);
    this.frameHandle = null;
  }

  private tick(now: number): void {
    const elapsed = now - this.phaseStart;
    if (this.phase === 'animating') {
      const step = this.currentStep();
      const raw = Math.min(elapsed / this.duration(step), 1);
      const ease = step.kind === 'move' ? easeInOutCubic : easeOutQuart;
      this.scene.update(step, ease(raw));
      if (raw < 1) {
        this.requestFrame();
        return;
      }
      this.enterAfterAnimation();
      this.emit();
      return;
    }
    if (this.phase === 'dwell') {
      const hold = this.replayQueue ? this.timings.replayHold : this.timings.dwell;
      if (elapsed < hold / this.speed) {
        this.requestFrame();
        return;
      }
      if (this.replayQueue) {
        this.advanceReplay();
      } else if (this.index < this.steps.length - 1) {
        this.show(this.index + 1);
      } else if (this.autoReplay) {
        this.replay();
      } else {
        this.phase = 'idle';
        this.playing = false;
        this.emit();
      }
    }
  }

  private emit(): void {
    const state = this.state;
    for (const listener of this.listeners) listener(state);
  }
}
