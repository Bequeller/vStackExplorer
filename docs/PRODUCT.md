---
last-verified: 2026-11-03
sources: [https://protocol-explorer-alpha.vercel.app/]
---

# Product

## Purpose

Study material for one learner: the owner, preparing for a senior backend engineer role at a large Korean tech company (네카라쿠배). Each lesson shows how a system works inside, step by step, as an animation with exact, sourced facts. The model is Protocol Explorer, which animates network protocols packet by packet and decodes every byte.

## North star

For any concept, the owner understands its **structure** (the components and how they connect) and the **flow** of its critical path (the main path a request, write, or event takes) as one connected, visual picture. A few viewings are enough to imprint it.

- Metric: the number of viewings until the owner can redraw the structure and the critical-path flow from memory, without the page, and explain each hop. Target: 3 or fewer per lesson.
- Count: lessons that meet the target. The owner measures, and reviews weekly.
- Each roadmap item names how it lowers viewings-to-recall or raises the count.

## Content rule: must-know only

A lesson teaches only structure and flow that a backend engineer **will** meet in real work: in design, operations, debugging, or incidents. That is the bar for every node, step, fact, and decoder field.

- Keep: the components on the critical path, the hops between them, the state that changes there, and the failure points engineers actually hit (for example lock waits, rebalance storms, IP exhaustion, replica lag).
- Cut: trivia that rarely matters in practice, such as internal constants that do not change behavior, version-by-version history, niche or brand-new features, and exotic config. A fact that is true but not needed is noise. It costs recall of the facts that matter.
- When unsure, ask: "Will the owner be blamed in an incident or a design review for not knowing this?" If not, cut it, or move it to the lesson overview in one line.

## Scope

- Topics ordered by interview value. First wave (research plans in `docs/research/`, reviewed 2026-11-04, decision 0010):
  1. Spring Boot: HTTP request flow (Filter chain → `DispatcherServlet` → handler → response), `@Transactional` proxy, bean lifecycle, auto-configuration.
  2. MySQL InnoDB: B+Tree index (including composite index, leftmost prefix, and how EXPLAIN reads it) and page split, buffer pool, redo/undo log, binlog–redo two-phase commit, isolation levels and phantom reads, MVCC read view, record/gap/next-key locks, deadlock.
  3. Kafka: producer send path, broker log, replication (ISR, high watermark), consumer rebalance, offset commit and consumer lag, ordering guarantees, log compaction, transactions, KRaft.
  4. Redis: command path and I/O threads, encodings, expiration, eviction, cache stampede and locks, MULTI/Lua atomicity, big keys and `UNLINK`, RDB, AOF, replication, Sentinel, Cluster.
  5. EKS: control plane and node join, `kubectl apply` request path, scheduling and constraints (requests/limits, taints, affinity, QoS), Pod lifecycle (probes, rolling update, graceful shutdown with load balancer deregistration), VPC CNI and ENI/IP assignment, Service and load balancer path, IRSA, Pod Identity, autoscaling.
- Later topics follow the same format (for example TLS, JVM GC).
- Each lesson: one mechanism, about 8 to 12 steps, an animated scene, a step list, a detail panel with facts, a decoded-record panel, and a closing self-check.
- Light and dark themes, keyboard control, and phone-width layout.

## Non-goals

- No i18n: Korean text only.
- No backend, accounts, or progress sync. Progress, if any, stays in `localStorage`.
- No general tutorials. A lesson explains one mechanism deeply, not a product overview.

## Done criteria

- A lesson is done when every step has sources, the schema test passes, it plays through in a browser with no console errors, and it has a self-check.
- The site is live on GitHub Pages from the `main` branch through the Actions workflow.
