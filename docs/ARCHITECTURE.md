---
last-verified: 2026-11-04
sources: [docs/decisions/0002-vite-vanilla-ts-svg.md, docs/decisions/0003-lessons-as-sourced-data.md, docs/decisions/0004-sources-pinned-to-release-tags.md, docs/decisions/0005-lesson-files-and-engine-api.md, docs/decisions/0007-csp-in-built-site.md, docs/decisions/0010-reference-parity-implementation.md]
---

# Architecture

## Modules

| Module | Owns | Must not |
|---|---|---|
| `src/engine/` | Step playback (play, pause, next, previous, seek, restart, speed), timing, easing, reduced-motion handling, the event timeline (`timeline.ts`), record layout (`record.ts`), lesson validation (`validate.ts`) | Know any topic |
| `src/scene/` | Our own isometric illustrations (`iso.ts`, `icons.ts`), the network view with progressive reveal, eased camera, links, tokens, and state badges (`networkView.ts`), the sequence view (`sequenceView.ts`), and the `SceneDriver` interface (`driver.ts`) | Hold lesson text; draw node-state tables |
| `src/ui/` | The app shell (top bar, topic drawer), step details, event log, decoder, overview sheet, player controls, theme, routing, progress, lesson registry | Touch SVG internals directly (it calls `mountLesson` from `engine`) |
| `src/lessons/<topic>/` | One folder per topic: `meta.ts` (title, order, pinned versions, lesson ids) and one `<lesson-id>.ts` per lesson | Import anything but `src/lessons/types.ts` — not even a sibling file |
| `src/lessons/types.ts` | The lesson schema types | Depend on anything else |
| `src/styles/` | Theme tokens, layout, scene classes, `@font-face` | Hold per-lesson styles |
| `tests/` | Schema, import-rule, and playback tests | Test implementation details |

## Dependency direction

`ui` → `engine` → `scene`; all may read `lessons/types.ts`. Only `ui` loads lesson data (through `import.meta.glob` in `ui/registry.ts`). Lessons import only `lessons/types.ts`. Enforced by `tests/imports.test.ts`.

The engine's public API (`src/engine/index.ts`) is `mountLesson(host, lesson, startIndex, options)`, which draws both scene views and returns a `LessonView`: the `Player`, the event `timeline`, and `setMode('network' | 'sequence')`. `Player` takes any `SceneDriver` (`begin(step, index, before, after)`, `update(step, t)`), so tests drive it with a fake scene and a manual clock. The UI also uses `layoutRecord()` for the decoder and `changedRows()` for state changes.

## Lesson format

A lesson is a typed data object (`Lesson` in `src/lessons/types.ts`), exported as `lesson` from `src/lessons/<topic>/<lesson-id>.ts`. The file name must equal `id`, and `id` must be listed in the topic's `meta.ts` (`export const meta: TopicMeta`). The URL is `#/<topic>/<lesson-id>[/<step>]`.

- `id`, `topic`, `title`, `subtitle` (short name for the drawer and top bar), `summary`, `versions` (for example `{ "Spring Boot": "4.1.2" }`, checked against the official site when written). `versions` must equal the topic's `meta.versions`; lessons cannot import `meta.ts`, so the schema test checks they match.
- `scene`: the world size in scene units (the Spring lesson uses 1320 × 960). The camera frames part of it at each step.
- `layers`: the lesson's layers (for example Servlet, Spring MVC, Application), shown in the top bar's layer selector and the event log.
- `nodes`: components with a base-center position, a label, an optional sublabel, a `kind` that picks the color (`client`, `container`, `framework`, `app`, `storage`; see `docs/DESIGN.md`), and an `icon` that picks the illustration (`laptop`, `server`, `filter-stack`, `hub`, `index`, `adapter`, `converter`, `controller`, `service`, `repository`, `database`, `k8s-node`). A node appears on the step where it is first used.
- `states`: a node's inner state (a `table` or a `list`) and its initial content. It is not drawn on the scene: the node shows a badge once a `mutate` step changes it, and the step details show the change. A `mutate` step can only change a node that has one.
- `steps`: ordered list. Each step has:
  - `kind`: `move` (a token travels between nodes, like a request or a packet) or `mutate` (state changes inside one node, like a B+Tree page split, a lock being granted, or an IP attached to an ENI).
  - `move` has `from`, `to`, and a `token` (`kind`: `request`, `response`, `call`, or `data`, plus a short label).
  - `mutate` has `node` and `after`: the node's whole state view after the step. The engine computes each step's before/after states; the scene highlights the rows that changed.
  - `id`, `layer`, `title`, `summary` (the subtitle and the event log's info; at most 90 characters), `detail` (Korean prose, at most 320 characters, about 5 lines; `` `code` `` is rendered as code), `facts` (2 to 4 key/value rows), and optional `lines` (up to 4 key lines for the message card).
  - `record` (optional): a decoded message for the decoder: `title`, `protocol`, `raw`, `wire` (true when `raw` is the exact bytes, with `\r\n` for CRLF; the size is then counted from it), `segments` (the bands of the layer bar), and `fields`. Each field has its real `name`, `value`, a one-line `note`, its `segment`, an optional `span` (its exact text in `raw`; spans are matched in field order so hovering links field and bytes), and `example: true` for per-run values (tagged "E.G.").
  - `sources`: at least one `{ url, version, label }` pointing to official documentation or source code. Pin URLs to the release tag (see decision 0004).
- `overview`: lesson-level sections (`title`, `body`, `sources`) for the longer explanation behind the "개요" button.
- `selfCheck`: questions with answers, answered without the page.

`src/engine/validate.ts` checks the rules types cannot express (sources, node and layer references, fact and prose limits, record spans and segments, state shapes, no functions). `tests/lesson-schema.test.ts` runs it on every lesson.

The event log's time column is the playback timeline at 1× (step animation plus dwell), not a measured latency; sizes appear only for `wire` records (decision 0010).

## Invariants

- Every step has at least one source with a URL and a version — enforced by the lesson schema test.
- Lessons contain no functions or engine imports — enforced by the import test.
- The site runs from static files with no external requests at runtime — enforced by a CSP meta tag (`default-src 'self'`) in `index.html`. The dev server drops that tag because Vite injects inline styles in dev; the built site keeps it (decision 0007). No inline `style` attributes or `data:` assets: styling goes through classes or the CSSOM, and `assetsInlineLimit` is 0.

## Data flow

URL hash (`#/<topic>/<lesson>[/<step>]`; `#/` opens the first lesson with the drawer) → `ui` loads the lesson data → `engine` builds the timeline and plays the steps → `scene` reveals nodes, moves the camera, and draws `move` and `mutate` steps in both views → `ui` shows the step details, grows the event log, and writes the step number back to the hash with `history.replaceState`. Progress per lesson (started, done) is kept in `localStorage`.

## Deploy

- Vite builds to `dist/` with `base: '/vStackExplorer/'`.
- Hash routing, so GitHub Pages needs no server rewrites.
- `.github/workflows/deploy.yml` runs `npm ci`, `check`, `test`, `build`, and `scripts/check-docs.sh` on push to `main`, then deploys `dist/` with `actions/upload-pages-artifact@v5` and `actions/deploy-pages@v5`. Pages source is set to GitHub Actions.
- Fonts are served from `public/fonts/` (see `public/fonts/iosevka/README.md` and decision 0006).
