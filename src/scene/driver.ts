import type { StateView, Step } from '../lessons/types';

/** State view of every node that has one, keyed by node id. */
export type NodeStates = Readonly<Record<string, StateView>>;

/**
 * What the engine needs from a scene. The SVG scene implements it; tests use a fake.
 * The engine owns timing and easing; the scene only draws a given progress.
 */
export interface SceneDriver {
  /** Prepare `step`: draw `before` states, place the token at its start, set highlights. */
  begin(step: Step, before: NodeStates, after: NodeStates): void;
  /** Draw the step at eased progress `t` in [0, 1]. `update(step, 1)` is the final frame. */
  update(step: Step, t: number): void;
  destroy(): void;
}
