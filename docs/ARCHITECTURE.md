---
last-verified: 2026-11-04
sources: [docs/decisions/0002-vite-vanilla-ts-svg.md, docs/decisions/0003-lessons-as-sourced-data.md, docs/decisions/0004-sources-pinned-to-release-tags.md, docs/decisions/0005-lesson-files-and-engine-api.md, docs/decisions/0007-csp-in-built-site.md, docs/decisions/0010-research-review-scope.md, docs/decisions/0011-north-star-structure-and-flow.md, docs/decisions/0012-reference-parity-implementation.md, docs/decisions/0013-shared-schema-rules-and-icons.md, docs/decisions/0014-topic-map-critical-path-replay.md]
---

# Architecture

## Modules

| Module | Owns | Must not |
|---|---|---|
| `src/engine/` | Step playback (play, pause, next, previous, seek, restart, speed, replay), timing, easing, reduced-motion handling, topic placement (`place.ts`), the event timeline (`timeline.ts`), record layout (`record.ts`), validation (`validate.ts`) | Know any topic |
| `src/scene/` | Our own isometric illustrations (`iso.ts`, `icons.ts`), the network view with progressive reveal, critical/side links, tokens, and state badges (`networkView.ts`), the eased camera (`camera.ts`), region slabs and their footprint geometry (`regions.ts`), the log/queue/tree state renderers (`stateViews.ts`), the sequence view (`sequenceView.ts`), and the `SceneDriver` interface (`driver.ts`) | Hold lesson text; draw `table` or `list` state on the scene, or more than one state inset at a time |
| `src/ui/` | The app shell (top bar, topic drawer), step details, event log, decoder, overview sheet, player controls, theme, routing, progress, lesson registry | Touch SVG internals directly (it calls `mountLesson` from `engine`) |
| `src/lessons/<topic>/` | One folder per topic: `meta.ts` (title, group, order, pinned versions, lesson ids, and the topic's map) and one `<lesson-id>.ts` per lesson | Import anything but `src/lessons/types.ts` — not even a sibling file |
| `src/lessons/types.ts` | The lesson schema types | Depend on anything else |
| `src/styles/` | Theme tokens, layout, scene classes, `@font-face` | Hold per-lesson styles |
| `src/gallery.ts`, `gallery.html`, `src/fixture.ts`, `fixture.html` | Dev-only pages (`npm run dev`, then `/vStackExplorer/gallery.html` or `/vStackExplorer/fixture.html`): every icon and state renderer, and the state-view fixture lesson (`tests/fixtures/state-views.ts`) played in the real UI; not built | Ship in `dist/` |
| `tests/` | Schema, import-rule, and playback tests | Test implementation details |

## Dependency direction

`ui` → `engine` → `scene`; all may read `lessons/types.ts`. Only `ui` loads lesson data (through `import.meta.glob` in `ui/registry.ts`). Lessons import only `lessons/types.ts`. Enforced by `tests/imports.test.ts`.

The engine's public API (`src/engine/index.ts`) is `mountLesson(host, lesson, meta, startIndex, options)`. It places the lesson on its topic's map (`placeLesson`), draws both scene views, and returns a `LessonView`: the `Player`, the `placed` lesson, the event `timeline`, and `setMode('network' | 'sequence')`. `Player` takes any `SceneDriver` (`begin(step, index, before, after, { replay })`, `update(step, t)`), so tests drive it with a fake scene and a manual clock. The UI also uses `layoutRecord()` for the decoder and `changedRows()` for state changes.

## Lesson format

A topic folder holds `meta.ts` (`export const meta: TopicMeta`) and one file per lesson (`export const lesson: Lesson`, file name = lesson `id`). The URL is `#/<topic>/<lesson-id>[/<step>]`. Every rule below is checked by `validateTopic` / `validateLesson` (`src/engine/validate.ts`), which `tests/lesson-schema.test.ts` runs on every topic and lesson.

### Topic: `meta.ts`

- `topic` (= folder name), `title`, `group` (drawer tab: `Spring`, `MySQL`, `Kafka`, `Redis`, `EKS`), `summary`, `order`, `versions` (pinned, checked on the official site on `checkedOn`), `lessons` (ids in study order).
- `layout`: the topic's one map, shared by all its lessons (docs/DESIGN.md: one layout per topic). `width`, `height`, `nodes`, and optional `regions`. Each node has `id`, `label`, optional `sublabel`, `kind`, `icon`, and the base-center `x`, `y` of its illustration.
  - `kind` picks the color: `client`, `container`, `framework`, `app`, `storage`, `cloud` (docs/DESIGN.md, Color meaning).
  - `icon` picks the illustration: one of the `IconKind`s in docs/DESIGN.md (Icons).
  - Place the critical path so it reads in one direction (outside → inside, caller → callee, memory above disk). Leave room for later lessons: a node may be on the map before any lesson uses it.
  - Spacing: an illustration with its label needs about 220 units across and 240 down. Plans in `docs/research/` that give positions on a 1000 × 640 grid should be scaled by about 2.
  - Lay out nodes on the iso ground grid: pick ground coordinates `(gx, gy)` and place each node at screen `x = (gx − gy)·cos30 + ox`, `y = (gx + gy)·0.5 + oy`. The Spring map uses 300-unit ground cells: the request runs along ground x.
- `layout.regions` (optional, decision 0015): boundaries such as a process, a machine, or a VPC, drawn as stacked isometric slabs. Each is `{ id, label, nodes, parent?, managed? }`. `nodes` lists the node ids directly inside it, `parent` nests it in another region, and `managed: true` marks a part the team does not run (drawn dashed).
  - The engine computes each slab's footprint: the ground bounding box of its members and child slabs, plus a 120-unit margin. Each nesting level stacks one slab (12 units) higher, and each node stands on its innermost slab. A slab appears with its first shown node.
  - Rules (`validateTopic`): region ids are unique; every member and parent exists; a node is in at most one region; parents form a tree; sibling slabs do not overlap; a node that is not in a region does not stand under its slab. Members of one region must sit along the iso ground grid, or the slab comes out loose and catches other nodes.

### Lesson

- `id`, `topic`, `title`, `subtitle` (short name for the drawer and top bar), `summary`, `versions` (must equal `meta.versions`; lessons cannot import `meta.ts`).
- `layers`: the lesson's layers (for example Servlet, Spring MVC, Application), shown in the layer selector and the event log.
- `nodes`: the topic map's nodes this lesson uses. Each entry is an id, or `{ id, label?, sublabel?, kind?, icon? }` to relabel a node for its role in this lesson (for example Kafka's `log` as `users-0`). The position never changes per lesson. Each id must be in `meta.layout`, and each listed node must be used by a step.
- `states`: a node's inner state with a `title` and the initial `view`. A node may have more than one view; then each has an `id` (for example a buffer pool's `lru` and `flush`). View types:
  - `table` (`columns`, `rows`) and `list` (`items`): shown only in the step details, with changed rows highlighted.
  - `log` (`entries`: `{ offset, label }` in ascending order; `markers`: `{ name, offset }`, such as HW, LEO, LSN, checkpoint). A marker may point past the last entry.
  - `queue` (`items` from head to tail, unique; `marks`: `{ name, at }` where `at` is a boundary from 0 before the head to `items.length` after the tail, such as the LRU midpoint).
  - `tree` (`levels`, root level first; each page `{ id, keys, children? }`, children in the next level), such as a B+Tree before and after a split.
  - `log`, `queue`, and `tree` also show as a small inset next to the node while a `mutate` step changes them: the markers slide, items move, new entries and pages fade in. After the step the inset collapses to the badge; at most one shows at a time (decision 0015). The engine's `diffView` computes what changed per type.
