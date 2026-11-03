---
status: accepted
date: 2026-11-03
---

# 0003. Lessons are sourced data, one folder per topic

## Context

The material must be near-perfect in accuracy, and several cloud sessions will write lessons for different topics in parallel. Topics differ in shape: a Spring request travels between components, while an InnoDB page split or an ENI IP assignment is a state change inside one component.

## Decision

- A lesson is a typed data object in `src/lessons/<topic>/` with no engine imports.
- Steps have two kinds: `move` and `mutate`.
- Every step carries `sources` with an official URL and the version it describes; a schema test fails without them.

## Reason

- Data-only lessons let one session own one topic folder, so parallel sessions never edit the same files.
- A `move`-only engine (packets between nodes) would force MySQL and EKS lessons into prose; `mutate` keeps the state change visible.
- The reference site's quality comes from exact facts. A required, tested source makes accuracy a check, not a hope.

## Alternatives

- Lessons as code with custom animations each — flexible, but every topic needs engine work and reviews get harder.
- Sources as a free-text bibliography per lesson — cannot be checked per fact.
