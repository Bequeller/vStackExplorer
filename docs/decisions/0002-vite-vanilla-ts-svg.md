---
status: accepted
date: 2026-11-03
---

# 0002. Vite, plain TypeScript, and hand-drawn SVG

## Context

The site must animate components and state changes smoothly, load fast, and stay simple for agents to extend topic by topic.

## Decision

Vite with plain TypeScript and no UI framework. Scenes are SVG built directly in code and animated with `requestAnimationFrame` and our own easing functions. No animation or charting library.

## Reason

The reference site was inspected on 2026-11-03: its single bundle (about 218 KB) has Vite markers and no signatures of React, Vue, Svelte, Preact, Lit, Solid, GSAP, D3, or three.js. It builds SVG with `createElementNS` and animates with `requestAnimationFrame`. That stack gives the look we want with no runtime dependency, and a static build fits GitHub Pages.

## Alternatives

- React with Framer Motion — more dependencies and bundle size for no gain in a mostly static scene.
- Canvas — harder to make accessible and to style per theme than SVG.
