---
status: accepted
date: 2026-11-05
---

# 0016. Topic layouts give positions in ground-grid cells

## Context

A topic map gave each node the screen `x`, `y` of its illustration, plus the world `width` and `height`. Authors were already told to lay nodes out on the iso ground grid (0015), so they picked ground cells and converted them by hand: the Spring map's `x: 1079, y: 670` is cell (3, 0). About 45 more lessons are planned (`docs/research/`), and each topic map repeats this arithmetic. A slip puts a node off the grid, and the slab around it comes out loose.

## Decision

- A `TopicNode` gives `gx`, `gy`: its cell on the iso ground grid. One cell is 300 ground units (the Spring map's spacing). Fractions are allowed, but whole cells are the norm.
- `TopicLayout` has no `width` or `height`. The engine projects the cells to screen points (`projectLayout` in `src/engine/place.ts`) and sizes the world from the nodes plus a margin.
- The scene draws only projected layouts (`PlacedNode`, `PlacedLayout`); lessons never see screen coordinates.
- Validation checks that `gx` and `gy` are finite numbers. The old "position is outside the layout" rule goes away, because the world now always contains every node.

## Reason

- Authors think in the grid already. Writing the grid directly removes a conversion step from every topic map, and removes a class of off-grid mistakes.
- The world size is derived, so it cannot disagree with the nodes.

## Alternatives

- Accept both `x, y` and `gx, gy` — two formats for one fact, and validation would need to reject maps that mix them.
- Keep `x, y` and add a lint for off-grid nodes — it catches the slip but keeps the hand arithmetic.
