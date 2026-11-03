---
last-verified: 2026-11-03
sources: [https://protocol-explorer-alpha.vercel.app/]
---

# Product

## Purpose

Study material for one learner: the owner, preparing for a senior backend engineer role at a large Korean tech company (네카라쿠배). Each lesson shows how a system works inside, step by step, as an animation with exact, sourced facts. The model is Protocol Explorer, which animates network protocols packet by packet and decodes every byte.

## North star

Lessons whose closing self-check the owner passes without the page open (explaining the flow aloud or answering its questions). Measured by the owner, reviewed weekly. Each roadmap item below aims to raise this count.

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
