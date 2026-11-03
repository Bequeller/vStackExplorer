import type { Lesson, PathKind, Step, TokenKind } from '../lessons/types';
import { defaultTimings, type PlayerTimings } from './player';
import { recordBytes } from './record';

/** What the event log's colored dot means: a token kind, or a state change inside a node. */
export type EventKind = TokenKind | 'state';

/** One row of the event log, derived from a step. */
export interface TimelineEvent {
  /** Step index, 0-based. */
  index: number;
  /** Playback time at 1× when the step starts, in ms. */
  time: number;
  source: string;
  destination: string;
  layer: string;
  info: string;
  kind: EventKind;
  /** Exact size of the message in bytes, when the step carries wire bytes. */
  bytes: number | null;
  protocol: string;
  path: PathKind;
  /** True when the step has a decoder record. */
  decodable: boolean;
}

/** The event log for a lesson: one event per step, with node labels and layer labels resolved. */
export function buildTimeline(
  lesson: Pick<Lesson, 'steps' | 'layers'> & { nodes: { id: string; label: string }[] },
  timings: PlayerTimings = defaultTimings,
): TimelineEvent[] {
  const label = (id: string): string => lesson.nodes.find((n) => n.id === id)?.label ?? id;
  const layer = (id: string): string => lesson.layers.find((l) => l.id === id)?.label ?? id;
  let time = 0;
  return lesson.steps.map((step, index) => {
    const event: TimelineEvent = {
      index,
      time,
      source: label(step.kind === 'move' ? step.from : step.node),
      destination: label(step.kind === 'move' ? step.to : step.node),
      layer: layer(step.layer),
      info: step.kind === 'move' ? `${step.token.label} — ${step.summary}` : step.summary,
      kind: step.kind === 'move' ? step.token.kind : 'state',
      bytes: step.record ? recordBytes(step.record) : null,
      protocol: step.record?.protocol ?? layer(step.layer),
      path: step.path,
      decodable: step.record !== undefined,
    };
    time += stepDuration(step, timings) + timings.dwell;
    return event;
  });
}

function stepDuration(step: Step, timings: PlayerTimings): number {
  return step.kind === 'move' ? timings.move : timings.mutate;
}

/** "12.4 s" style label for a playback time in ms. */
export function formatTime(ms: number): string {
  return `${(ms / 1000).toFixed(1)} s`;
}
