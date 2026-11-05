// Test fixture: concurrent and return flows (decision 0015, ENG-3): a burst (`count`), a step
// with parallel moves, and a response on its return lane. Played by fixture.html?lesson=flows.
import type { Lesson, Source, TopicMeta } from '../../src/lessons/types';

const src: Source[] = [{ url: 'https://example.org/vstackexplorer-fixture', version: 'fixture', label: 'fixture' }];
const facts = [
  { key: 'fixture', value: 'yes' },
  { key: 'type', value: 'flows' },
];

export const meta: TopicMeta = {
  topic: 'fixture',
  title: 'Fixture',
  group: 'Spring',
  summary: 'Flow fixture.',
  order: 99,
  versions: { Fixture: '1' },
  checkedOn: '2026-11-04',
  lessons: ['flows'],
  layout: {
    nodes: [
      { id: 'users', label: 'Users', kind: 'client', icon: 'globe', gx: 0, gy: 0 },
      { id: 'app', label: 'App', kind: 'app', icon: 'service', gx: 1, gy: 0 },
      { id: 'db', label: 'DB', kind: 'storage', icon: 'database', gx: 2, gy: 1 },
      { id: 'lb', label: 'LB', kind: 'cloud', icon: 'load-balancer', gx: 2, gy: -1 },
    ],
  },
};

export const lesson: Lesson = {
  id: 'flows',
  topic: 'fixture',
  title: 'Flow fixture',
  subtitle: 'fixture',
  summary: 'A burst, parallel moves, and a return lane.',
  versions: { Fixture: '1' },
  layers: [{ id: 'l', label: 'Fixture' }],
  nodes: ['users', 'app', 'db', 'lb'],
  states: [],
  steps: [
    { id: 'request', layer: 'l', path: 'critical', kind: 'move', from: 'users', to: 'app', token: { kind: 'request', label: 'GET /orders/42' }, title: 'request', summary: 'request', detail: 'request', facts, sources: src },
    { id: 'stampede', layer: 'l', path: 'critical', kind: 'move', from: 'app', to: 'db', count: 200, token: { kind: 'request', label: 'SELECT' }, title: 'stampede', summary: 'All misses hit the DB at once.', detail: 'stampede', facts, sources: src },
    {
      id: 'race',
      layer: 'l',
      path: 'critical',
      kind: 'move',
      from: 'app',
      to: 'lb',
      token: { kind: 'call', label: 'deregister' },
      parallel: [{ from: 'app', to: 'db', token: { kind: 'call', label: 'close pool' } }],
      title: 'race',
      summary: 'Two flows start at once.',
      detail: 'race',
      facts,
      sources: src,
    },
    { id: 'response', layer: 'l', path: 'critical', kind: 'move', from: 'app', to: 'users', token: { kind: 'response', label: '200 OK' }, title: 'response', summary: 'The response returns on its own lane.', detail: 'response', facts, sources: src },
  ],
  overview: [{ title: 'fixture', body: 'fixture', sources: src }],
  selfCheck: [{ question: 'fixture?', answer: 'yes' }],
};
