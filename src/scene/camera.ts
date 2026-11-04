// The scene camera: an SVG viewBox that eases from one framing to the next.

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** The smallest area the camera shows, in scene units, so a single node is not blown up. */
export const MIN_FRAME = { w: 760, h: 470 };
/** In a portrait scene (a phone), height is plentiful, so a narrower minimum keeps icons readable. */
const MIN_FRAME_PORTRAIT_W = 540;

export class Camera {
  private current: Box;
  private from: Box;
  private to: Box;

  constructor(private readonly element: SVGSVGElement, private readonly world: { width: number; height: number }) {
    this.current = { x: 0, y: 0, w: world.width, h: world.height };
    this.from = this.current;
    this.to = this.current;
  }

  /** The viewBox that frames these areas, padded and matched to the element's aspect ratio. */
  frame(areas: Box[]): Box {
    if (areas.length === 0) return { x: 0, y: 0, w: this.world.width, h: this.world.height };
    const x0 = Math.min(...areas.map((a) => a.x));
    const y0 = Math.min(...areas.map((a) => a.y));
    const x1 = Math.max(...areas.map((a) => a.x + a.w));
    const y1 = Math.max(...areas.map((a) => a.y + a.h));
    const rect = this.element.getBoundingClientRect();
    const aspect = rect.width > 0 && rect.height > 0 ? rect.width / rect.height : 1.6;
    let w = Math.max(x1 - x0 + 80, aspect < 1 ? MIN_FRAME_PORTRAIT_W : MIN_FRAME.w);
    let h = Math.max(y1 - y0 + 60, MIN_FRAME.h);
    if (w / h > aspect) h = w / aspect;
    else w = h * aspect;
    return { x: (x0 + x1) / 2 - w / 2, y: (y0 + y1) / 2 - h / 2, w, h };
  }

  /** The framing on screen now. */
  get box(): Box {
    return this.current;
  }

  /** Starts easing from the current framing toward `target`; `update(t)` draws progress. */
  aim(target: Box): void {
    this.from = this.current;
    this.to = target;
  }

  update(t: number): void {
    const a = this.from;
    const b = this.to;
    this.current = { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), w: lerp(a.w, b.w, t), h: lerp(a.h, b.h, t) };
    this.apply();
  }

  /** Moves to `target` at once, e.g. after the element was resized. */
  jump(target: Box): void {
    this.current = target;
    this.from = target;
    this.to = target;
    this.apply();
  }

  private apply(): void {
    const c = this.current;
    this.element.setAttribute('viewBox', `${c.x.toFixed(1)} ${c.y.toFixed(1)} ${c.w.toFixed(1)} ${c.h.toFixed(1)}`);
  }
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
