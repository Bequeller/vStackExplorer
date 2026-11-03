// Small DOM builder. Text goes in through textContent only (never innerHTML),
// and styling through classes (the CSP blocks inline style attributes).

type Child = Node | string | null | undefined | false;
type Attrs = Record<string, string | number | boolean | undefined>;

export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Attrs = {},
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === undefined || value === false) continue;
    if (key === 'class') el.className = String(value);
    else el.setAttribute(key, value === true ? '' : String(value));
  }
  append(el, ...children);
  return el;
}

export function append(parent: Node, ...children: Child[]): void {
  for (const child of children) {
    if (child === null || child === undefined || child === false) continue;
    parent.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
  }
}

/** Renders lesson prose: blank lines split paragraphs, `backticks` become <code>. */
export function prose(source: string): DocumentFragment {
  const fragment = document.createDocumentFragment();
  for (const paragraph of source.trim().split(/\n\s*\n/)) {
    fragment.appendChild(h('p', {}, ...inlineCode(paragraph.replace(/\s*\n\s*/g, ' '))));
  }
  return fragment;
}

export function inlineCode(source: string): Child[] {
  return source.split(/(`[^`]+`)/).map((part) =>
    part.startsWith('`') && part.endsWith('`') && part.length > 1 ? h('code', {}, part.slice(1, -1)) : part,
  );
}

/** Like replaceChildren, but skips null, undefined, and false children. */
export function replace(parent: Element, ...children: Child[]): void {
  parent.replaceChildren();
  append(parent, ...children);
}
