// Test fixture: one mutate of each structural view type (log, queue, tree), plus a node with two
// views. Not a lesson: it is not under src/lessons/, so it never ships. The dev page
// fixture.html plays it in the browser (decision 0015, ENG-2 done check).
import type { Lesson, Source, TopicMeta } from '../../src/lessons/types';

const src: Source[] = [{ url: 'https://example.org/vstackexplorer-fixture', version: 'fixture', label: 'fixture' }];
const facts = [
  { key: 'fixture', value: 'yes' },
  { key: 'type', value: 'state view' },
];

export const meta: TopicMeta = {
  topic: 'fixture',
  title: 'Fixture',
  group: 'Spring',
  summary: 'State view fixture.',
  order: 99,
  versions: { Fixture: '1' },
  checkedOn: '2026-11-04',
  lessons: ['state-views'],
  layout: {
    nodes: [
      { id: 'client', label: 'Client', kind: 'client', icon: 'laptop', gx: 0, gy: 0 },
      { id: 'broker', label: 'Broker', kind: 'container', icon: 'broker', gx: 1, gy: 0 },
      { id: 'bpool', label: 'Buffer pool', kind: 'framework', icon: 'buffer-pool', gx: 2, gy: 0 },
      { id: 'index', label: 'B+Tree', kind: 'storage', icon: 'btree', gx: 3, gy: 0 },
    ],
  },
};

export const lesson: Lesson = {
  id: 'state-views',
  topic: 'fixture',
  title: 'State view fixture',
  subtitle: 'fixture',
  summary: 'One mutate per structural view type.',
  versions: { Fixture: '1' },
  layers: [{ id: 'l', label: 'Fixture' }],
  nodes: ['client', 'broker', 'bpool', 'index'],
  states: [
    {
      node: 'broker',
      title: 'orders-0 log',
      view: {
        type: 'log',
        entries: [0, 1, 2, 3, 4].map((o) => ({ offset: o, label: `m${o}` })),
        markers: [{ name: 'HW', offset: 3 }, { name: 'LEO', offset: 5 }],
      },
    },
    { node: 'bpool', id: 'lru', title: 'LRU list', view: { type: 'queue', items: ['p1', 'p2', 'p3', 'p4', 'p5'], marks: [{ name: 'midpoint', at: 3 }] } },
    { node: 'bpool', id: 'flush', title: 'flush list', view: { type: 'queue', items: ['p2'], marks: [] } },
    {
      node: 'index',
      title: 'PRIMARY',
      view: {
        type: 'tree',
        levels: [[{ id: 'root', keys: ['1'], children: ['leaf1'] }], [{ id: 'leaf1', keys: ['1', '2', '3', '4'] }]],
      },
    },
  ],
  steps: [
    { id: 'go', layer: 'l', path: 'critical', kind: 'move', from: 'client', to: 'broker', token: { kind: 'request', label: 'produce' }, title: 'go', summary: 'go', detail: 'go', facts, sources: src },
    {
      id: 'hw',
      layer: 'l',
      path: 'critical',
      kind: 'mutate',
      node: 'broker',
      after: {
        type: 'log',
        entries: [0, 1, 2, 3, 4, 5].map((o) => ({ offset: o, label: `m${o}` })),
        markers: [{ name: 'HW', offset: 5 }, { name: 'LEO', offset: 6 }],
      },
      title: 'HW advances',
      summary: 'HW and LEO move along the log.',
      detail: 'HW moves from 3 to 5.',
      facts,
      sources: src,
    },
    {
      id: 'lru',
      layer: 'l',
      path: 'critical',
      kind: 'mutate',
      node: 'bpool',
      state: 'lru',
      after: { type: 'queue', items: ['p4', 'p1', 'p2', 'p3', 'p5'], marks: [{ name: 'midpoint', at: 3 }] },
      title: 'page to the head',
      summary: 'p4 moves to the head of the LRU.',
      detail: 'p4 moves to the head.',
      facts,
      sources: src,
    },
    {
      id: 'flush',
      layer: 'l',
      path: 'side',
      kind: 'mutate',
      node: 'bpool',
      state: 'flush',
      after: { type: 'queue', items: ['p2', 'p4'], marks: [] },
      title: 'page dirtied',
      summary: 'p4 joins the flush list.',
      detail: 'p4 joins the flush list.',
      facts,
      sources: src,
    },
    {
      id: 'split',
      layer: 'l',
      path: 'critical',
      kind: 'mutate',
      node: 'index',
      after: {
        type: 'tree',
        levels: [
          [{ id: 'root', keys: ['1', '3'], children: ['leaf1', 'leaf2'] }],
          [{ id: 'leaf1', keys: ['1', '2'] }, { id: 'leaf2', keys: ['3', '4', '5'] }],
        ],
      },
      title: 'page split',
      summary: 'The leaf splits in two.',
      detail: 'leaf1 splits; leaf2 is new.',
      facts,
      sources: src,
    },
  ],
  overview: [{ title: 'fixture', body: 'fixture', sources: src }],
  selfCheck: [{ question: 'fixture?', answer: 'yes' }],
};
