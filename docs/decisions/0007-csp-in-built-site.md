---
status: accepted
date: 2026-11-03
---

# 0007. CSP applies to the built site; the dev server drops it

## Context

`index.html` carries `<meta http-equiv="Content-Security-Policy" content="default-src 'self'; ...">`. In development, Vite injects CSS through inline `<style>` elements, which `default-src 'self'` blocks, so `npm run dev` would render unstyled.

## Decision

Keep the CSP meta tag in `index.html` and in every build. A small Vite plugin (`apply: 'serve'`) removes it only when the dev server serves the page. Code never uses inline `style` attributes or `data:` assets; dynamic values go through classes or the CSSOM (`element.style.setProperty`), which CSP allows.

## Reason

- The deployed site is what must hold the invariant, and `vite preview` and the browser check run against the build with the CSP active.
- A nonce-based dev setup would need extra config for no benefit to the deployed site.

## Alternatives

- Add `'unsafe-inline'` to `style-src` — weakens the deployed policy.
- Inject the CSP tag only at build time — the source `index.html` would no longer show the policy.
