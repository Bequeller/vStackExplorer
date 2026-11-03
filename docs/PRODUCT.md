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

- Topics ordered by interview value. First wave:
  1. Spring Boot: HTTP request flow (Filter chain → `DispatcherServlet` → handler → response), `@Transactional` proxy, bean lifecycle, auto-configuration.
  2. MySQL InnoDB: B+Tree index and page split, buffer pool, redo/undo log, MVCC read view, record/gap/next-key locks.
  3. EKS: control plane and data plane, Pod scheduling, VPC CNI and ENI/IP assignment, Service and load balancer path.
- Later topics follow the same format (for example Kafka, Redis, TLS, JVM GC).
- Each lesson: an animated scene, a step list, a detail panel with facts, a decoded-record panel, and a closing self-check.
- Light and dark themes, keyboard control, and phone-width layout.

## Non-goals

- No i18n: Korean text only.
- No backend, accounts, or progress sync. Progress, if any, stays in `localStorage`.
- No general tutorials. A lesson explains one mechanism deeply, not a product overview.

## Done criteria

- A lesson is done when every step has sources, the schema test passes, it plays through in a browser with no console errors, and it has a self-check.
- The site is live on GitHub Pages from the `main` branch through the Actions workflow.
