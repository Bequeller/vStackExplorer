// Regions: boundaries drawn as stacked isometric slabs (decision 0015). The geometry functions
// are pure, so validation can check footprints without a DOM.
import type { Region, TopicLayout } from '../lessons/types';
import type { PlacedLayout } from './driver';
import { COS30, SIN30, iso, points } from './iso';
import { svg, text } from './svg';

/** Height of one slab, in scene units. Each nesting level stacks one more. */
export const SLAB = 12;
/** Ground distance from the outermost member (or child slab) to the slab's edge. */
export const REGION_MARGIN = 120;

/** A slab's footprint on the iso ground plane, and how high it sits. */
export interface Footprint {
  id: string;
  label: string;
  managed: boolean;
  parent: string | undefined;
  /** 1 for a top-level region; each nesting level adds 1. */
  depth: number;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/** The ground-plane point under a screen point: the inverse of `iso` at z = 0. */
export function toGround(sx: number, sy: number): [number, number] {
  const a = sx / COS30; // x - y
  const b = sy / SIN30; // x + y
  return [(a + b) / 2, (b - a) / 2];
}

/**
 * Computes every region's footprint: the ground bounding box of its member nodes and its child
 * footprints, plus a margin. Regions in a parent cycle or with an unknown parent are skipped
 * (validation reports them).
 */
export function regionFootprints(layout: Pick<PlacedLayout, 'nodes' | 'regions'>): Map<string, Footprint> {
  const regions = layout.regions ?? [];
  const byId = new Map(regions.map((r) => [r.id, r]));
  const nodes = new Map(layout.nodes.map((n) => [n.id, toGround(n.x, n.y)]));
  const out = new Map<string, Footprint>();
  const visiting = new Set<string>();

  const depthOf = (region: Region, seen = new Set<string>()): number => {
    if (!region.parent) return 1;
    const parent = byId.get(region.parent);
    if (!parent || seen.has(region.id)) return Number.NaN;
    seen.add(region.id);
    return depthOf(parent, seen) + 1;
  };

  const compute = (region: Region): Footprint | undefined => {
    const done = out.get(region.id);
    if (done) return done;
    if (visiting.has(region.id)) return undefined;
    const depth = depthOf(region);
    if (!Number.isFinite(depth)) return undefined;
    visiting.add(region.id);
    const xs: number[] = [];
    const ys: number[] = [];
    for (const id of region.nodes) {
      const p = nodes.get(id);
      if (!p) continue;
      xs.push(p[0] - REGION_MARGIN, p[0] + REGION_MARGIN);
      ys.push(p[1] - REGION_MARGIN, p[1] + REGION_MARGIN);
    }
    for (const child of regions.filter((r) => r.parent === region.id)) {
      const f = compute(child);
      if (!f) continue;
      xs.push(f.x0 - REGION_MARGIN / 2, f.x1 + REGION_MARGIN / 2);
      ys.push(f.y0 - REGION_MARGIN / 2, f.y1 + REGION_MARGIN / 2);
    }
    visiting.delete(region.id);
    if (xs.length === 0) return undefined;
    const footprint: Footprint = {
      id: region.id,
      label: region.label,
      managed: region.managed === true,
      parent: region.parent,
      depth,
      x0: Math.min(...xs),
      y0: Math.min(...ys),
      x1: Math.max(...xs),
      y1: Math.max(...ys),
    };
    out.set(region.id, footprint);
    return footprint;
  };

  for (const region of regions) compute(region);
  return out;
}

/** How high each node stands: the top of its innermost slab (0 outside every region). */
export function nodeLifts(layout: Pick<PlacedLayout, 'nodes' | 'regions'>): Map<string, number> {
  const footprints = regionFootprints(layout);
  const lifts = new Map<string, number>();
  for (const region of layout.regions ?? []) {
    const f = footprints.get(region.id);
    if (!f) continue;
    for (const id of region.nodes) lifts.set(id, f.depth * SLAB);
  }
  return lifts;
}

/**
 * Where these nodes run, as "outer › inner" region labels; distinct places are joined by " ↔ ".
 * Empty when none of them is in a region.
 */
export function regionWhere(layout: Pick<TopicLayout, 'regions'>, nodeIds: string[]): string {
  const regions = layout.regions ?? [];
  const byId = new Map(regions.map((r) => [r.id, r]));
  const pathOf = (nodeId: string): string => {
    const labels: string[] = [];
    let r = regions.find((region) => region.nodes.includes(nodeId));
    while (r && labels.length <= regions.length) {
      labels.unshift(r.label);
      r = r.parent ? byId.get(r.parent) : undefined;
    }
    return labels.join(' › ');
  };
  return [...new Set(nodeIds.map(pathOf).filter(Boolean))].join(' ↔ ');
}

export function overlaps(a: Footprint, b: Footprint): boolean {
  return a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
}

/** Whether a ground point lies inside a footprint. */
export function contains(f: Footprint, gx: number, gy: number): boolean {
  return gx > f.x0 && gx < f.x1 && gy > f.y0 && gy < f.y1;
}

/**
 * Draws region slabs under the links, outer slabs first. A slab shows once any node inside it
 * (directly or in a child region) is shown.
 */
export class RegionLayer {
  private readonly slabs = new Map<string, SVGGElement>();
  /** Region id → every node id inside it, including child regions' nodes. */
  private readonly members = new Map<string, Set<string>>();
  private readonly layout: Pick<PlacedLayout, 'nodes' | 'regions'>;

