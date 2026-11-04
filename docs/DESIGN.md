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
   - Boundaries (a process, a machine, a VPC, a managed control plane) are stacked isometric slabs under the nodes, not flat outlines. A nested region sits one slab higher, each node stands on its innermost slab, and the region's name is painted on the floor along the near edge. Managed parts are dashed (decision 0015). Slab tops are translucent, so up close a slab reads as a raised plate, not a second background. Because a zoomed-in camera leaves the slab edges and labels off screen, a tag in the scene's top-left corner names the regions the current step runs in ("outer › inner"; two places joined by "↔").
   - The scene sits on a subtle isometric grid background.
   - **Progressive reveal:** the scene starts with only the first actor. Each node appears, with a short draw-in, on the step where it first matters.
   - **Camera:** the view pans and zooms smoothly (eased viewBox transition) to frame the nodes the current step uses.
   - Links are dashed lines. A token travels along a link with its label (for example `GET /api/orders`). The token's color is its kind.
   - Concurrent flows: a step's parallel moves travel at the same time and arrive together, so a race is seen racing. A burst (`count`) shows up to 8 staggered tokens labeled ×N that all arrive at once. A move back along a link (the response) travels on its own dotted return lane beside the request, so request and response read as a loop (decision 0015).
   - Node-state tables and lists are not printed on the scene. A node shows a small badge when its state changed; the state view opens in the step-details panel or the decoder.
   - Structural state (a `log` with markers, a `queue` with a midpoint, a `tree` of pages) shows as a small inset next to the node only during its `mutate` step: the marker slides, the item moves to the head, the page splits. Then the inset collapses back to the badge. At most one inset shows at a time, the camera frames the node with its inset (also after a resize), and the replay shows the inset of each critical mutate. The card sits right of the "상태" badge, tied to it, so it never covers the badge. In a scene narrower than 560 px (a phone) an inset would be too small to read, so the badge stays live and the step details, right below the scene, show the view. The step details draw the same view with the same renderer (decision 0015, owner choice).
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
- Lay out region members along the iso ground grid. A region (a process, a machine, a VPC) is a slab whose footprint is the ground bounding box of its members, so members that sit along the iso axes give a tight slab. A row that is level on screen makes a wide, loose diamond that catches other nodes.
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
| Node `cloud` | `--kind-cloud` (grape) | A managed cloud service the team does not run: EKS API, STS, EC2 API, ALB (decision 0013) |
| Token `request` | `--token-request` (magenta) | An inbound request |
| Token `response` | `--token-response` (teal) | An outbound response |
| Token `call` | `--token-call` (violet) | A method call inside the process |
| Token `data` | `--token-data` (amber) | A value or payload handed between components |
| State change | `--token-state` (yellow) | A `mutate` step: node badge, state card, log dot, state inset border, and the moved marker, item, or new page inside it |
| Decoder segments | `--seg-0` … `--seg-5` | Bands of a decoded message, in segment order |
| Region slab | `--region` (neutral gray-blue) | Every region slab, with a lighter top at each depth. Never a kind color: a boundary is not an actor |

Changed rows in a node-state panel get the `--hl` background; the old value fades out with a strike-through while the new one fades in.

## Critical path and replay

- A step is `critical` or `side` (`path` in the lesson). Critical links are solid-colored and thick, and the critical token is larger. Side links are thin and dotted, side tokens are smaller with a dashed label, and side-only nodes are dimmed and appear only while a side step uses them.
- The step details show a "핵심 경로" or "곁가지" chip; side rows in the event log are muted with a hollow dot; side arrows in the sequence view are dashed.
- Replay: after playback passes the last step, the critical steps play once, back to back, with no dwell. The camera frames the whole critical path, all critical nodes are visible, and a "핵심 경로 리플레이" badge shows. The replay button in the player and the last step's details start it at any time.

## Icons

Every node picks one of these `IconKind` illustrations (`src/scene/icons.ts`, our own isometric line art). Run `npm run dev` and open `/vStackExplorer/gallery.html` to see them all. The table maps the nodes in `docs/research/` to icons; pick by what the node is, not by its topic.

