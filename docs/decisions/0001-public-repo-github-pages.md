---
status: accepted
date: 2026-11-03
---

# 0001. Public repository on GitHub Pages

## Context

The owner wants to study from the site in a browser at any time and build it with Claude Code cloud sessions, which need a GitHub repository. The owner's existing study repository, `STACK`, is private.

## Decision

A new public repository, `Bequeller/vStackExplorer`, deployed to GitHub Pages through a GitHub Actions workflow.

## Reason

- On GitHub Free, Pages works only for public repositories; private repositories need Pro or higher ([GitHub's plans](https://docs.github.com/en/get-started/learning-about-github/githubs-plans), [Creating a GitHub Pages site](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site), checked 2026-11-03).
- A separate repository keeps cloud sessions away from uncommitted work in `STACK`.
- The content is study material with no secrets.

## Alternatives

- Folder inside `STACK` — Pages would need a paid plan; Vercel or Cloudflare Pages would work but adds a second host.
- Private repository with Vercel — works, but no reason to hide the material.
