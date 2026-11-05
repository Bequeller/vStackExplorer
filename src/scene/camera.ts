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
/** How far the camera may zoom out past the minimum frame to show context (DESIGN.md: Camera). */
const MAX_ZOOM_OUT = 1.45;
/** How far a leaning frame keeps the current step's nodes from its edges, in scene units. */
const LEAN_PAD = { x: 160, y: 110 };

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
    const b = bounds(areas);
    const aspect = this.aspect();
    let w = Math.max(b.w + 80, aspect < 1 ? MIN_FRAME_PORTRAIT_W : MIN_FRAME.w);
    let h = Math.max(b.h + 60, MIN_FRAME.h);
    if (w / h > aspect) h = w / aspect;
    else w = h * aspect;
    return { x: b.x + b.w / 2 - w / 2, y: b.y + b.h / 2 - h / 2, w, h };
  }

  /**
   * Frames `focus` together with `context`, zooming out at most MAX_ZOOM_OUT past the minimum
   * frame. Past that cap the focus stays in frame and the view leans toward the context.
   */
  frameWithContext(focus: Box[], context: Box[]): Box {
    const tight = this.frame(focus);
    const wide = this.frame([...focus, ...context]);
    const cap = Math.max(tight.w, this.minWidth() * MAX_ZOOM_OUT);
    if (wide.w <= cap || focus.length === 0) return wide;
    const w = cap;
    const h = w / this.aspect();
    const f = bounds(focus);
    const lean = (want: number, lo: number, hi: number) => Math.min(Math.max(want, lo), hi);
    // The center may move only as far as keeps the focus well inside the frame, clear of the edge fade.
    const px = Math.min(LEAN_PAD.x, Math.max(0, (w - f.w) / 2));
    const py = Math.min(LEAN_PAD.y, Math.max(0, (h - f.h) / 2));
    const cx = lean(wide.x + wide.w / 2, f.x + f.w + px - w / 2, f.x - px + w / 2);
    const cy = lean(wide.y + wide.h / 2, f.y + f.h + py - h / 2, f.y - py + h / 2);
    return { x: cx - w / 2, y: cy - h / 2, w, h };
  }

  private aspect(): number {
    const rect = this.element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0 ? rect.width / rect.height : 1.6;
  }

  /** The minimum frame's width at the element's aspect ratio. */
  private minWidth(): number {
    const aspect = this.aspect();
    const w = aspect < 1 ? MIN_FRAME_PORTRAIT_W : MIN_FRAME.w;
    return Math.max(w, MIN_FRAME.h * aspect);
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

function bounds(areas: Box[]): Box {
  const x0 = Math.min(...areas.map((a) => a.x));
  const y0 = Math.min(...areas.map((a) => a.y));
  const x1 = Math.max(...areas.map((a) => a.x + a.w));
  const y1 = Math.max(...areas.map((a) => a.y + a.h));
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
