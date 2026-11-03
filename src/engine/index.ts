// Public API of the engine for the UI. The UI never touches the scene's SVG directly.
import type { Lesson } from '../lessons/types';
import { SvgScene } from '../scene/svgScene';
import { Player, type PlayerOptions } from './player';

export { Player, defaultTimings } from './player';
export type { PlayerOptions, PlayerState, PlayerTimings } from './player';
export { validateLesson } from './validate';

/** Draws the lesson's scene into `host` and returns a player positioned on `startIndex`. */
export function mountLesson(host: HTMLElement, lesson: Lesson, startIndex = 0, options: PlayerOptions = {}): Player {
  const scene = new SvgScene(host, lesson);
  const player = new Player(lesson, scene, options);
  player.seek(startIndex);
  return player;
}