- `steps`: about 8 to 12, one mechanism (decision 0010). Each step has:
  - `id`, `layer`, `title`, `summary` (≤ 90 characters; the subtitle and the event log's info), `detail` (Korean, ≤ 320 characters, about 5 lines), `facts` (2 to 4 rows), optional `lines` (≤ 4 key lines for the message card), `sources` (≥ 1 `{ url, version, label }`, pinned to a release tag; decision 0004).
  - `path`: `critical` (the main path; drawn dominant and replayed) or `side` (a failure branch or detour; drawn weaker, shown only while used). The first step is critical.
  - `kind: 'move'` with `from`, `to`, and a `token` (`kind`: `request`, `response`, `call`, or `data`, and a short `label`). A move never changes state: it has no `node` or `after`.
  - `kind: 'mutate'` with `node`, optional `state`, and `after`. The node must have a `states` entry; when it has more than one view, `state` names the view's `id`. `after` is the view's **whole** content after the step: the same type, the same columns, every row or entry. It must differ from the view before the step.
  - `record` (optional): the message this step shows in the decoder. Records live only on steps; there is no lesson-level list. To show the same record on two steps, put it in a `const` in the lesson file. A step without a record cannot be decoded: its event-log row jumps to the step instead.
- `overview`: lesson-level sections (`title`, `body`, `sources`) for the longer explanation behind the "개요" button.
- `selfCheck`: questions with answers, answered without the page.

### Records

Every record has `title`, `protocol`, `segments` (the bands of the decoder's layer bar), `fields`, and says whether it is real bytes:

| `format` | `wire` | Raw data | Field position | Use for |
|---|---|---|---|---|
| `text` | `true` | `raw`: the exact text, `\r\n` for CRLF | `span`: the field's exact text in `raw`, matched in field order | HTTP, RESP, any text protocol |
| `binary` | `true` | `hex`: two-digit hex bytes separated by spaces; optional `baseOffset` for display | `offset` and `length` in bytes from the start of `hex`, in byte order, not overlapping | InnoDB page and record headers, Kafka request and record batch, any binary format |
| `fields` | `false` | none | none | in-memory structs, Kubernetes objects, CLI or API output. The decoder shows a field table |

Each field has its real `name`, `value`, a one-line `note`, its `segment`, and `example: true` for values that change per run (tagged "E.G."). Show only fields an engineer reads in practice (docs/PRODUCT.md, must-know only). Wire sizes are counted from the bytes.

The event log's time column is the playback timeline at 1× (step animation plus dwell), not a measured latency; sizes appear only for wire records (decision 0012).

## Authoring a topic

1. Read `docs/PRODUCT.md` (north star, must-know only), `docs/DESIGN.md` (Principles, Icons), and your plan in `docs/research/`.
2. Create `src/lessons/<topic>/meta.ts` with `export const meta: TopicMeta`. Design the topic's map first: every node the topic's lessons will need, placed so the critical path reads in one direction. Pick each node's `kind` and `icon` from the tables in `docs/DESIGN.md`. If no icon fits, ask for one in the shared engine; do not edit `src/scene/` from a topic session.
3. Create `src/lessons/<topic>/<lesson-id>.ts` with `export const lesson: Lesson`, importing only `type`s from `../types`. Add its id to `meta.lessons`. Use the Spring lesson (`src/lessons/spring-boot/request-flow.ts`) as the worked example.
4. Mark each step `critical` or `side`, and give each step only the facts and decoder fields that pass the must-know rule.
5. Run, and fix every message:
   - `npm run check` (types and lint)
   - `npm test` (schema, import rules, playback). The schema test prints every rule a lesson breaks.
   - `npm run build`
   - `scripts/check-docs.sh .`
6. Open the lesson in a browser (`npm run dev`, or `npm run build && npm run preview`) and play it through, including the replay, in both themes and at phone width. Check the console stays clean.
7. Commit only inside `src/lessons/<topic>/` (and `docs/` for that topic's notes).

## Invariants

- Every step has at least one source with a URL and a version — enforced by the lesson schema test.
- Lessons contain no functions or engine imports — enforced by the schema and import tests.
- Lesson nodes come from the topic map; a move never changes state; a mutate gives a state-bearing node's whole new view; records live on steps and say whether they are wire bytes — enforced by the schema test.
- The site runs from static files with no external requests at runtime — enforced by a CSP meta tag (`default-src 'self'`) in `index.html`. The dev server drops that tag because Vite injects inline styles in dev; the built site keeps it (decision 0007). No inline `style` attributes or `data:` assets: styling goes through classes or the CSSOM, and `assetsInlineLimit` is 0.

## Data flow

URL hash (`#/<topic>/<lesson>[/<step>]`; `#/` opens the first lesson with the drawer) → `ui` loads the lesson and its topic's `meta` → `engine` places the lesson on the topic map, builds the timeline, and plays the steps → `scene` reveals nodes, moves the camera, and draws `move` and `mutate` steps in both views → `ui` shows the step details, grows the event log, and writes the step number back to the hash with `history.replaceState`. After the last step, the player replays the critical steps once. Progress per lesson (started, done) is kept in `localStorage`.

## Deploy

- Vite builds to `dist/` with `base: '/vStackExplorer/'`.
- Hash routing, so GitHub Pages needs no server rewrites.
- `.github/workflows/deploy.yml` runs `npm ci`, `check`, `test`, `build`, and `scripts/check-docs.sh` on push to `main`, then deploys `dist/` with `actions/upload-pages-artifact@v5` and `actions/deploy-pages@v5`. Pages source is set to GitHub Actions.
- Fonts are served from `public/fonts/` (see `public/fonts/iosevka/README.md` and decision 0006).
