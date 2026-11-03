---
status: accepted
date: 2026-11-03
---

# 0006. Iosevka font files: temporary npm source

## Context

AGENTS.md says to get fonts from their own OFL release. The current official release is Iosevka v34.9.1 (24 Oct 2026). Its plain-family web font package `PkgWebFont-Iosevka-34.9.1.zip` is 259 MB and the unhinted TTF package is 117 MB. The first build session could not download either: its network policy blocks github.com downloads from the shell, and its web fetch tool stops at 10 MB. Building from the tagged source was also blocked, because it runs the upstream build scripts.

## Decision

For now, ship Iosevka v22.1.2 Regular and Bold (latin subset, WOFF2) taken unchanged from the npm package `@fontsource/iosevka@5.3.0`. That package redistributes the upstream release under the SIL OFL 1.1, and its license file ships next to the fonts in `public/fonts/iosevka/`. The README there records the file hashes and the steps to replace them. Replacing them with files from the official v34.9.1 release is an open task for a session that can download the release.

## Reason

- The OFL allows redistribution, and Iosevka has no Reserved Font Name, so the files are licensed correctly.
- The site needs the typeface now for labels and code; Korean prose uses the system sans-serif stack either way.
- Nothing comes from the reference site.

## Alternatives

- Ship no web font until the official files arrive — the scene would use whatever monospace the system has.
- Build Iosevka from the v34.9.1 source — matches the release exactly, but needs permission to run the upstream build.
