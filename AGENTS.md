# vStackExplorer

Interactive, animated study material for backend internals (Spring Boot, MySQL InnoDB, EKS, and more), published as a static site on GitHub Pages.

## Commands

| Purpose | Command |
|---|---|
| Install | `npm ci` |
| Test | `npm test` |
| Type check and lint | `npm run check` |
| Run | `npm run dev` |
| Build | `npm run build` |
| Docs check | `scripts/check-docs.sh .` |

Keep these script names; CI and other sessions rely on them.

## Prohibitions

- Never add a lesson step without `sources` (official doc URL and the version it describes) — unsourced facts make the material wrong in ways a learner cannot detect. Enforced by the lesson schema test.
- Never import engine code from `src/lessons/` — lessons are data; engine imports couple topic sessions and cause merge conflicts.
- Never copy code, CSS, text, or assets from the reference site (protocol-explorer-alpha.vercel.app) — it has no license. Take ideas only. Get fonts from their own OFL release.
- Never add a backend, analytics, or third-party runtime script — the site must work as static files on GitHub Pages under a strict CSP.
- Never report a change done without running `npm test` and `npm run build`, and opening the changed lesson in a browser — a syntax check does not show a broken animation.

## Working rules

- One test per behavior, through the public interface (lesson schema, engine step playback). No tests for implementation details.
- Lesson text is Korean; technical terms stay in English (`DispatcherServlet`, `B+Tree`, `ENI`).
- Before writing a fact, check it against the official documentation for the pinned version, and put that link in `sources`.

## Read first

| Task | Read first |
|---|---|
| Add or change a lesson | `docs/PRODUCT.md`, `docs/ARCHITECTURE.md` (Lesson format) |
| Change the engine or a scene primitive | `docs/ARCHITECTURE.md`, `docs/DESIGN.md` |
| Visual or interaction change | `docs/DESIGN.md` |
| Deploy | `docs/ARCHITECTURE.md` (Deploy) |
| Why something is the way it is | `docs/decisions/` |

Record every settled decision in `docs/decisions/`.
