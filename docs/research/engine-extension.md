# Engine extension plan (proposed)

Status: accepted on 2026-11-04 (decision 0015). The owner chose the scene inset for structural state, and stacked slabs for regions. Written against `main` at `3127cbc`, after the shared engine prep (`6ae50e7`, `159a2a7`).

## Goal

The topic sessions are about to write their `meta.ts` maps and lessons. Their plans in `docs/research/` need three things the engine cannot draw yet. Each one shows structure or flow that the north star asks for (`docs/PRODUCT.md`). With text alone, it costs more viewings to recall.

Rule for this plan: a unit exists only if a planned lesson step needs it. This is the must-know rule (`docs/PRODUCT.md`) applied to the engine.

## What the prep already fixed

- Icons and node kinds: 44 shared `IconKind`s and the `cloud` kind (decision 0013). A topic session no longer edits `src/scene/` for its nodes.
- One map per topic, per-lesson relabeling, critical/side paths, and the end replay (decision 0014).
- Record formats `text`, `binary`, `fields`, and the decoder fixes (decision 0013).

## Units

All schema additions are optional fields. Lessons written on the current schema stay valid, and no unit breaks them.

### ENG-1. Regions: boundaries and containment

- **Need:**
  - `docs/research/eks.md` (Topic layout) draws regions as outlines: outside, AWS-managed control plane, customer VPC ⊃ node A and node B, AWS regional APIs. All 11 EKS lessons sit on this map.
  - `docs/research/kafka.md` puts `pstate`, `pagecache`, `cleaner`, and the `orders-0` log "on B1".
  - `docs/research/mysql-innodb.md` uses four bands: SQL, InnoDB memory, background threads, disk.
- **Recall impact:** the boundary is the first thing the owner redraws: who runs it, which process or machine holds it. Without it, the map is a cloud of icons.
- **Owner decision (0015):** a region is drawn as a stacked isometric slab, not a flat outline. The owner chose this on 2026-11-04 after slab mockups of the Kafka broker and the EKS map. Flat outlines did not show containment.
- **Schema:**
  - `TopicLayout.regions?: Region[]`.
  - Each region is `{ id, label, nodes, parent?, managed? }`.
    - `nodes`: the ids of the topic nodes directly inside it.
    - `parent`: the id of the region that holds it.
    - `managed`: true for a part the team does not run, such as the EKS control plane. It is drawn dashed.
  - The engine computes each slab's footprint. It does not come from the lesson.
- **Validation:**
  - Ids are unique, and every `nodes` id and `parent` id exists.
  - A node is in at most one region.
  - Parents form a tree with no cycles.
  - Sibling footprints do not overlap. This is checked on the computed footprints.
- **Footprint:**
  - Map each member node's base point from screen units to the iso ground plane (the inverse of `iso` at z = 0).
  - The footprint is the ground bounding box of its member nodes and its child footprints, plus a fixed margin.
  - Depth: a top-level region is depth 1, and each child adds 1. Each depth adds one slab thickness.
- **Scene:**
  - Draw slabs in a layer under the links, outer slabs first. Each slab has a top face, two side faces, and its label painted on the floor along the near edge.
  - Lift each node by its region's depth, so it stands on its slab.
  - Use one neutral token (`--region`) with a lighter top at each depth. It does not use a kind color, because color means actor kind (`docs/DESIGN.md`).
  - A region appears with its first shown node.
  - The replay shows the regions of the critical nodes.
  - The camera still frames the step's nodes, not the whole region.
- **Topic map rule:** a slab is tight only when its members sit along the iso axes. A row of nodes that is level on screen makes a wide, loose diamond. Topic sessions lay out the members of one region along the iso ground grid. `docs/DESIGN.md` (Principles) gets this rule in the same commit.
- **Sequence view:** lifelines in the same top-level region get a shared header band with the region label.
- **First step:** split `networkView.ts` before adding regions. Move the camera (`frameFor`, the viewBox lerp) to `camera.ts`, and draw regions in their own layer module. Do this split only as part of this unit, not as a separate refactor.
- **Done check:**
  - A schema test for each validation rule.
  - The Spring map gets one real region: the Tomcat JVM process, holding everything except the client. This is the process boundary in the Spring request flow.
  - Browser check of the Spring lesson, including the replay, in both themes and at phone width. The node stands on its slab, and the slab label is readable.

### ENG-2. State views that show structure

- **Need:** state that is a structure, not a table:
  - Kafka replication: LEO and high watermark moving along a partition log (`docs/research/kafka.md`, lesson 4).
  - MySQL buffer-pool LRU with its young/old midpoint, and the flush list (lesson 4).
  - MySQL page split (lesson 3).
  - MySQL redo LSN and checkpoint (lessons 5 and 8).
  - Redis eviction (lesson 4).
  - EKS open question 3 wants two views on one node (`kube-proxy` nat rules and conntrack entries). The MySQL `bpool` panel also holds two lists (LRU and flush list).
