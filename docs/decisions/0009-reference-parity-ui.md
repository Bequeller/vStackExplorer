---
status: accepted
date: 2026-11-04
---

# 0009. Match the reference screen by screen

## Context

The first build (`35b8da8`) passed its checks. The owner still judged it far below the reference: it was a document page, the diagram used plain boxes, every node and table showed at once, and steps had long prose. The old `DESIGN.md` described the reference only in general terms ("labeled components", "a step list"), so a correct build could still miss it.

## Decision

`DESIGN.md` now lists the reference's required screens:

- an app shell with a topic drawer;
- an isometric illustrated scene with progressive reveal and a camera;
- a network/sequence toggle;
- a compact step-details card;
- an event log;
- a full-screen decoder with linked fields and bytes;
- player controls.

Acceptance is a side-by-side screenshot comparison at fixed viewports.

## Reason

What the owner values is the reference's visual and interaction quality. Without named screens and a visual acceptance check, "done" meant "tests pass", and tests cannot see that gap.

## Alternatives

- Keep the document layout and polish it — would not close the gap the owner named.
- Copy the reference's code or SVGs — no license; forbidden by `AGENTS.md`.
