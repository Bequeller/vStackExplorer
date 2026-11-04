// Dev-only page: plays tests/fixtures/state-views.ts (one mutate per structural view type), or
// tests/fixtures/flows.ts with ?lesson=flows (bursts, parallel moves, return lanes), with
// the real lesson UI. `npm run dev`, then open /vStackExplorer/fixture.html. Not built.
import './styles/fonts.css';
import './styles/app.css';
import * as flows from '../tests/fixtures/flows';
import * as states from '../tests/fixtures/state-views';
import { h } from './ui/dom';
import { renderLesson } from './ui/lessonView';

const root = document.getElementById('app');
if (root) {
  const now = h('div', { class: 'now' });
  const phoneCount = h('span', { class: 'phone-count' });
  const workspace = h('main', { class: 'workspace' });
  const overlays = h('div', { class: 'overlays' });
  root.replaceChildren(
    h('div', { class: 'app' }, h('header', { class: 'topbar' }, h('span', { class: 'brand' }, 'fixture'), phoneCount, now), workspace),
    overlays,
  );
  const params = new URLSearchParams(location.search);
  const { lesson, meta } = params.get('lesson') === 'flows' ? flows : states;
  const step = Number(params.get('step') ?? '1') - 1;
  renderLesson(lesson, meta, step, { now, phoneCount, workspace, overlays });
}