  constructor(layer: SVGGElement, layout: Pick<PlacedLayout, 'nodes' | 'regions'>) {
    this.layout = layout;
    const footprints = [...regionFootprints(layout).values()];
    const regions = layout.regions ?? [];
    const collect = (id: string, into: Set<string>, seen = new Set<string>()): Set<string> => {
      if (seen.has(id)) return into;
      seen.add(id);
      for (const n of regions.find((r) => r.id === id)?.nodes ?? []) into.add(n);
      for (const child of regions.filter((r) => r.parent === id)) collect(child.id, into, seen);
      return into;
    };
    // Lower slabs first; at the same depth, farther (smaller x + y) first.
    footprints.sort((a, b) => a.depth - b.depth || a.x0 + a.y0 - (b.x0 + b.y0));
    for (const f of footprints) {
      this.members.set(f.id, collect(f.id, new Set()));
      this.slabs.set(f.id, drawSlab(layer, f));
    }
  }

  where(nodeIds: string[]): string {
    return regionWhere(this.layout, nodeIds);
  }

  /** Shows the slabs that hold at least one of `nodeIds`. */
  show(nodeIds: Iterable<string>): void {
    const shown = new Set(nodeIds);
    for (const [id, slab] of this.slabs) {
      const visible = [...(this.members.get(id) ?? [])].some((n) => shown.has(n));
      slab.classList.toggle('is-shown', visible);
    }
  }
}

function drawSlab(layer: SVGGElement, f: Footprint): SVGGElement {
  const g = svg('g', {
    class: `region region--d${Math.min(f.depth, 4)}${f.managed ? ' region--managed' : ''}`,
    'data-region': f.id,
  }, layer);
  const z0 = (f.depth - 1) * SLAB;
  const z1 = f.depth * SLAB;
  const { x0, y0, x1, y1 } = f;
  svg('polygon', { class: 'region-side region-side--left', points: points([iso(x0, y1, z0), iso(x1, y1, z0), iso(x1, y1, z1), iso(x0, y1, z1)]) }, g);
  svg('polygon', { class: 'region-side region-side--right', points: points([iso(x1, y0, z0), iso(x1, y1, z0), iso(x1, y1, z1), iso(x1, y0, z1)]) }, g);
  svg('polygon', { class: 'region-top', points: points([iso(x0, y0, z1), iso(x1, y0, z1), iso(x1, y1, z1), iso(x0, y1, z1)]) }, g);
  // The label is painted on the floor along the near (front-left) edge, in ground coordinates.
  const label = text(f.label, { class: 'region-label', x: (x0 + 28).toFixed(1), y: (y1 - 26).toFixed(1) }, g);
  label.setAttribute('transform', `matrix(${COS30.toFixed(4)} ${SIN30} ${(-COS30).toFixed(4)} ${SIN30} 0 ${-z1})`);
  return g;
}
