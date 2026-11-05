import { describe, expect, it } from 'vitest';
import { validateTopic } from '../src/engine';
import { CELL, projectLayout } from '../src/engine/place';
import type { Region, TopicMeta } from '../src/lessons/types';
import { meta as spring } from '../src/lessons/spring-boot/meta';
import { iso } from '../src/scene/iso';
import { SLAB, nodeLifts, regionFootprints, regionWhere, toGround } from '../src/scene/regions';

/** A small map in ground-grid cells: two nodes close together, one farther on, one before. */
function mapWith(regions: Region[]): TopicMeta {
  return {
    ...spring,
    layout: {
      nodes: [
        { id: 'a', label: 'A', kind: 'app', icon: 'service', gx: 0, gy: 0 },
        { id: 'b', label: 'B', kind: 'app', icon: 'service', gx: 2 / 3, gy: -1 / 3 },
        { id: 'c', label: 'C', kind: 'storage', icon: 'database', gx: 4, gy: 0 },
        { id: 'd', label: 'D', kind: 'client', icon: 'laptop', gx: -3, gy: 0 },
      ],
      regions,
    },
  };
}
const has = (meta: TopicMeta, text: string): boolean => validateTopic(meta).some((e) => e.includes(text));

describe('regions', () => {
  it('maps a screen point back to the ground plane (the inverse of iso at z = 0)', () => {
    const [x, y] = iso(420, -180, 0);
    expect(toGround(x, y).map((v) => Math.round(v))).toEqual([420, -180]);
  });

  it('projects grid cells to screen points inside a world sized to the nodes, and rejects a node without a cell', () => {
    const layout = projectLayout(mapWith([]).layout);
    const a = layout.nodes.find((n) => n.id === 'a')!;
    const c = layout.nodes.find((n) => n.id === 'c')!;
    const [dx, dy] = iso(4 * CELL, 0, 0);
    expect(c.x - a.x).toBeCloseTo(dx);
    expect(c.y - a.y).toBeCloseTo(dy);
    for (const n of layout.nodes) {
      expect(n.x).toBeGreaterThan(0);
      expect(n.x).toBeLessThan(layout.width);
      expect(n.y).toBeGreaterThan(0);
      expect(n.y).toBeLessThan(layout.height);
    }
    const loose = mapWith([]);
    loose.layout.nodes[0] = { ...loose.layout.nodes[0]!, gx: Number.NaN };
    expect(has(loose, 'finite gx and gy')).toBe(true);
  });

  it('rejects two nodes that would draw over each other, and accepts neighboring cells', () => {
    expect(has(mapWith([]), 'too close')).toBe(false);
    const crowded = mapWith([]);
    crowded.layout.nodes[1] = { ...crowded.layout.nodes[1]!, gx: 0.5, gy: 0 };
    expect(has(crowded, 'is too close to "a"')).toBe(true);
  });

  it('computes footprints from members, nests children, and lifts each node onto its innermost slab', () => {
    const meta = mapWith([
      { id: 'host', label: 'host', nodes: ['c'] },
      { id: 'proc', label: 'JVM', nodes: ['a', 'b'], parent: 'host' },
    ]);
    expect(validateTopic(meta)).toEqual([]);
    const layout = projectLayout(meta.layout);
    const f = regionFootprints(layout);
    expect(f.get('proc')?.depth).toBe(2);
    expect(f.get('host')!.x0).toBeLessThan(f.get('proc')!.x0);
    const lifts = nodeLifts(layout);
    expect(lifts.get('a')).toBe(2 * SLAB);
    expect(lifts.get('c')).toBe(SLAB);
    expect(lifts.get('d')).toBeUndefined();
  });

  it.each([
    ['a duplicate region id', [{ id: 'r', label: 'R', nodes: ['a'] }, { id: 'r', label: 'R2', nodes: ['c'] }], 'duplicate region id'],
    ['an unknown member node', [{ id: 'r', label: 'R', nodes: ['zz'] }], 'is not in the layout'],
    ['a node in two regions', [{ id: 'r', label: 'R', nodes: ['a'] }, { id: 's', label: 'S', nodes: ['a'] }], 'at most one region'],
    ['an unknown parent', [{ id: 'r', label: 'R', nodes: ['a'], parent: 'nope' }], 'is not a region'],
    ['a parent cycle', [{ id: 'r', label: 'R', nodes: ['a'], parent: 's' }, { id: 's', label: 'S', nodes: ['c'], parent: 'r' }], 'cycle'],
    ['overlapping sibling slabs', [{ id: 'r', label: 'R', nodes: ['a'] }, { id: 's', label: 'S', nodes: ['b'] }], 'overlaps sibling'],
    ['a non-member under a slab', [{ id: 'r', label: 'R', nodes: ['a', 'c'] }], 'is not in it'],
  ] as [string, Region[], string][])('rejects %s', (_case, regions, message) => {
    expect(has(mapWith(regions), message)).toBe(true);
  });

  it('names where a step runs: the nested region path, distinct places joined', () => {
    const regions: Region[] = [
      { id: 'host', label: 'Host', nodes: ['c'] },
      { id: 'jvm', label: 'JVM', nodes: ['a', 'b'], parent: 'host' },
    ];
    expect(regionWhere({ regions }, ['d', 'a', 'b'])).toBe('Host › JVM');
    expect(regionWhere({ regions }, ['a', 'c'])).toBe('Host › JVM ↔ Host');
    expect(regionWhere({ regions }, ['d'])).toBe('');
  });
});
