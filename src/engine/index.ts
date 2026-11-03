// Public API of the engine for the UI. The UI never touches the scene's SVG directly.
import type { Lesson, TopicMeta } from '../lessons/types';
import type { PlacedLesson, SceneMode } from '../scene/driver';
import { SceneView } from '../scene/sceneView';
import { placeLesson } from './place';
import { Player, type PlayerOptions } from './player';
import { buildTimeline, formatTime, type TimelineEvent } from './timeline';

export { Player, defaultTimings, speeds } from './player';
export type { PlayerOptions, PlayerState, PlayerTimings } from './player';
export { validateLesson, validateTopic, limits } from './validate';
export { buildTimeline, formatTime } from './timeline';
export type { EventKind, TimelineEvent } from './timeline';
export { layoutRecord, recordBytes } from './record';
export type { RecordLayout, RecordRun } from './record';
export { changedRows } from './states';
export { placeLesson } from './place';
export type { PlacedLesson, SceneMode };

export interface LessonView {
  player: Player;
  /** The lesson with node ids resolved to the topic layout. */
  placed: PlacedLesson;
  timeline: TimelineEvent[];
  /** Switch between the illustrated network and the sequence diagram. */
  setMode(mode: SceneMode): void;
  destroy(): void;
}

/** Draws the lesson on its topic's map in `host` and returns a player positioned on `startIndex`. */
export function mountLesson(
  host: HTMLElement,
  lesson: Lesson,
  meta: Pick<TopicMeta, 'layout'>,
  startIndex = 0,
  options: PlayerOptions = {},
): LessonView {
  const placed = placeLesson(lesson, meta);
  const timeline = buildTimeline(placed, options.timings);
  const scene = new SceneView(host, placed, timeline.map((e) => formatTime(e.time)));
  const player = new Player(lesson, scene, options);
  player.seek(startIndex);
  return {
    player,
    placed,
    timeline,
    setMode: (mode) => scene.setMode(mode),
    destroy: () => player.destroy(),
  };
}
