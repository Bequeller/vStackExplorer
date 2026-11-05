---
status: accepted
date: 2026-11-05
---

# 0018. Match the reference's layout and visual style

## Context

The owner compared the site with Protocol Explorer and asked for its layout and design elements as closely as possible. A side-by-side look on 2026-11-05 showed five gaps:

- Scene nodes are small and dim, so the active node does not stand out.
- Panels are rounded and soft, with small titles.
- The top bar has no logo mark, layer cells, or learning progress.
- The player is a separate round-button bar.
- The topic list is hidden in a drawer even on wide screens.

## Decision

- `docs/DESIGN.md` gets a "Visual style" section with values measured on the reference at 1440×900: colors, borders, radius, type sizes, button shapes, and the line-art look of scene nodes.
- "Required screens" now places the player in the event-log header and makes the topic list a permanent left column at 1280px and up.
- The camera frames every node shown so far, as the reference does, instead of only the current step's nodes. A cap of 1.45× the minimum frame keeps illustrations readable on long maps such as the 9-node Spring map: past the cap, the step's nodes stay in frame and the rest lean in from the edge. Node labels keep a 12px minimum on screen. (Added 2026-11-05, after the shell redesign shipped.)
- We write our own CSS and SVG for these values. We still copy no code, CSS, text, or assets from the reference, because it has no license (`AGENTS.md`). Layout, proportions, and measured colors are ideas, not copied expression.

## Reason

- The reference is the quality bar in `docs/DESIGN.md`. Matching its proven layout is faster than inventing one, and it serves the north star: a bright, framed active node and a fixed panel layout make the critical path easier to follow.
- Measured values give the implementer a concrete target and the reviewer a pass/fail check.

## Alternatives

- Copy the reference's CSS and SVG outright. This was rejected: there is no license, so it is not ours to copy.
- Keep our own style and fix only contrast. This was rejected: the owner asked for the reference's look.
