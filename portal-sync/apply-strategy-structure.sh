#!/usr/bin/env bash
# Copy the restructured strategy hub, research additions, and shared hub script.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
TARGET="${1:-}"
if [[ -z "$TARGET" || ! -d "$TARGET" ]]; then
  echo "Usage: $0 /path/to/dongsoojung.github.io"
  exit 1
fi
mkdir -p "$TARGET/strategy" "$TARGET/research" "$TARGET/assets"
cp "$ROOT/dongsoojung.github.io/strategy/index.html" "$TARGET/strategy/index.html"
cp "$ROOT/dongsoojung.github.io/research/index.html" "$TARGET/research/index.html"
cp "$ROOT/dongsoojung.github.io/assets/intelligence-hub.js" "$TARGET/assets/intelligence-hub.js"
cp "$ROOT/dongsoojung.github.io/assets/theme-boot.js" "$TARGET/assets/theme-boot.js"
echo "Synced strategy shelves, research weather/Notion cards, and intelligence-hub.js into $TARGET"
