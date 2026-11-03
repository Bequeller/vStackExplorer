// Public API of the engine for the UI. The UI never touches the scene's SVG directly.
import type { Lesson } from '../lessons/types';
import type { SceneMode } from '../scene/driver';
import { SceneView } from '../scene/sceneView';
import { Player, type PlayerOptions } from './player';
import { buildTimeline, formatTime, type TimelineEvent } from './timeline';

export { Player, defaultTimings, speeds } from './player';
export type { PlayerOptions, PlayerState, PlayerTimings } from './player';
export { validateLesson, limits } from './validate';
export { buildTimeline, formatTime } from './timeline';
export type { EventKind, TimelineEvent } from './timeline';
export { layoutRecord, recordBytes } from './record';
export type { RecordLayout, RecordRun } from './record';
export { changedRows } from './states';
export type { SceneMode };

export interface LessonView {
  player: Player;
  timeline: TimelineEvent[];
  /** Switch between the illustrated network and the sequence diagram. */
  setMode(mode: SceneMode): void;
  destroy(): void;
}

/** Draws the lesson's scene into `host` and returns a player positioned on `startIndex`. */
export function mountLesson(host: HTMLElement, lesson: Lesson, startIndex = 0, options: PlayerOptions = {}): LessonView {
  const timeline = buildTimeline(lesson, options.timings);
  const scene = new SceneView(host, lesson, timeline.map((e) => formatTime(e.time)));
  const player = new Player(lesson, scene, options);
  player.seek(startIndex);
  return {
    player,
    timeline,
    setMode: (mode) => scene.setMode(mode),
    destroy: () => player.destroy(),
  };
}
