#!/usr/bin/env bash
# Every check. The browser ones need the dev server: npm run dev -- --port 5181
cd "$(dirname "$0")/.."
fail=0
for t in tests/*.mjs; do printf '%-22s %s\n' "$t" "$(node "$t" | tail -1)" || fail=1; done
for t in tests/*.js; do printf '%-22s %s\n' "$t" "$(node "$t" | tail -1)" || fail=1; done