- **Recall impact:** a marker moving along a log, or a page splitting in two, is the picture the owner redraws. A changed table row has to be read and translated first.
- **Schema:**
  - Add view types to `StateView`, each plain data:
    - `log`: ordered entries with offsets, plus named markers at offsets (HW, LEO, checkpoint, LSN).
    - `queue`: ordered items with named positions (head, tail, midpoint).
    - `tree`: levels of pages, each page with its keys.
  - The engine session picks the exact fields. They must express the steps above.
  - Multiple views per node: optional `NodeState.id`, and an optional `MutateStep.state` that names the view when a node has more than one.
- **Engine:** generalize `changedRows` to a per-type diff, so the UI and the scene can mark what moved. Examples: a marker's old and new offsets, an item moved to the head, a page that split.
- **Where it is drawn (owner decision, 0015):**
  - **Scene inset.** During a `mutate` step on a `log`, `queue`, or `tree` view, a small drawing of that view appears next to the node and animates the diff: the marker moves, the item moves to the head, the page splits.
  - **After the step**, the inset collapses back to the "상태" badge. At most one inset shows at a time, so the scene does not fill with tables again.
  - **Step details** keep the full view, drawn by the same renderer.
  - **`table` and `list` views** stay panel-only.
  - **The camera** frames the node and its inset together.
  - **During the replay**, the inset of each critical mutate shows for its step.
- **Done check:**
  - A schema test for each new view type.
  - A playback test that checks the diff for each type.
  - Each renderer shown in `gallery.html`.
  - A test fixture lesson (`tests/fixtures/`) that plays one mutate of each type in the browser. For each mutate, the inset appears, animates, and collapses to the badge, at desktop and phone width.

### ENG-3. Concurrent and return flows

- **Need:**
  - EKS lesson 8, steps 8.6–8.7. After a Pod is deleted, two flows start at once: the `kubelet` TERM path, and the EndpointSlice → Load Balancer Controller → `DeregisterTargets` path. Their race causes the 5xx at deploy time. That incident is the reason the lesson exists.
  - Redis lesson 5, step S5 (cache stampede): about 200 requests miss at once and all go to the DB.
  - Every topic has request and response moves on the same link. Today they travel on one straight line and overlap.
- **Recall impact:**
  - The race is only memorable if both flows are seen racing.
  - A burst of tokens shows a stampede without prose.
  - Separate return lanes make the request and the response read as a loop.
- **Schema (on `MoveStep`):**
  - `parallel?: { from, to, token }[]`: more moves that play during the same step.
  - `count?: number`: one move drawn as a burst of tokens, labeled ×N.
- **Validation:** parallel moves use listed nodes, and each has a token.
- **Scene:**
  - The token layer holds many tokens, not one.
  - A move whose direction is the reverse of an earlier move on the same link uses an offset lane.
  - In the sequence view, parallel moves are arrows at the same time position.
  - The event log shows one row per step, with the parallel moves joined by "‖".
- **Done check:**
  - A schema test for `parallel` and `count`.
  - A playback test that checks all moves of a parallel step finish together.
  - In the browser, the Spring lesson's response returns on its own lane.

## Order and blocking

| Unit | First | Blocks | Can start now on the current schema |
|---|---|---|---|
| ENG-1 | yes: topic sessions are drawing their maps | nothing hard. Regions are added to `meta.ts` later. Nodes laid out on the iso ground grid now do not move later | every lesson |
| ENG-2 | after ENG-1 (it reuses the split camera) | MySQL lessons 3, 4, 5, 8; Kafka lesson 4; Redis lesson 4. Writing them now as tables means rewriting `states` later | Spring, EKS, the other Kafka, Redis, and MySQL lessons |
| ENG-3 | after ENG-1 (it reuses the split token layer) | EKS lesson 8; Redis lesson 5 | everything else |

One engine session does all three, in this order, because all three touch `src/scene/` and `src/lessons/types.ts` (decision 0010).

## Not in this plan

- Per-topic registries for icons and kinds: the shared 44 icons and the "ask the engine for a missing icon" rule cover the plans (decision 0013).
- A separate `networkView.ts` refactor: the split happens as the first step of ENG-1.
- A "compare" marker (Kafka open question 3): `path: 'side'` already draws comparison steps weaker and leaves them out of the replay. Add a marker only if the owner's viewings show confusion.
- Curved link routing beyond return lanes, and node animation inside illustrations: no planned step needs them.

## Stop conditions

- Each unit lands as its own commit, with `npm run check`, `npm test`, `npm run build`, `scripts/check-docs.sh .`, and a browser check passing.
- Before code, each unit updates `docs/ARCHITECTURE.md` (Lesson format, Modules) and `docs/DESIGN.md` (Required screens, Color meaning) in the same commit. This is the docs gate.
- If a unit grows past about 600 net production lines (estimate, not a measurement), stop and report what made it grow.
- If a planned step still cannot be expressed after a unit lands, report the step id. Do not widen the schema beyond it.
