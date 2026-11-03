// Isometric projection helpers. Local coordinates: x to the lower right, y to the lower left,
// z up; (0, 0, 0) is the base center of an illustration. All drawing is our own.
import { svg } from './svg';

export const COS30 = Math.cos(Math.PI / 6);
export const SIN30 = 0.5;

export type Pt = [number, number];

/** Projects a local 3D point to 2D, relative to the illustration's base center. */
export function iso(x: number, y: number, z: number): Pt {
  return [(x - y) * COS30, (x + y) * SIN30 - z];
}

export function points(pts: Pt[]): string {
  return pts.map(([x, y]) => `${round(x)},${round(y)}`).join(' ');
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

export interface BoxSpec {
  /** Center offset on the ground plane. */
  cx?: number;
  cy?: number;
  /** Size along x (w), y (d), and z (h); z0 is the bottom. */
  w: number;
  d: number;
  h: number;
  z0?: number;
}

/** A solid box: three visible faces (top, front-left, front-right). */
export function box(parent: Element, spec: BoxSpec): void {
  const { cx = 0, cy = 0, w, d, h, z0 = 0 } = spec;
  const x0 = cx - w / 2;
  const x1 = cx + w / 2;
  const y0 = cy - d / 2;
  const y1 = cy + d / 2;
  const z1 = z0 + h;
  svg('polygon', { class: 'face face-left', points: points([iso(x0, y1, z0), iso(x1, y1, z0), iso(x1, y1, z1), iso(x0, y1, z1)]) }, parent);
  svg('polygon', { class: 'face face-right', points: points([iso(x1, y0, z0), iso(x1, y1, z0), iso(x1, y1, z1), iso(x1, y0, z1)]) }, parent);
  svg('polygon', { class: 'face face-top', points: points([iso(x0, y0, z1), iso(x1, y0, z1), iso(x1, y1, z1), iso(x0, y1, z1)]) }, parent);
}

/** A line drawn in local 3D coordinates. */
export function line3(parent: Element, pts: [number, number, number][], cls = 'ink'): void {
  svg('polyline', { class: cls, points: points(pts.map(([x, y, z]) => iso(x, y, z))) }, parent);
}

/** A closed shape drawn in local 3D coordinates. */
export function poly3(parent: Element, pts: [number, number, number][], cls = 'ink'): void {
  svg('polygon', { class: cls, points: points(pts.map(([x, y, z]) => iso(x, y, z))) }, parent);
}

/** A flat circle on the ground plane (an ellipse on screen) at height z. */
export function disc(parent: Element, r: number, z: number, cls: string, cx = 0, cy = 0): void {
  const [sx, sy] = iso(cx, cy, z);
  svg('ellipse', { class: cls, cx: round(sx), cy: round(sy), rx: round(r * Math.SQRT2 * COS30), ry: round(r * Math.SQRT2 * SIN30) }, parent);
}

/** A vertical cylinder: side, then top disc. */
export function cylinder(parent: Element, r: number, h: number, z0 = 0, cx = 0, cy = 0): void {
  const rx = r * Math.SQRT2 * COS30;
  const ry = r * Math.SQRT2 * SIN30;
  const [bx, by] = iso(cx, cy, z0);
  const ty = by - h;
  svg('path', {
    class: 'face face-left',
    d: `M${round(bx - rx)},${round(ty)} L${round(bx - rx)},${round(by)} A${round(rx)},${round(ry)} 0 0 0 ${round(bx + rx)},${round(by)} L${round(bx + rx)},${round(ty)} Z`,
  }, parent);
  disc(parent, r, z0 + h, 'face face-top', cx, cy);
}

/** The lower half of a disc outline, for rings drawn around a cylinder. */
export function ring(parent: Element, r: number, z: number, cx = 0, cy = 0): void {
  const rx = r * Math.SQRT2 * COS30;
  const ry = r * Math.SQRT2 * SIN30;
  const [x, y] = iso(cx, cy, z);
  svg('path', { class: 'ink', d: `M${round(x - rx)},${round(y)} A${round(rx)},${round(ry)} 0 0 0 ${round(x + rx)},${round(y)}` }, parent);
}
