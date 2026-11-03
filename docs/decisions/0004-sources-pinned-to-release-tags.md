---
status: accepted
date: 2026-11-03
---

# 0004. Sources point to release-tag URLs

## Context

Every step needs a source with a URL and the version it describes (decision 0003). Rendered reference sites such as docs.spring.io show the latest version by default, and their URLs can move between versions. The session that wrote the first lesson could not reach docs.spring.io at all (blocked by its network policy), but could read the Spring and Tomcat repositories at their release tags.

## Decision

Prefer source URLs pinned to the release tag: `https://github.com/<owner>/<repo>/blob/<tag>/<path>#L<from>-L<to>`. This covers both source code and the reference documentation's own source (for Spring, `framework-docs/modules/ROOT/pages/...adoc` and `documentation/spring-boot-docs/...adoc`). A rendered docs URL is also fine when it names the version in its path and was opened when written. The `version` field names the product and exact release (for example `Spring Framework 7.0.10`).

## Reason

- A tag never moves, so the link and its line anchor show exactly the text the fact was checked against.
- Line anchors make each fact checkable in seconds, which is the point of decision 0003.
- The reference-doc sources in the repository are the same official text that docs.spring.io renders.

## Alternatives

- Unversioned docs.spring.io URLs — they drift to the next release and cannot be pinned to a line.
- Javadoc URLs — official and versioned, but they describe contracts, not the control flow most steps explain.
