import type { Lesson, TopicLayout, TopicMeta } from '../lessons/types';
import type { PlacedLayout, PlacedLesson, PlacedNode } from '../scene/driver';
import { iso } from '../scene/iso';

/** One ground-grid cell, in scene units (decision 0016). */
export const CELL = 300;
/** Space around the outermost nodes, so the world holds their illustrations and labels. */
const MARGIN = 300;

/** Projects a topic map's grid cells to screen points and sizes the world around them. */
export function projectLayout(layout: TopicLayout): PlacedLayout {
  const pts = layout.nodes.map((n) => iso(n.gx * CELL, n.gy * CELL, 0));
  const x0 = Math.min(...pts.map((p) => p[0]));
  const y0 = Math.min(...pts.map((p) => p[1]));
  const x1 = Math.max(...pts.map((p) => p[0]));
  const y1 = Math.max(...pts.map((p) => p[1]));
  const nodes = layout.nodes.map((n, i): PlacedNode => {
    const [x, y] = pts[i]!;
    return { ...n, x: x - x0 + MARGIN, y: y - y0 + MARGIN };
  });
  if (nodes.length === 0) return { ...layout, nodes, width: 2 * MARGIN, height: 2 * MARGIN };
  return { ...layout, nodes, width: x1 - x0 + 2 * MARGIN, height: y1 - y0 + 2 * MARGIN };
}

/**
 * Resolves a lesson's node ids to the topic layout's positioned nodes, so every lesson in a
 * topic draws on the same map. Unknown ids are dropped here; `validateLesson` reports them.
 */
export function placeLesson(lesson: Lesson, meta: Pick<TopicMeta, 'layout'>): PlacedLesson {
  const layout = projectLayout(meta.layout);
  const byId = new Map(layout.nodes.map((n) => [n.id, n]));
  const nodes = lesson.nodes
    .map((ref): PlacedNode | undefined => {
      if (typeof ref === 'string') return byId.get(ref);
      const base = byId.get(ref.id);
      // Overrides change how the node is labeled and drawn, never where it sits.
      return base && { ...base, ...ref, gx: base.gx, gy: base.gy, x: base.x, y: base.y };
    })
    .filter((n): n is PlacedNode => n !== undefined);
  return { ...lesson, nodes, layout };
}
