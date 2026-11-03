// Dev-only icon gallery: `npm run dev`, then open /vStackExplorer/gallery.html.
// Not part of the production build (vite.config.ts builds index.html only).
import './styles/fonts.css';
import './styles/app.css';
import type { NodeKind } from './lessons/types';
import { drawIcon, iconKinds } from './scene/icons';
import { svg, text } from './scene/svg';

const kinds: NodeKind[] = ['client', 'container', 'framework', 'app', 'storage', 'cloud'];
const root = document.getElementById('gallery');
if (root) {
  root.className = 'gallery';
  const params = new URLSearchParams(location.search);
  if (params.get('theme')) document.documentElement.dataset.theme = params.get('theme') ?? '';
  iconKinds.forEach((icon, i) => {
    const cell = svg('svg', { viewBox: '-80 -120 160 170', class: 'gallery-cell scene-network', role: 'img', 'aria-label': icon }, root);
    const g = svg('g', { class: `node node--${kinds[i % kinds.length]} is-active` }, cell);
    drawIcon(g, icon);
    text(icon, { class: 'node-label', x: 0, y: 38, 'text-anchor': 'middle' }, g);
  });
}
