import { describe, expect, it } from 'vitest';
import { validateTopic } from '../src/engine';
import type { Region, TopicMeta } from '../src/lessons/types';
import { meta as spring } from '../src/lessons/spring-boot/meta';
import { iso } from '../src/scene/iso';
import { SLAB, nodeLifts, regionFootprints, regionWhere, toGround } from '../src/scene/regions';

/** A small map on the iso ground grid: two nodes inside a region, one outside. */
function mapWith(regions: Region[]): TopicMeta {
  const at = (gx: number, gy: number): { x: number; y: number } => {
    const [x, y] = iso(gx, gy, 0);
    return { x: x + 1000, y: y + 800 };
  };
  return {
    ...spring,
    layout: {
      width: 3000,
      height: 2000,
      nodes: [
        { id: 'a', label: 'A', kind: 'app', icon: 'service', ...at(0, 0) },
        { id: 'b', label: 'B', kind: 'app', icon: 'service', ...at(200, 0) },
        { id: 'c', label: 'C', kind: 'storage', icon: 'database', ...at(1200, 0) },
        { id: 'd', label: 'D', kind: 'client', icon: 'laptop', ...at(-900, 0) },
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

  it('computes footprints from members, nests children, and lifts each node onto its innermost slab', () => {
    const meta = mapWith([
      { id: 'host', label: 'host', nodes: ['c'] },
      { id: 'proc', label: 'JVM', nodes: ['a', 'b'], parent: 'host' },
    ]);
    expect(validateTopic(meta)).toEqual([]);
    const f = regionFootprints(meta.layout);
    expect(f.get('proc')?.depth).toBe(2);
    expect(f.get('host')!.x0).toBeLessThan(f.get('proc')!.x0);
    const lifts = nodeLifts(meta.layout);
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
