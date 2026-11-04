import type { Lesson, StateView, Step, TopicLayout, TopicNode } from '../lessons/types';

/** State view of every node that has one, keyed by node id. */
export type NodeStates = Readonly<Record<string, StateView>>;

/** How the scene is drawn: the illustrated network or the sequence diagram. */
export type SceneMode = 'network' | 'sequence';

/** A lesson with its node ids resolved to the topic layout's positioned nodes. */
export interface PlacedLesson extends Omit<Lesson, 'nodes'> {
  nodes: TopicNode[];
  world: { width: number; height: number };
  /** The whole topic map, for geometry shared by every lesson (region slabs). */
  layout: TopicLayout;
}

export interface StepContext {
  /** True while the end-of-lesson replay runs: show the whole critical path at once. */
  replay: boolean;
}

/**
 * What the engine needs from a scene. The SVG scene implements it; tests use a fake.
 * The engine owns timing and easing; the scene only draws a given progress.
 */
export interface SceneDriver {
  /** Prepare step `index`: reveal nodes, aim the camera, place the token, set highlights. */
  begin(step: Step, index: number, before: NodeStates, after: NodeStates, context: StepContext): void;
  /** Draw the step at eased progress `t` in [0, 1]. `update(step, 1)` is the final frame. */
  update(step: Step, t: number): void;
  destroy(): void;
}
