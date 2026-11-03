---
status: accepted
date: 2026-11-04
---

# 0012. How the reference-parity screens are built

## Context

Decision 0009 made the reference's screens the design bar. Building them raised choices that `DESIGN.md` leaves open: how illustrations are drawn, what the event log's time means for in-process steps, how the decoder links fields to bytes, and how much prose a step may carry.

## Decision

- **Illustrations** are drawn in code from isometric primitives (boxes, discs, lines) in `src/scene/iso.ts` and `icons.ts`, tinted by the node kind's color. A lesson picks one with `icon`.
- **Reveal and camera:** a node appears, with a short rise and fade, on the step where it is first used. The camera eases the `viewBox` to frame the nodes the step uses, at least 760 × 470 scene units, matched to the element's aspect ratio.
- **Sequence view** shares the player with the network view; both are always in step, and the UI only switches which one is visible.
- **Event log time** is the playback timeline at 1× (step animation plus dwell). In-process steps take microseconds, and no lesson should invent latencies. Sizes appear only for records whose `raw` is the exact wire bytes.
- **Decoder linking:** each field may give its exact `span` in `raw`; spans are matched in field order. Text between spans belongs to the segment before it, which gives the colored runs and the layer bar's proportions.
- **Compact steps:** at most 320 characters of prose, 2 to 4 facts, a summary of at most 90 characters. Longer explanation moves to the lesson's `overview` sections, which carry their own sources. The schema test enforces these limits.
- **Home route:** there is no separate home page; `#/` opens the first lesson and the topic drawer.

## Reason

- Code-drawn illustrations keep the bundle small, theme with CSS, and copy nothing from the reference.
- A playback clock is honest; a fake "0.42 ms" next to sourced facts would look like a fact.
- Text spans are easy to write and check: the schema test fails when a span is not in the message.

## Alternatives

- Hand-drawn SVG files per icon — more detail, but per-theme colors and consistent stroke weights get harder.
- Byte offsets per field — exact, but easy to get wrong when a message changes.
