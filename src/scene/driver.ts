import type { StateView, Step } from '../lessons/types';

/** State view of every node that has one, keyed by node id. */
export type NodeStates = Readonly<Record<string, StateView>>;

/** How the scene is drawn: the illustrated network or the sequence diagram. */
export type SceneMode = 'network' | 'sequence';

/**
 * What the engine needs from a scene. The SVG scene implements it; tests use a fake.
 * The engine owns timing and easing; the scene only draws a given progress.
 */
export interface SceneDriver {
  /** Prepare step `index`: reveal nodes, aim the camera, place the token, set highlights. */
  begin(step: Step, index: number, before: NodeStates, after: NodeStates): void;
  /** Draw the step at eased progress `t` in [0, 1]. `update(step, 1)` is the final frame. */
  update(step: Step, t: number): void;
  destroy(): void;
}
