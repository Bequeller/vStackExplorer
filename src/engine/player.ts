import type { Lesson, Step } from '../lessons/types';
import type { SceneDriver } from '../scene/driver';
import { browserClock, type Clock } from './clock';
import { easeInOutCubic, easeOutQuart } from './easing';
import { initialStates, statesAfterEachStep, type NodeStates } from './states';

export interface PlayerTimings {
  /** Duration of a `move` step animation, in ms. */
  move: number;
  /** Duration of a `mutate` step animation, in ms. */
  mutate: number;
  /** While playing, how long a finished step stays on screen before the next one, in ms. */
  dwell: number;
}

export const defaultTimings: PlayerTimings = { move: 1200, mutate: 900, dwell: 2800 };

export interface PlayerOptions {
  clock?: Clock;
  /** Read on every step, so a change to the system setting applies at once. */
  reducedMotion?: () => boolean;
  timings?: PlayerTimings;
}

/** Playback speeds offered by the player controls. */
export const speeds = [0.5, 1, 2] as const;

export interface PlayerState {
  /** Current step, 0-based. */
  index: number;
  total: number;
  playing: boolean;
  /** Speed multiplier: 2 plays twice as fast. */
  speed: number;
  /** True while the current step's animation runs. */
  animating: boolean;
}

type Phase = 'idle' | 'animating' | 'dwell';

/**
 * Step playback: play, pause, next, previous, seek.
 * Knows no topic: it reads steps and node states and tells the scene what to draw.
 */
export class Player {
  private readonly steps: readonly Step[];
  private readonly initial: NodeStates;
  private readonly after: NodeStates[];
  private readonly clock: Clock;
  private readonly reducedMotion: () => boolean;
  private readonly timings: PlayerTimings;
  private readonly listeners = new Set<(state: PlayerState) => void>();

  private index = 0;
  private playing = false;
  private phase: Phase = 'idle';
  private phaseStart = 0;
  private frameHandle: number | null = null;
  private speed = 1;

  constructor(
    lesson: Pick<Lesson, 'states' | 'steps'>,
    private readonly scene: SceneDriver,
    options: PlayerOptions = {},
  ) {
    if (lesson.steps.length === 0) throw new Error('A lesson needs at least one step.');
    this.steps = lesson.steps;
    this.initial = initialStates(lesson);
    this.after = statesAfterEachStep(lesson);
    this.clock = options.clock ?? browserClock;
    this.reducedMotion = options.reducedMotion ?? (() => false);
    this.timings = options.timings ?? defaultTimings;
  }

  get state(): PlayerState {
    return {
      index: this.index,
      total: this.steps.length,
      playing: this.playing,
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

  /** Go to a step and play its animation. Out-of-range indexes are clamped. */
  seek(index: number): void {
    this.cancelFrame();
    this.index = this.clamp(index);
    const step = this.currentStep();
    const before = this.index === 0 ? this.initial : this.statesAfter(this.index - 1);
    this.scene.begin(step, this.index, before, this.statesAfter(this.index));
    if (this.reducedMotion()) {
      this.scene.update(step, 1);
      this.enterAfterAnimation();
    } else {
      this.setPhase('animating');
    }
    this.emit();
  }

  next(): void {
    if (this.index < this.steps.length - 1) this.seek(this.index + 1);
    else this.pause();
  }

  previous(): void {
    if (this.index > 0) this.seek(this.index - 1);
  }

  play(): void {
    if (this.playing) return;
    this.playing = true;
    const atEnd = this.index === this.steps.length - 1 && this.phase !== 'animating';
    if (atEnd) {
      this.seek(0);
      return;
    }
    if (this.phase === 'idle') this.setPhase('dwell');
    this.emit();
  }

  pause(): void {
    if (!this.playing) return;
    this.playing = false;
    if (this.phase === 'dwell') {
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

  destroy(): void {
    this.cancelFrame();
    this.listeners.clear();
    this.scene.destroy();
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
    if (this.playing) {
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
      if (elapsed < this.timings.dwell / this.speed) {
        this.requestFrame();
        return;
      }
      if (this.index < this.steps.length - 1) {
        this.seek(this.index + 1);
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
