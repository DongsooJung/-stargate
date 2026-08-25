#!/usr/bin/env python3
"""서재_JSON_생성기.py — Notion 서재 전체 → reading/data/notion-library.json

GitHub Actions에서는 Node 스크립트(update-library-from-notion.mjs)를 쓰고,
로컬/대체 실행용으로 동일 스키마의 Python 생성기를 제공합니다.

환경변수:
  NOTION_API_KEY (필수)
  NOTION_DATA_SOURCE_ID / NOTION_LIBRARY_DATA_SOURCE_ID (선택)
  LIBRARY_ONLY_COMPLETED=1 이면 완독만
"""

from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "reading" / "data" / "notion-library.json"
API_KEY = os.environ.get("NOTION_API_KEY") or os.environ.get("NOTION_TOKEN")
DATA_SOURCE_ID = (
    os.environ.get("NOTION_LIBRARY_DATA_SOURCE_ID")
    or os.environ.get("NOTION_DATA_SOURCE_ID")
    or "66846d6d-864e-42dc-99db-2b61b315f8d4"
)
NOTION_VERSION = "2026-03-11"
ONLY_COMPLETED = os.environ.get("LIBRARY_ONLY_COMPLETED") == "1"

COLORS = {
    "AI·IT·프로그래밍": ["#334d6e", "#18283d"],
    "비즈니스·경영·창업": ["#6b4b2a", "#332313"],
    "투자·재테크·경제": ["#3c6447", "#1d3524"],
    "자기계발·심리": ["#704050", "#37202a"],
    "인문·사회·역사": ["#684c35", "#33251a"],
    "도시·부동산·건축": ["#5b4636", "#2d2119"],
    "교육·학습": ["#315f68", "#173137"],
    "과학·기술": ["#3e526b", "#1d2938"],
    "소설·문학": ["#68405f", "#351f30"],
    "법률·행정": ["#4f5663", "#262b33"],
    "군사·안보": ["#4b5c42", "#242f20"],
    "기타": ["#505766", "#262b34"],
}


def rich_text(prop: dict | None) -> str:
    if not prop:
        return ""
    items = prop.get("title") or prop.get("rich_text") or []
    return "".join(item.get("plain_text") or "" for item in items)


def select(prop: dict | None) -> str:
    if not prop:
        return ""
    if prop.get("select"):
        return prop["select"].get("name") or ""
    if prop.get("status"):
        return prop["status"].get("name") or ""
    return ""


def multi_select(prop: dict | None) -> list[str]:
    if not prop:
        return []
    return [item.get("name") for item in (prop.get("multi_select") or []) if item.get("name")]


def number(prop: dict | None) -> int:
    value = (prop or {}).get("number")
    return int(value) if isinstance(value, (int, float)) and value >= 0 else 0


def date_val(prop: dict | None) -> str:
    start = ((prop or {}).get("date") or {}).get("start")
    return (start or "")[:10]


def checkbox(prop: dict | None) -> bool:
    return bool((prop or {}).get("checkbox"))


def rating(prop: dict | None) -> int:
    return min(5, max(0, select(prop).count("⭐")))


def keywords(prop: dict | None) -> list[str]:
    raw = rich_text(prop)
    parts = []
    for chunk in raw.replace("，", ",").replace("\n", ",").split(","):
        token = chunk.strip().lstrip("#")
        if token:
            parts.append(token)
    return parts


def quotes(prop: dict | None) -> list[dict]:
    return [{"t": line.strip(), "s": "Notion 기록"} for line in rich_text(prop).splitlines() if line.strip()]


def normalize(page: dict) -> dict:
    props = page.get("properties") or {}
    genre = select(props.get("대분류")) or select(props.get("장르")) or "기타"
    completed = date_val(props.get("완독일"))
    started = date_val(props.get("시작일")) or completed
    c1, c2 = COLORS.get(genre, COLORS["기타"])
    return {
        "id": page["id"].replace("-", ""),
        "title": rich_text(props.get("도서명")) or rich_text(props.get("Name")) or "제목 미등록",
        "author": rich_text(props.get("저자")),
        "pub": rich_text(props.get("출판사")),
        "genre": genre,
        "status": select(props.get("독서상태")) or "미분류",
        "public": checkbox(props.get("웹공개")),
        "rating": rating(props.get("평점")),
        "start": started,
        "end": completed,
        "pages": number(props.get("페이지수")),
        "days": None,
        "c1": c1,
        "c2": c2,
        "oneline": rich_text(props.get("한줄평")),
        "quotes": quotes(props.get("인용문")),
        "review": rich_text(props.get("독후감본문")),
        "recommend": multi_select(props.get("추천대상")),
        "tags": keywords(props.get("핵심키워드")),
    }


def query(start_cursor: str | None = None) -> dict:
    body: dict = {
        "sorts": [{"timestamp": "last_edited_time", "direction": "descending"}],
        "page_size": 100,
    }
    if ONLY_COMPLETED:
        body["filter"] = {"property": "독서상태", "select": {"equals": "완독"}}
    if start_cursor:
        body["start_cursor"] = start_cursor

    req = urllib.request.Request(
        f"https://api.notion.com/v1/data_sources/{DATA_SOURCE_ID}/query",
        data=json.dumps(body).encode(),
        headers={
            "authorization": f"Bearer {API_KEY}",
            "content-type": "application/json",
            "notion-version": NOTION_VERSION,
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            return json.load(resp)
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")[:500]
        raise SystemExit(f"Notion API HTTP {exc.code}: {detail}") from exc


def main() -> None:
    if not API_KEY:
        raise SystemExit("NOTION_API_KEY가 없습니다.")

    pages: list[dict] = []
    cursor = None
    while True:
        payload = query(cursor)
        pages.extend(item for item in payload.get("results", []) if item.get("object") == "page")
        if not payload.get("has_more"):
            break
        cursor = payload.get("next_cursor")

    books = sorted(
        (normalize(page) for page in pages),
        key=lambda book: (book.get("end") or "", book.get("title") or ""),
        reverse=True,
    )

    previous: dict = {"meta": {}, "books": [], "posts": []}
    if OUT.exists():
        previous = json.loads(OUT.read_text(encoding="utf-8"))
    previous_list = previous.get("books") or previous.get("posts") or []
    changed = json.dumps(previous_list, ensure_ascii=False) != json.dumps(books, ensure_ascii=False)
    now = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")

    output = {
        "meta": {
            "status": "connected",
            "source": "Notion · 📖 독서 LOG & 독후감 (서재 전체)",
            "generatedAt": now if changed else previous.get("meta", {}).get("generatedAt", now),
            "publicFilter": "독서상태 = 완독 (웹공개 제한 없음)" if ONLY_COMPLETED else "필터 없음 · 서재 전체",
            "count": len(books),
        },
        "books": books,
        "posts": books,
    }

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(output, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    suffix = "" if changed else " (변경 없음)"
    print(f"Notion 서재 {len(books)}권 동기화 완료{suffix}", file=sys.stderr)


if __name__ == "__main__":
    main()
