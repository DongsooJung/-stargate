# portal-sync · Notion 서재(약 598권) 연동

Cloud Agent는 `dongsoojung.github.io`에 push 권한이 없어,
변경분은 이 폴더에 두고 **로컬에서 포털 레포로 복사**합니다.

## 무엇을 추가하나

| 파일 | 역할 |
|------|------|
| `reading/data/notion-library.json` | 서재 전체 스냅샷 (Actions가 갱신) |
| `scripts/update-library-from-notion.mjs` | Notion → JSON (필터 없음) |
| `scripts/서재_JSON_생성기.py` | 동일 로직 Python 대체 실행기 |
| `.github/workflows/update-library.yml` | 매일 21:20 UTC + 수동 실행 |
| `reading/index.html` | `notion-library.json` 우선 로드 |

기존 `update-reading-from-notion`(웹공개∧완독 → `notion-reading.json`)은 **그대로 유지**합니다.
서재 목록과 공개 독후감을 분리했습니다.

## 한 줄 적용

```bash
./portal-sync/apply-reading-library.sh /path/to/dongsoojung.github.io
cd /path/to/dongsoojung.github.io
git checkout -b cursor/reading-library-sync
git add reading/data/notion-library.json reading/index.html \
  scripts/update-library-from-notion.mjs "scripts/서재_JSON_생성기.py" \
  .github/workflows/update-library.yml
git commit -m "feat: 서재 598권 데이터 연동 + 자동 갱신"
git push -u origin HEAD
```

PR 머지 후 Actions → **Update library catalog from Notion** → Run workflow.

## 시크릿 / 변수

포털에 이미 있는 것을 재사용합니다.

- `secrets.NOTION_API_KEY` (필수, reading 워크플로와 동일)
- `vars.NOTION_DATA_SOURCE_ID` (선택 — 없으면 스크립트 기본값 사용)
- `vars.NOTION_LIBRARY_DATA_SOURCE_ID` (선택 — 서재 전용 DB가 따로 있을 때)

완독만 모으려면 Actions env에 `LIBRARY_ONLY_COMPLETED=1` 추가.

## 로컬 수동 생성

```bash
export NOTION_API_KEY=...
node scripts/update-library-from-notion.mjs
# 또는
python3 scripts/서재_JSON_생성기.py
```
