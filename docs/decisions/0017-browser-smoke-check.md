---
status: accepted
date: 2026-11-05
---

# 0017. A browser smoke check plays every step before deploy

## Context

Tests run in Node, so no test sees the drawn scene. Each lesson was checked by hand in a browser, step by step, at desktop and phone width. Scene bugs reached the live site this way: the state inset was cut off after a resize, and the camera framed it wrong on phones. About 45 more lessons are planned, so hand checks would not scale.

## Decision

- `npm run smoke` (`scripts/smoke.mjs`) serves the built site with `vite preview`. It opens every lesson linked from the app at 1280 × 800 and 375 × 812, with reduced motion so each step lands on its final frame. It walks every step.
- It fails on a console error or page error. It also fails when an active node (`.node.is-active`) or the state inset lies more than 4 px outside the scene.
- It drives the installed Google Chrome through `playwright-core` 1.64.1 (pinned exactly, released 2026-10-14). It downloads no browser. GitHub's `ubuntu-latest` runners ship Google Chrome, and CI runs the check after `build`.
- `validateTopic` also rejects two map nodes closer than an illustration's room (220 across, 240 down), since they would draw over each other.
- The check proves that steps play and that the parts that matter stay in frame. It does not judge layout quality, so a browser look at a new lesson stays part of the workflow.

## Reason

- The defects that reached users were all in-frame or runtime errors, and this check catches both. Before this change, a deliberate camera offset gave 31 failures and an injected console error gave 2.
- `playwright-core` without its bundled browsers keeps the install small (about 14 MB unpacked) and uses the Chrome both the owner's Mac and CI already have.

## Alternatives

- Full `playwright` with bundled browsers — a large download on every install, for no gain here.
- Screenshot diffs — they catch more, but every intended visual change would need its baselines updated.
- DOM tests in jsdom — they have no layout engine, so they cannot measure what is in frame.
