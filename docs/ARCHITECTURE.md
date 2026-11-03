---
last-verified: 2026-11-03
sources: [docs/decisions/0002-vite-vanilla-ts-svg.md, docs/decisions/0003-lessons-as-sourced-data.md, docs/decisions/0004-sources-pinned-to-release-tags.md, docs/decisions/0005-lesson-files-and-engine-api.md, docs/decisions/0007-csp-in-built-site.md]
---

# Architecture

## Modules

| Module | Owns | Must not |
|---|---|---|
| `src/engine/` | Step playback (play, pause, next, previous, seek), timing, easing, reduced-motion handling, lesson validation (`validate.ts`) | Know any topic |
| `src/scene/` | SVG primitives: nodes, links, moving tokens, node-state views (table, list), highlight; the `SceneDriver` interface (`driver.ts`) | Hold lesson text |
| `src/ui/` | Layout, step list, detail panel, decoded-record panel, self-check, theme, routing, lesson registry | Touch SVG internals directly (it calls `mountLesson` from `engine`) |
| `src/lessons/<topic>/` | One folder per topic: `meta.ts` (title, order, pinned versions, lesson ids) and one `<lesson-id>.ts` per lesson | Import anything but `src/lessons/types.ts` — not even a sibling file |
| `src/lessons/types.ts` | The lesson schema types | Depend on anything else |
| `src/styles/` | Theme tokens, layout, scene classes, `@font-face` | Hold per-lesson styles |
| `tests/` | Schema, import-rule, and playback tests | Test implementation details |

## Dependency direction

`ui` → `engine` → `scene`; all may read `lessons/types.ts`. Only `ui` loads lesson data (through `import.meta.glob` in `ui/registry.ts`). Lessons import only `lessons/types.ts`. Enforced by `tests/imports.test.ts`.

The engine's public API (`src/engine/index.ts`) is `mountLesson(host, lesson, startIndex, options)`, which draws the scene and returns a `Player`. `Player` takes any `SceneDriver`, so tests drive it with a fake scene and a manual clock.

## Lesson format

A lesson is a typed data object (`Lesson` in `src/lessons/types.ts`), exported as `lesson` from `src/lessons/<topic>/<lesson-id>.ts`. The file name must equal `id`, and `id` must be listed in the topic's `meta.ts` (`export const meta: TopicMeta`). The URL is `#/<topic>/<lesson-id>[/<step>]`.

- `id`, `topic`, `title`, `summary`, `versions` (for example `{ "Spring Boot": "4.1.2" }`, checked against the official site when written). `versions` must equal the topic's `meta.versions`; lessons cannot import `meta.ts`, so the schema test checks they match.
- `scene`: the SVG viewBox size in scene units (the Spring lesson uses 1000 × 640).
- `nodes`: components on the scene with a center position, a label, an optional sublabel, and a `kind` that picks the color: `client`, `container`, `framework`, `app`, or `storage` (see `docs/DESIGN.md`).
- `states`: the node-state panels (a `table` with columns and rows, or a `list`), with their position and initial content. A `mutate` step can only change a node that has one.
- `steps`: ordered list. Each step has:
  - `kind`: `move` (a token travels between nodes, like a request or a packet) or `mutate` (state changes inside one node, like a B+Tree page split, a lock being granted, or an IP attached to an ENI).
  - `move` has `from`, `to`, and a `token` (`kind`: `request`, `response`, `call`, or `data`, plus a short label).
  - `mutate` has `node` and `after`: the node's whole state view after the step. The engine computes each step's before/after states; the scene highlights the rows that changed.
  - `id`, `title`, `summary` (one line for the step list), `detail` (Korean prose; blank lines split paragraphs, `` `code` `` is rendered as code), `facts` (key/value rows).
  - `record` (optional): a decoded structure shown field by field (`raw` text plus `fields` with real field names), like an InnoDB record header, an HTTP request, or a Pod spec.
  - `sources`: at least one `{ url, version, label }` pointing to official documentation or source code. Pin URLs to the release tag (see decision 0004).
- `selfCheck`: questions with answers, answered without the page.

`src/engine/validate.ts` checks the rules types cannot express (sources, node references, panel shapes, no functions). `tests/lesson-schema.test.ts` runs it on every lesson.

## Invariants

- Every step has at least one source with a URL and a version — enforced by the lesson schema test.
- Lessons contain no functions or engine imports — enforced by the import test.
- The site runs from static files with no external requests at runtime — enforced by a CSP meta tag (`default-src 'self'`) in `index.html`. The dev server drops that tag because Vite injects inline styles in dev; the built site keeps it (decision 0007). No inline `style` attributes or `data:` assets: styling goes through classes or the CSSOM, and `assetsInlineLimit` is 0.

## Data flow

URL hash (`#/<topic>/<lesson>[/<step>]`) → `ui` loads the lesson data → `engine` plays its steps → `scene` draws `move` and `mutate` steps → `ui` shows the detail and record panels for the current step and writes the step number back to the hash with `history.replaceState`.

## Deploy

- Vite builds to `dist/` with `base: '/vStackExplorer/'`.
- Hash routing, so GitHub Pages needs no server rewrites.
- `.github/workflows/deploy.yml` runs `npm ci`, `check`, `test`, `build`, and `scripts/check-docs.sh` on push to `main`, then deploys `dist/` with `actions/upload-pages-artifact@v5` and `actions/deploy-pages@v5`. Pages source is set to GitHub Actions.
- Fonts are served from `public/fonts/` (see `public/fonts/iosevka/README.md` and decision 0006).
