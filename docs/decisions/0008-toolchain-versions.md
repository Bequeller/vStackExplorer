---
status: accepted
date: 2026-11-03
---

# 0008. Toolchain versions

## Context

The first implementation chose exact dev-dependency versions on 2026-11-03.

## Decision

Vite 8.3.5, Vitest 5.1.0, ESLint 10.14.0 with typescript-eslint 8.72.1, and TypeScript 6.0.3, all pinned exactly in `package.json` with the lockfile committed. Node 22 in CI.

## Reason

- TypeScript 7.0.2 was the newest release, but typescript-eslint 8.72.1 supports only `>=4.8.4 <6.1.0`, and `npm run check` runs both. TypeScript 6.0.3 is the newest version both accept.
- Exact versions keep parallel sessions on the same compiler and linter output.

## Alternatives

- TypeScript 7 without typescript-eslint — loses type-aware lint rules such as `consistent-type-imports`.
