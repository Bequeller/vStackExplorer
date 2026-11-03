---
status: accepted
date: 2026-11-04
---

# 0010. Lesson scope and shape after the research review

## Context

Four research plans (`docs/research/mysql-innodb.md`, `kafka.md`, `redis.md`, `eks.md`) were reviewed on 2026-11-04. Each was spot-checked against its pinned official sources. The facts held up: two errors in more than 70 checks. MySQL had the `LOG_HEADER_FLAGS` offset as 47 instead of 48. EKS was pinned to 1.36 while 1.37 was already released. The structure had problems in all four plans:

- Lessons mixed several mechanisms. EKS averaged 18 steps per lesson.
- `move` steps carried state changes, and `mutate` steps targeted nodes with no state panel.
- No step was linked to a decoder record.
- Topics often asked in interviews were missing.
- The icon set (`IconKind`) covers only Spring nodes.

## Decision

- One mechanism per lesson, about 8 to 12 steps. Split the mixed lessons the reviews named.
- Add the missing interview topics now listed in `docs/PRODUCT.md` (Scope).
- Drop facts the reviews marked "drop". Keep the others labeled.
- Shared engine work comes before lesson implementation, in one session: icons for all topics, schema rules, and decoder fixes. Topic sessions then implement only inside `src/lessons/<topic>/`.

## Reason

- The reference's quality comes from focused lessons. Long mixed lessons fail the "one mechanism" rule in `DESIGN.md`.
- If each topic session added its own icons, all four would edit `src/scene/icons.ts` and conflict.
- The review evidence is the list of fixes sent to each research session on 2026-11-04.

## Alternatives

- Implement the plans as written — this builds mixed lessons, and they would have to be rewritten later.
- Let each topic session add its own icons — this causes merge conflicts in shared engine files.
