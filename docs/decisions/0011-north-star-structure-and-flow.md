---
status: accepted
date: 2026-11-04
---

# 0011. North star: structure and critical-path flow, must-know only

## Context

The first north star counted lessons whose self-check the owner passes. It said nothing about what a lesson should make the owner see. It also had no filter against trivia. The research plans showed the risk: many true but rarely needed facts, such as internal constants, version history, niche features, and config tables.

The owner stated the goal on 2026-11-04. For any concept, the owner must understand its structure and the flow of its critical path as one connected, visual picture. A few viewings must imprint it. The content must be what engineers will meet in real work, with no trivia.

## Decision

- North star (`docs/PRODUCT.md`): viewings until the owner can redraw the structure and critical-path flow from memory. The target is 3 or fewer per lesson. The count is the lessons that meet it.
- Content rule "must-know only" (`docs/PRODUCT.md`), enforced as a prohibition in `AGENTS.md`.
- Design rules that serve recall (`docs/DESIGN.md`):
  - structure first, then flow;
  - one fixed layout per topic;
  - a dominant critical path;
  - an end-of-lesson replay;
  - a decoder limited to the fields engineers read.

## Reason

The owner's own words set the goal and the filter. Recall is the outcome that matters. Every extra fact competes with the facts that matter, so filtering for must-know content serves recall directly.

## Alternatives

- Keep the self-check count — it measures recall of answers, not of the picture, and does not filter content.
- Leave "no trivia" to reviewer judgment — the research plans show that without a written rule, each session adds what it finds interesting.
