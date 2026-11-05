// Tiny helpers for building SVG with createElementNS. Attributes only; never inline
// `style` attributes, which the CSP blocks. Styling lives in CSS classes.

export const SVG_NS = 'http://www.w3.org/2000/svg';

type Attrs = Record<string, string | number | undefined>;

export function svg<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attrs: Attrs = {},
  parent?: Element,
): SVGElementTagNameMap[K] {
  const node = document.createElementNS(SVG_NS, tag);
  setAttrs(node, attrs);
  parent?.appendChild(node);
  return node;
}

export function setAttrs(node: Element, attrs: Attrs): void {
  for (const [key, value] of Object.entries(attrs)) {
    if (value !== undefined) node.setAttribute(key, String(value));
  }
}

export function text(content: string, attrs: Attrs, parent?: Element): SVGTextElement {
  const node = svg('text', attrs, parent);
  node.textContent = content;
  return node;
}

/** Estimated advance of a label: Iosevka is 0.5em per Latin glyph; Hangul is ~1em. */
export function textWidth(value: string, fontSize: number): number {
  let em = 0;
  for (const ch of value) em += /[\u1100-\u11ff\u3000-\u9fff\uac00-\ud7af\uff00-\uffef]/.test(ch) ? 1 : 0.5;
  return em * fontSize;
}

export function clearChildren(node: Element): void {
  while (node.firstChild) node.removeChild(node.firstChild);
}
