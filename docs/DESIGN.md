---
last-verified: 2026-11-04
sources: [https://protocol-explorer-alpha.vercel.app/]
---

# Design

## Reference

Protocol Explorer (protocol-explorer-alpha.vercel.app, by Dilum Sanjaya), played through on 2026-11-04. Take ideas from it, never code or assets: every illustration and style here is our own. The quality bar is that reference, screen by screen. The first build (commit `35b8da8`) met the old, vaguer version of this section but not the bar: it was a document page with a flat box diagram, every node and table visible at once, and long prose. The rules below close that gap.

## Required screens

1. **App shell, not a document page.** A fixed, full-viewport layout with no page scroll on desktop:
   - Top bar: topic drawer button, site title, "now learning" (topic · lesson, step n/N with a segmented progress bar), a layer selector (for example Servlet / Spring MVC / Application / Data), learning progress across all lessons (n/N complete), and theme toggle.
   - Main row: the scene (left, large) and the step-details panel (right).
   - Bottom: the event log and the player controls.
2. **Topic drawer.** Slides over from the left. Tabs filter by group (All, Spring, MySQL, EKS); each row shows the lesson name, a subtitle, and a progress dot (not started, in progress, done).
3. **Illustrated scene.**
   - Nodes are isometric line-art illustrations drawn in our own SVG: client laptop, Tomcat server, filter stack, `DispatcherServlet` hub, controller, service, repository, database cylinder, Kubernetes node, and so on. They are not rectangles with text.
   - The scene sits on a subtle isometric grid background.
   - **Progressive reveal:** the scene starts with only the first actor. Each node appears, with a short draw-in, on the step where it first matters.
   - **Camera:** the view pans and zooms smoothly (eased viewBox transition) to frame the nodes the current step uses.
   - Links are dashed lines. A token travels along a link with its label (for example `GET /api/orders`). The token's color is its kind.
   - Node-state views (tables, lists) are not printed on the scene. A node shows a small badge when its state changed; the state view opens in the step-details panel or the decoder.
4. **Network/sequence toggle.** Above the scene, switch between the illustrated scene and a sequence diagram:
   - Each actor is a vertical lifeline with its name.
   - Each step is an arrow with its label, placed on a time axis with timestamps.
   - The current step is marked, and arrows draw in as playback reaches them.
5. **Step-details panel.**
   - Label "STEP n OF N", then a large title, then a one-line subtitle.
   - Then at most about 5 lines of prose and a facts table of 2 to 4 rows.
   - A highlighted card shows the current message: a kind badge, from → to, its key lines, and "event k of K · protocol · size".
   - Long explanations go behind an "Overview" button (lesson-level), not into every step.
6. **Event log (the counterpart of "Packet flow").** A table that grows as steps play: No., time, source, destination, protocol/layer, info, size or duration. A colored dot shows the kind, with a legend in the header. Clicking a row opens the decoder for that event.
7. **Decoder (full-screen overlay).**
   - Header: event number, name, and "time · from → to · protocol · size", with previous/next and close buttons.
   - A proportional bar shows the layers of the message (for example HTTP request line / headers / body, or InnoDB record header / fields).
   - Left: every field with its real name, value, and a one-line meaning. Fields whose value varies per run carry an "E.G." tag.
   - Right: the raw bytes or text, colored per layer. Hovering a field highlights its bytes, and the other way round.
   - Footer: a legend for the tags.
8. **Player controls.** Speed (1×, 2×, 0.5×), previous, play/pause, step, restart. Keyboard: arrows, space.

## Principles for this project

- The north star is in `docs/PRODUCT.md`: structure and critical-path flow, one connected visual picture, imprinted in 3 or fewer viewings. Every design choice serves it. The content rule there ("must-know only") applies to every node, step, and fact.
- Structure first, then flow. The scene's layout is the mental map. Components stay in fixed, meaningful positions (outside → inside, caller → callee, memory above disk). The critical path reads in one direction across the scene.
- One layout per topic. Lessons in the same topic reuse the same node positions, so each lesson adds to one map instead of starting a new one.
- The critical path is visually dominant. Side paths and failure branches are drawn weaker and appear only when they matter.
- End every lesson with a replay: the whole critical path plays once, continuously, without stops. That is the picture to recall.
- Accuracy over volume. A wrong fact is worse than a missing step. A trivial fact is worse than no fact.
- One mechanism per lesson. If a lesson needs two scenes, split it.
- `move` for things that travel (requests, events, packets). `mutate` for state inside a component (tree pages, locks, read views, IP pools). Show the state change visibly, not only in prose.
- The decoder supports the flow. It shows the real structure of the message or record at a hop (HTTP headers, InnoDB record header, Pod spec) with real field names. It shows only the fields an engineer reads in practice. Explain the rest in one line or leave it out.
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
| State change | `--token-state` (yellow) | A `mutate` step: node badge, state card, log dot |
| Decoder segments | `--seg-0` … `--seg-5` | Bands of a decoded message, in segment order |

Changed rows in a node-state panel get the `--hl` background; the old value fades out with a strike-through while the new one fades in.

## Layout and theme

- Desktop: the app shell in "Required screens"; the step list lives in the drawer-style lesson outline and in the segmented progress bar, not as a long column.
- Phone (≤ 900px): top bar collapses to drawer button, title, and step n/N. Then the scene (camera keeps the active nodes in frame, so no horizontal scroller), the step details, the event log, and sticky player controls. No page-level horizontal scroll, 16px side gutter.
- Light and dark themes from CSS custom properties, following the system setting, with a manual toggle remembered in `localStorage`.
- Keyboard: arrow keys for previous and next step, space for play and pause.
- Typeface: Iosevka (self-hosted from its OFL release) for code and labels; the system sans-serif stack for Korean prose if Iosevka lacks Hangul.

## Review

- UI work is reviewed with the `impeccable` skill against this document and with `web-design-guidelines` as a checklist.
- Acceptance is side by side. Take screenshots of the reference and of our site at the same viewport (1440×900 and 390×844), in dark theme, for these screens: the shell at step 1, a mid-lesson scene, the sequence view, the event log with rows, and the decoder.
- A screen passes only if a reviewer cannot point to a missing element from "Required screens". Attach the screenshot pairs to the report.