| IconKind | Draws | Use for (examples from the plans) |
|---|---|---|
| `laptop` | laptop | client, `redis-cli`, `mysql` client, developer with `kubectl`, producer/consumer apps when shown as a machine |
| `globe` | globe on a stand | internet users, external endpoint |
| `server` | server tower | Tomcat, containerd, a generic process, Redis master when shown as a host |
| `filter-stack` | stacked plates | Servlet filters, netfilter chains, admission gates |
| `hub` | layered disc | `DispatcherServlet`, a central dispatcher |
| `index` | table with lookup arrow | `HandlerMapping`, InnoDB page hash, EndpointSlice |
| `adapter` | block with prongs | `HandlerAdapter`, `ha_innobase` handler |
| `converter` | bytes → object slab | message converters, Kafka serializer |
| `controller` | box with code panel | web controller |
| `service` | box with cog | service bean, application server (`order-api`) |
| `repository` | drawer cabinet | repository / DAO |
| `database` | cylinder | MySQL behind a cache, any database |
| `thread` | gear with loop arrow | Redis main / I/O / bio thread, InnoDB purge thread, `log_writer`, page cleaner, Kafka sender thread |
| `queue` | conveyor with blocks | LRU list, flush list, free list, replication buffer, log buffer, record accumulator |
| `memory` | memory module | OS page cache, copy-on-write memory pages |
| `lock` | padlock | `lock_sys`, record locks |
| `snapshot` | camera | MySQL `ReadView` |
| `buffer-pool` | rack of page frames | InnoDB buffer pool |
| `page` | page slab with rows | a B+Tree page, root or leaf, doublewrite slots |
| `btree` | root above two leaves | a whole B+Tree index |
| `log-file` | stacked slabs, append arrow | redo, undo, binlog, AOF, `__cluster_metadata` |
| `disk` | drive with platter | `t.ibd` tablespace, `dump.rdb` on disk |
| `file` | sheet with folded corner | a single file: `temp-<pid>.rdb`, `.dblwr`, `NodeConfig` |
| `folder` | folder with files | Kafka partition directory, `appendonlydir/` |
| `producer` | box sending crates | Kafka producer |
| `broker` | tower with log strips | Kafka broker |
| `partition-log` | segmented strip | a partition log, active segment, `__consumer_offsets` partition |
| `consumer` | box receiving crates | Kafka consumer |
| `coordinator` | tower with roster | group coordinator, transaction coordinator |
| `quorum` | three linked towers | KRaft controller quorum |
| `keyspace` | cabinet with key tags | Redis keyspace (`db0`), expires dict |
| `replica` | server with a dashed primary behind | Redis replica, Kafka follower |
| `sentinel` | watchtower | Redis Sentinel |
| `slot-map` | ring cut into shards | Redis Cluster slot map |
| `cloud` | cloud over a platform | AWS control plane, EKS API, EC2 API, IMDS |
| `etcd` | three cylinders | etcd |
| `api-server` | block with three gates | kube-apiserver |
| `scheduler` | desk with pods and a flag | kube-scheduler, kube-controller-manager, Karpenter |
| `kubelet` | box with a helm wheel | kubelet |
| `k8s-node` | platform with pods | EC2 worker node |
| `pod` | translucent capsule | Pod |
| `eni` | network card | ENI, cross-account ENI |
| `load-balancer` | box fanning out | ALB / NLB, kube-proxy Service routing |
| `iam` | key on a badge | IAM role, STS, OIDC provider, EKS Pod Identity |

## Layout and theme

- One map per topic: node positions live in the topic's `meta.ts` (`layout`), so every lesson in the topic draws on the same map.
- Desktop: the app shell in "Required screens"; the step list lives in the drawer-style lesson outline and in the segmented progress bar, not as a long column.
- Phone (≤ 900px): top bar collapses to drawer button, title, and step n/N. Then the scene (about half the screen, so the step details start above the fold; the camera keeps the active nodes in frame, so no horizontal scroller), the step details, the event log, and sticky player controls in one row: the active speed (tap to cycle), restart, previous, play, step, replay. No page-level horizontal scroll, 16px side gutter.
- Scene edges fade into the background, so a node just outside the frame fades out instead of being cut off hard. A portrait scene uses a narrower minimum frame, so icons stay readable.
- Light and dark themes from CSS custom properties, following the system setting, with a manual toggle remembered in `localStorage`.
- Keyboard: arrow keys for previous and next step, space for play and pause.
- Typeface: Iosevka (self-hosted from its OFL release) for code and labels; the system sans-serif stack for Korean prose if Iosevka lacks Hangul.

## Review

- UI work is reviewed with the `impeccable` skill against this document and with `web-design-guidelines` as a checklist.
- Acceptance is side by side. Take screenshots of the reference and of our site at the same viewport (1440×900 and 390×844), in dark theme, for these screens: the shell at step 1, a mid-lesson scene, the sequence view, the event log with rows, and the decoder.
- A screen passes only if a reviewer cannot point to a missing element from "Required screens". Attach the screenshot pairs to the report.
