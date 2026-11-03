// Time source for playback. The browser clock uses requestAnimationFrame;
// tests pass a manual clock so playback is deterministic.

export interface Clock {
  now(): number;
  /** Calls `cb` on the next frame. Returns a handle for `cancel`. */
  frame(cb: (now: number) => void): number;
  cancel(handle: number): void;
}

export const browserClock: Clock = {
  now: () => performance.now(),
  frame: (cb) => requestAnimationFrame(cb),
  cancel: (handle) => cancelAnimationFrame(handle),
};
