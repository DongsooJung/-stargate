#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
TARGET="${1:-}"
if [[ -z "$TARGET" || ! -d "$TARGET" ]]; then
  echo "Usage: $0 /path/to/dongsoojung.github.io"
  exit 1
fi
cp -a "$ROOT/dongsoojung.github.io/kstartup" "$TARGET/"
mkdir -p "$TARGET/api" "$TARGET/supabase" "$TARGET/scripts" "$TARGET/.github/workflows"
cp "$ROOT/dongsoojung.github.io/api/kstartup.js" "$TARGET/api/"
cp "$ROOT/dongsoojung.github.io/supabase/kstartup.sql" "$TARGET/supabase/"
cp "$ROOT/dongsoojung.github.io/scripts/apply-kstartup-schema.mjs" "$TARGET/scripts/"
cp "$ROOT/dongsoojung.github.io/.github/workflows/apply-kstartup-schema.yml" "$TARGET/.github/workflows/"
# Fully patched hub pages (strategy / research / home)
cp "$ROOT/dongsoojung.github.io/strategy/index.html" "$TARGET/strategy/index.html"
cp "$ROOT/dongsoojung.github.io/research/index.html" "$TARGET/research/index.html"
cp "$ROOT/dongsoojung.github.io/index.html" "$TARGET/index.html"
echo "Synced K-Startup dashboard + strategy/research/home links into $TARGET"
