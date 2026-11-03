import type { Lesson, TopicMeta, TopicNode } from '../lessons/types';
import type { PlacedLesson } from '../scene/driver';

/**
 * Resolves a lesson's node ids to the topic layout's positioned nodes, so every lesson in a
 * topic draws on the same map. Unknown ids are dropped here; `validateLesson` reports them.
 */
export function placeLesson(lesson: Lesson, meta: Pick<TopicMeta, 'layout'>): PlacedLesson {
  const byId = new Map(meta.layout.nodes.map((n) => [n.id, n]));
  const nodes = lesson.nodes
    .map((ref): TopicNode | undefined => {
      if (typeof ref === 'string') return byId.get(ref);
      const base = byId.get(ref.id);
      // Overrides change how the node is labeled and drawn, never where it sits.
      return base && { ...base, ...ref, x: base.x, y: base.y };
    })
    .filter((n): n is TopicNode => n !== undefined);
  return { ...lesson, nodes, world: { width: meta.layout.width, height: meta.layout.height } };
}
