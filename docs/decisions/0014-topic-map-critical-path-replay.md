---
status: accepted
date: 2026-11-04
---

# 0014. One map per topic, a dominant critical path, and an end-of-lesson replay

## Context

Decision 0011 sets the north star: the structure and the critical-path flow, imprinted as one picture in 3 or fewer viewings, with must-know content only. Three engine gaps worked against it:

- Each lesson placed its own nodes, so lessons in one topic drew different maps.
- Every step looked equally important.
- Nothing showed the whole path at once.

## Decision

- **Topic map**: node identity and position live in the topic's `meta.ts` (`layout`). A lesson lists the ids it uses, and `placeLesson` resolves them. Validation rejects ids that are not on the map. A lesson may relabel a node for its role (label, sublabel, kind, icon), as the re-cut Kafka and Redis plans do, but may not move it.
- **Critical vs side**: every step has `path: 'critical' | 'side'`.
  - Critical links and tokens are drawn dominant.
  - Side links, tokens, and side-only nodes are weaker and appear only while a side step uses them.
  - The first step must be critical.
- **Replay**: `Player.replay()` plays the critical steps once, back to back, with no dwell.
  - During the replay, the camera frames the whole critical path, and all critical nodes stay visible.
  - It starts by itself when playback passes the last step, and from the player's replay button or the last step's details.
  - Any seek, step, play, or pause stops it.
- **Spring lesson trimmed to must-know**: 18 steps became 13 (12 critical, 1 side). The cuts are listed in the commit that made this change.

## Reason

- A fixed map is the structure the owner redraws. Moving nodes between lessons would make the owner relearn it.
- A visibly dominant path and a continuous replay give the single picture the north star asks for. Side paths stay available without competing with it.

## Alternatives

- Keep node positions per lesson and ask authors to copy them — drift is likely and nothing would check it.
- Replay every step, side steps included — this blurs the critical path the replay is meant to imprint.
