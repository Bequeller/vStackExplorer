// Small inline SVG icons for buttons (our own drawings). Decorative: aria-hidden.
const NS = 'http://www.w3.org/2000/svg';

const paths = {
  menu: 'M4 6h16M4 12h16M4 18h16',
  close: 'M6 6l12 12M18 6L6 18',
  prev: 'M15 5l-7 7 7 7',
  next: 'M9 5l7 7-7 7',
  play: 'M8 5v14l11-7z',
  pause: 'M8 5v14M16 5v14',
  step: 'M6 5v14l9-7zM18 5v14',
  restart: 'M5 12a7 7 0 1 0 2-5M5 4v4h4',
  network: 'M5 7a2 2 0 1 0 0 .01M19 7a2 2 0 1 0 0 .01M12 18a2 2 0 1 0 0 .01M6.5 8.5l4.5 8M17.5 8.5l-4.5 8M7 7h10',
  sequence: 'M6 4v16M12 4v16M18 4v16M6 8h6M12 12h6M18 16h-12',
  book: 'M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM4 21V5M8 7h7',
  sun: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
  moon: 'M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z',
  decode: 'M4 6h16M4 12h10M4 18h7M17 14l3 3-3 3',
  replay: 'M4 12a8 8 0 1 0 2.3-5.6M4 4v5h5M10 9v6l5-3z',
} as const;

export type GlyphName = keyof typeof paths;

export function glyph(name: GlyphName): SVGSVGElement {
  const el = document.createElementNS(NS, 'svg');
  el.setAttribute('viewBox', '0 0 24 24');
  el.setAttribute('class', `glyph glyph--${name}`);
  el.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS(NS, 'path');
  path.setAttribute('d', paths[name]);
  el.appendChild(path);
  return el;
}

function node<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string>, parent?: Element): SVGElementTagNameMap[K] {
  const created = document.createElementNS(NS, tag);
  for (const [key, value] of Object.entries(attrs)) created.setAttribute(key, value);
  parent?.appendChild(created);
  return created;
}

/** The logo mark: an isometric cube inside four corner brackets (our own drawing). */
export function logo(): SVGSVGElement {
  const mark = node('svg', { viewBox: '0 0 40 40', class: 'logo', 'aria-hidden': 'true' });
  node('path', { class: 'logo-frame', d: 'M2 12V2h10M28 2h10v10M38 28v10H28M12 38H2V28' }, mark);
  node('path', { class: 'logo-cube', d: 'M20 9l9.5 5.5v11L20 31l-9.5-5.5v-11zM10.5 14.5L20 20l9.5-5.5M20 20v11' }, mark);
  return mark;
}

/** Hidden gradients for the scene illustrations' faces; colors come from CSS (`.g-*` classes). */
export function iconDefs(): SVGSVGElement {
  const root = node('svg', { class: 'icon-defs', width: '0', height: '0', 'aria-hidden': 'true', focusable: 'false' });
  const defs = node('defs', {}, root);
  for (const face of ['top', 'left', 'right']) {
    const gradient = node('linearGradient', { id: `vse-face-${face}`, x1: '0', y1: '0', x2: '0', y2: '1' }, defs);
    node('stop', { offset: '0', class: `g-${face}-a` }, gradient);
    node('stop', { offset: '1', class: `g-${face}-b` }, gradient);
  }
  return root;
}
