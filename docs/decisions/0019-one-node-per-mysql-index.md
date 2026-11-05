---
status: accepted
date: 2026-11-05
---

# 0019. One map node per MySQL index, drawn as a tree

## Context

The owner found the first MySQL lesson (`index-lookup`) weak. Three causes showed up in the build at `fa557ad`:

- One `index` node stood for both B+Trees. The key event, the PK hop from `idx_k` to `PRIMARY`, was a table edit on one node. Nothing moved on the scene.
- Both trees were text tables. The `tree` state view (decision 0015) was not used, so no descent was drawn.
- The scene had three nodes, so the map showed little structure.

## Decision

- The MySQL map has one node per index: `idx_k` (secondary) and `primary` (clustered). They sit next to each other in the memory band. Every node at gx 2 or more moves one cell right, so the columns stay aligned.
- Each index node has a `tree` state view: a two-level toy tree. A descent step marks the node pointer and record it takes with "▸". The changed pages are the descent path.
- The PK hop is a `move` from `idx_k` to `primary` with a `data` token. The covering-index case is a side-path `move` from `idx_k` straight to `client`, so it visibly skips `PRIMARY`.
- Later lessons in `docs/research/mysql-innodb.md` still name `index`. Each one picks `primary`, `idx_k`, or a new index node when it is built.

## Reason

- The north star is structure and critical-path flow. Two indexes are two structures, and the second lookup is a flow. Both must be visible, not described.
- The engine already draws trees as insets, so this is a data change. No engine code changes.

## Alternatives

- Keep one `index` node and draw both trees in its inset. Rejected: the PK hop stays invisible.
- Show full-size trees with realistic fan-out. Rejected: it adds no recall. The detail text says that a real leaf holds hundreds of records.
