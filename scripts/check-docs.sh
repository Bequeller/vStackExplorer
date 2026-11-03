#!/usr/bin/env bash
# Check a project's documents against docs/project-docs.md. Prints problems only; exits 1 on any.
# Usage: adapters/check-docs.sh [project-root]
set -uo pipefail

root="$(cd "${1:-.}" && pwd)"
fail=0
err() { echo "DOCS     $*"; fail=1; }

for path in AGENTS.md docs/PRODUCT.md docs/ARCHITECTURE.md docs/decisions; do
  [[ -e "$root/$path" ]] || err "missing $path"
done

# docs/templates/ holds boilerplate in vAgents; research/ is history, not guidance.
docs="$(find "$root/docs" -name '*.md' -not -path '*/templates/*' -not -path '*/research/*' 2>/dev/null)"

while IFS= read -r file; do
  [[ -n "$file" ]] || continue
  rel="${file#"$root"/}"
  front="$(awk 'NR == 1 && $0 != "---" { exit } NR > 1 && $0 == "---" { exit } NR > 1 { print }' "$file")"
  if [[ "$rel" == docs/decisions/* ]]; then
    grep -q '^status:' <<<"$front" || err "$rel: no status"
    grep -q '^date:' <<<"$front" || err "$rel: no date"
    grep -q '^## Reason' "$file" || err "$rel: no ## Reason section"
  else
    grep -q '^last-verified:' <<<"$front" || err "$rel: no last-verified header"
  fi
done <<<"$docs"

while IFS= read -r file; do
  [[ -n "$file" ]] || continue
  dup="$(grep '^## ' "$file" | sort | uniq -d)"
  [[ -z "$dup" ]] || err "${file#"$root"/}: repeated heading ${dup//$'\n'/, }"
done <<<"$docs"$'\n'"$root/AGENTS.md"

# A rationale ledger, when present, covers every AGENTS.md section.
ledger="$(ls "$root"/docs/decisions/*-agents-md-rationale.md 2>/dev/null | tail -1)"
if [[ -n "$ledger" && -f "$root/AGENTS.md" ]]; then
  while IFS= read -r heading; do
    grep -qxF "### ${heading#\#\# }" "$ledger" || err "${ledger#"$root"/}: no rationale for '${heading#\#\# }'"
  done < <(grep '^## ' "$root/AGENTS.md")
fi

exit "$fail"
