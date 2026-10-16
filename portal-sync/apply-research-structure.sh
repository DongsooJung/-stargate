#!/usr/bin/env bash
# Copy the restructured research hub into a dongsoojung.github.io checkout.
set -euo pipefail

TARGET="${1:-}"
if [[ -z "$TARGET" || ! -d "$TARGET" ]]; then
  echo "usage: apply-research-structure.sh /path/to/dongsoojung.github.io" >&2
  exit 1
fi

ROOT="$(cd "$(dirname "$0")" && pwd)/dongsoojung.github.io"
mkdir -p "$TARGET/research" "$TARGET/assets"
cp "$ROOT/research/index.html" "$TARGET/research/index.html"
cp "$ROOT/assets/intelligence-hub.js" "$TARGET/assets/intelligence-hub.js"

python3 - "$TARGET/index.html" << 'PY'
import pathlib, sys
path = pathlib.Path(sys.argv[1])
if not path.exists():
    raise SystemExit(0)
text = path.read_text(encoding="utf-8")
replacements = {
    "도시·공간·경제·과학 · 55개 프로젝트": "관측·연구·교육·운영 · 61개 프로젝트",
    "도시·공간·경제·도구 · 27개 프로젝트": "관측·연구·교육·운영 · 61개 프로젝트",
    "서울 도시데이터, 환율·무역·관광 등 공공데이터를 인터랙티브 대시보드로 탐색합니다.": "관측 데이터, 연구 논증, 교육 자료를 레인으로 나눠 탐색합니다.",
}
updated = text
for old, new in replacements.items():
    updated = updated.replace(old, new)
if updated != text:
    path.write_text(updated, encoding="utf-8")
    print(f"updated {path}")
else:
    print(f"homepage already current or strings differ: {path}")
PY

echo "research hub copied to $TARGET"
