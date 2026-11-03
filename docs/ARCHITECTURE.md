---
last-verified: 2026-11-03
sources: [docs/decisions/0002-vite-vanilla-ts-svg.md, docs/decisions/0003-lessons-as-sourced-data.md]
---

# Architecture

## Modules

| Module | Owns | Must not |
|---|---|---|
| `src/engine/` | Step playback (play, pause, next, previous, seek), timing, easing, reduced-motion handling | Know any topic |
| `src/scene/` | SVG primitives: nodes, links, moving tokens, node-state views (table, tree, list, stack), highlight | Hold lesson text |
| `src/ui/` | Layout, step list, detail panel, decoded-record panel, self-check, theme, routing | Touch SVG internals directly |
| `src/lessons/<topic>/` | One folder per topic: lesson data files and its `meta.ts` (title, pinned versions) | Import from `engine`, `scene`, or `ui` (types from `src/lessons/types.ts` only) |
| `src/lessons/types.ts` | The lesson schema types | Depend on anything else |

## Dependency direction

`ui` → `engine` → `scene`; all may read `lessons/types.ts`. Lessons import only `lessons/types.ts`. Enforced by an import test (or lint rule) added with the first implementation.

## Lesson format

A lesson is a typed data object:

- `id`, `topic`, `title`, `summary`, `versions` (for example `{ "Spring Boot": "3.x" }`, checked against the official site when written).
- `nodes`: components on the scene with a position and kind (for example `Filter`, `DispatcherServlet`, `Buffer Pool`, `kubelet`).
- `steps`: ordered list. Each step has:
  - `kind`: `move` (a token travels between nodes, like a request or a packet) or `mutate` (state changes inside one node, like a B+Tree page split, a lock being granted, or an IP attached to an ENI).
  - `title`, `detail` (Korean prose), `facts` (key/value rows).
  - `record` (optional): a decoded structure shown field by field, like an InnoDB record header, an HTTP request, or a Pod spec.
  - `sources`: at least one `{ url, version }` pointing to official documentation or source code.
- `selfCheck`: questions answered without the page.

## Invariants

- Every step has at least one source with a URL and a version — enforced by the lesson schema test.
- Lessons contain no functions or engine imports — enforced by the import test.
- The site runs from static files with no external requests at runtime — enforced by a CSP meta tag (`default-src 'self'`).

## Data flow

URL hash (`#/<topic>/<lesson>`) → `ui` loads the lesson data → `engine` plays its steps → `scene` draws `move` and `mutate` steps → `ui` shows the detail and record panels for the current step.

## Deploy

- Vite builds to `dist/` with `base: '/vStackExplorer/'`.
- Hash routing, so GitHub Pages needs no server rewrites.
- `.github/workflows/deploy.yml` builds on push to `main` and deploys with the official Pages actions. Pages source is set to GitHub Actions.
