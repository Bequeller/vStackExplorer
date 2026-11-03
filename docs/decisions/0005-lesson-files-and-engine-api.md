---
status: accepted
date: 2026-11-03
---

# 0005. Lesson file layout and the engine API

## Context

Several sessions add topics in parallel, each owning one `src/lessons/<topic>/` folder (decision 0003). The UI must find new lessons without anyone editing a shared list, and `ui` must not touch the scene's SVG.

## Decision

- Each topic folder holds `meta.ts` (`export const meta: TopicMeta`) and one `<lesson-id>.ts` per lesson (`export const lesson: Lesson`). The file name equals the lesson id; `meta.lessons` lists the ids in study order; `meta.order` places the topic on the home page.
- Lesson files import only `src/lessons/types.ts`, not even a sibling `meta.ts`. A lesson repeats its topic's `versions`; the schema test fails if they differ.
- `ui/registry.ts` finds topics and lessons with `import.meta.glob`; each lesson becomes its own lazily loaded chunk.
- The engine exposes `mountLesson(host, lesson, startIndex, options)`, which builds the SVG scene and returns a `Player`. `Player` depends only on the `SceneDriver` interface in `scene/driver.ts`.
- Node-state views are `table` or `list` for now. Trees and stacks come when a lesson needs them.

## Reason

- A glob registry means a new topic is a new folder and nothing else, so parallel sessions never conflict.
- One rule ("only `types.ts`") is easy to test and to follow; allowing sibling imports would invite shared helpers that drift toward code.
- The `SceneDriver` seam lets the playback test drive the real engine with a fake scene and a manual clock.

## Alternatives

- A central `lessons/index.ts` list — every new topic would edit the same file.
- Letting lessons import `meta.ts` for versions — saves one duplicated object but weakens the import rule.
