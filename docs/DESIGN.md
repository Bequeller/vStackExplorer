---
last-verified: 2026-11-03
sources: [https://protocol-explorer-alpha.vercel.app/]
---

# Design

## Reference

Protocol Explorer (protocol-explorer-alpha.vercel.app, by Dilum Sanjaya), observed on 2026-11-03. Take ideas from it, never code or assets. What makes it work:

- One scene per lesson: a small set of labeled components and the links between them. A colored token moves along a link for each step.
- A step list beside the scene. Each step has a short title, a one-line description, a longer explanation, and a small facts table with exact values (ports, sizes, flags).
- Every message can be opened and decoded field by field. The numbers come from real constants, not round guesses.
- Plain, calm visuals: a monospace typeface (Iosevka), a light theme and a dark navy theme, few colors, each with a meaning.
- Motion explains, never decorates. Movement uses easing, and reduced-motion users get instant transitions.

## Principles for this project

- Accuracy over volume. A wrong fact is worse than a missing step.
- One mechanism per lesson. If a lesson needs two scenes, split it.
- `move` for things that travel (requests, events, packets). `mutate` for state inside a component (tree pages, locks, read views, IP pools). Show the state change visibly, not only in prose.
- The decoded-record panel is the heart of the lesson: show the real structure (InnoDB record header fields, HTTP headers, Pod spec fields) with real field names.
- Color carries meaning and stays the same across lessons: one color per actor or data kind, with text labels, never color alone.

## Color meaning

Defined once as CSS custom properties in `src/styles/app.css`, with light and dark values. A legend under each scene names every color the lesson uses.

| Kind | Token | Meaning |
|---|---|---|
| Node `client` | `--kind-client` (slate) | Outside caller: browser, curl, another service |
| Node `container` | `--kind-container` (orange) | Runtime hosting the app: servlet container, kubelet, OS |
| Node `framework` | `--kind-framework` (blue) | Framework infrastructure: `DispatcherServlet`, Buffer Pool |
| Node `app` | `--kind-app` (green) | Code the application developer writes |
| Node `storage` | `--kind-storage` (brown) | Persistent state: disk, table, log |
| Token `request` | `--token-request` (magenta) | An inbound request |
| Token `response` | `--token-response` (teal) | An outbound response |
| Token `call` | `--token-call` (violet) | A method call inside the process |
| Token `data` | `--token-data` (amber) | A value or payload handed between components |

Changed rows in a node-state panel get the `--hl` background; the old value fades out with a strike-through while the new one fades in.

## Layout and theme

- Desktop: scene, legend, controls, and the decoded-record panel on the left; detail panel above the step list on the right. Phone (≤ 900px): scene, then detail, record, and step list, no page-level horizontal scroll, 16px side gutter. On a phone the scene keeps a 640px minimum width inside its own horizontal scroller and scrolls to the active node on each step.
- Light and dark themes from CSS custom properties, following the system setting, with a manual toggle remembered in `localStorage`.
- Keyboard: arrow keys for previous and next step, space for play and pause.
- Typeface: Iosevka (self-hosted from its OFL release) for code and labels; the system sans-serif stack for Korean prose if Iosevka lacks Hangul.

## Review

UI work is reviewed with the `impeccable` skill against this document and with `web-design-guidelines` as a checklist.
