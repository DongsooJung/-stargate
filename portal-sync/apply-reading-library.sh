#!/usr/bin/env bash
# Apply Notion library catalog sync into a local dongsoojung.github.io checkout.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
SRC="$ROOT/dongsoojung.github.io"
TARGET="${1:-}"

if [[ -z "$TARGET" || ! -d "$TARGET" ]]; then
  echo "Usage: $0 /path/to/dongsoojung.github.io"
  exit 1
fi

mkdir -p "$TARGET/reading/data" "$TARGET/scripts" "$TARGET/.github/workflows"

cp "$SRC/scripts/update-library-from-notion.mjs" "$TARGET/scripts/"
cp "$SRC/scripts/서재_JSON_생성기.py" "$TARGET/scripts/"
cp "$SRC/.github/workflows/update-library.yml" "$TARGET/.github/workflows/"
cp "$SRC/reading/data/notion-library.json" "$TARGET/reading/data/"
cp "$SRC/reading/index.html" "$TARGET/reading/index.html"
# config.js is optional refresh
if [[ -f "$SRC/reading/config.js" ]]; then
  cp "$SRC/reading/config.js" "$TARGET/reading/config.js"
fi

cat <<EOF
Synced Notion library catalog into $TARGET

Next:
  cd $TARGET
  git checkout -b cursor/reading-library-sync
  git add reading/data/notion-library.json reading/index.html \\
    scripts/update-library-from-notion.mjs scripts/서재_JSON_생성기.py \\
    .github/workflows/update-library.yml
  git commit -m "feat: 서재 598권 데이터 연동 + 자동 갱신"
  git push -u origin HEAD

Then in GitHub Actions: run "Update library catalog from Notion" (workflow_dispatch).
Uses existing secret NOTION_API_KEY (same as reading sync).
EOF
