import type { Lesson, StateView, Step, TopicLayout, TopicNode } from '../lessons/types';

/** State view of every node that has one, keyed by node id. */
export type NodeStates = Readonly<Record<string, StateView>>;

/** How the scene is drawn: the illustrated network or the sequence diagram. */
export type SceneMode = 'network' | 'sequence';

/** A map node projected to the screen: x and y are the base center of its illustration. */
export interface PlacedNode extends TopicNode {
  x: number;
  y: number;
}

/** A topic map projected to the screen, with a world size that holds every node. */
export interface PlacedLayout extends Omit<TopicLayout, 'nodes'> {
  width: number;
  height: number;
  nodes: PlacedNode[];
}

/** A lesson with its node ids resolved to the topic layout's positioned nodes. */
export interface PlacedLesson extends Omit<Lesson, 'nodes'> {
  nodes: PlacedNode[];
  world: { width: number; height: number };
  /** The whole topic map, for geometry shared by every lesson (region slabs). */
  layout: PlacedLayout;
}

/** What changed in one state view, per view type (computed by the engine's `diffView`). */
export type ViewDiff =
  | { type: 'rows'; changed: number[] }
  | { type: 'log'; added: number[]; markers: { name: string; from: number | null; to: number | null }[] }
  | {
      type: 'queue';
      items: { item: string; from: number | null; to: number | null }[];
      marks: { name: string; from: number | null; to: number | null }[];
    }
  | { type: 'tree'; added: string[]; removed: string[]; changed: string[] };

/** The view a mutate step changes, with its diff. */
export interface StateChange {
  node: string;
  title: string;
  before: StateView | undefined;
  after: StateView;
  diff: ViewDiff;
}

export interface StepContext {
  /** True while the end-of-lesson replay runs: show the whole critical path at once. */
  replay: boolean;
  /** For a mutate step: the view it changes and what changed. */
  state?: StateChange;
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
