---
status: accepted
date: 2026-11-04
---

# 0015. Engine extension: regions, structural state views, concurrent flows

## Context

The shared engine prep (decisions 0013, 0014) gave every topic its icons, one map, critical and side paths, and a replay. A review of the four plans in `docs/research/` against `main` at `3127cbc` found three things planned steps need that the engine cannot draw:

- Boundaries. EKS draws control plane, VPC, and node regions. Kafka has components "on B1". MySQL has four bands.
- State that is a structure: a log with HW and LEO markers, an LRU queue with a midpoint, a B+Tree page split, and two views on one node.
- Flows at the same time. The EKS deploy-time 5xx comes from two flows racing. The Redis cache stampede is a burst of requests. A request and its response share one line.

The plan, with evidence for each need, is `docs/research/engine-extension.md`.

## Decision

- **ENG-1, regions:** optional `TopicLayout.regions`. Each region lists its member nodes and an optional parent. The engine draws it as a stacked isometric slab (see "Owner decision: how regions are drawn").
- **ENG-2, state views:**
  - `log`, `queue`, and `tree` view types;
  - more than one view per node;
  - a per-type diff.
- **ENG-3, concurrent flows:**
  - optional `parallel` moves and a `count` burst on `MoveStep`;
  - return lanes for reverse moves.
- Every addition is optional, so current lessons stay valid. One engine session does them in this order.

### Owner decision: where structural state is drawn

`docs/DESIGN.md` (Required screens 3) says node-state views are not printed on the scene. ENG-2 needed a choice. The owner chose option 1 on 2026-11-04, after comparing a mockup of both options on the Kafka replication HW step. This supersedes the "not printed on the scene" part of Required screens 3 for `log`, `queue`, and `tree` views. `table` and `list` views stay panel-only. ENG-2 updates `docs/DESIGN.md` and the scene module's "must not" in `docs/ARCHITECTURE.md` in the same commit as its code.

1. **Chosen: a scene inset only while the node mutates.** A small drawing of the view (log, queue, tree) appears next to the node during its `mutate` step, then collapses back to the badge. The full view stays in the step details.
   - For: the eye stays on the scene at the moment of change, so structure and flow form one picture.
   - Against: it changes Required screens 3 and the scene module's "must not draw node-state tables" rule. The first build's clutter came from every table showing at once. Showing one inset for one step avoids that.
2. **Drawn only in the step-details panel.** The same renderers replace the text table in the panel.
   - For: no screen-spec change.
   - Against: at each state change, the eye leaves the scene. The structure and the state stay two pictures.

### Owner decision: how regions are drawn

The first plan drew regions as faint flat rectangles. The owner saw that the isometric icons showed no containment at all. On 2026-11-04, after slab mockups of the Kafka broker (host ⊃ JVM process) and the EKS map (VPC ⊃ node A and node B, with the AWS-managed parts dashed), the owner chose stacked slabs.

- A region is `{ id, label, nodes, parent?, managed? }`. The engine computes the footprint from the member nodes on the iso ground plane. Nesting adds one slab thickness per level, and each node stands on its innermost slab.
- Topic maps lay out the members of one region along the iso ground grid. A row that is level on screen makes a loose slab. `docs/DESIGN.md` (Principles) gets this rule in the ENG-1 commit.
- For: containment reads as "on top of", the same picture as a node inside a VPC or a thread inside a JVM. Member lists cannot go out of sync with node positions.
- Against: topic maps must follow the iso grid, and the slab layer adds drawing code to ENG-1.
- Rejected: flat outlines. They are cheaper, but the owner found no containment in them.

## Reason

- Each unit traces to a named planned step. No unit is speculative (must-know rule, `docs/PRODUCT.md`).
- The north star is one connected picture. Boundaries are the structure. A moving marker is the flow of state. Racing tokens are the failure. Text tables carry none of these at a glance.
- Optional fields let topic sessions start lessons now. Only the lessons named in the plan wait.

## Alternatives

- **Per-topic registries for icons, kinds, and views.** They no longer block anything: 0013 covers all planned nodes.
- **Express everything as tables and prose.** No engine work, but it costs viewings on exactly the steps that matter most: the race, the HW, the page split.
- **Refactor `networkView.ts` first, on its own.** It has no recall impact by itself. The split is ENG-1's first step instead.
