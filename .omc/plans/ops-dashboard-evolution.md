# 스타게이트 통합 대시보드 발전 계획

대상: `index.html` `#ops` + `ops-dashboard.js` + 연동 도구(`schedule.html`, `report.html`, `dday.html`, `kstartup/`, `tmap/`)  
기준 브랜치: `cursor/ops-dashboard-ae79` (`b9fe622` TMAP 포함)

이 문서는 구현이 아니라 **실행 순서와 합격 조건**이다. 일정(일/주)은 쓰지 않는다.

---

## Requirements Summary

현재 보드는 홈 최상단에서 12스크린을 5초마다 돌리는 **읽기 전용 월(wall)** 이다.

- 데이터 스크린 01–07은 Supabase 테이블 → Storage JSON → 데모 순으로 붙는다 (`ops-dashboard.js` `hydrateLive` / `loadBookings` 등).
- 08–11은 홈 소개 문구의 복제이고, TMAP은 13번째 스크린이 아니라 `tmap/` 페이지 + 게이트 링크다 (`index.html` 내비, `renderGate`).
- 공개 홈이므로 성명만 `maskName`으로 가리고 전화·이메일은 그리지 않는다.

발전의 목표는 세 가지다.

1. **정직함** — LIVE/DEMO가 실제 데이터 상태를 속이지 않는다.
2. **연구·운영 밀도** — 예약·출결·D-Day·K-Startup·TMAP을 월에서 한눈에 보고, CRUD는 기존 페이지에 남긴다.
3. **순환 리듬** — 스크린을 무작정 늘리지 않고, 5초 벽에 맞는 세트만 돌린다.

비목표: 월에서 예약/출결 작성, 전체 학생 PII 공개, TMAP 지도를 5초 스크린에 그대로 임베드.

---

## Decision Drivers

1. 공개 URL에서 가짜 수업을 실데이터처럼 보이게 하지 않는다.
2. 새 기능은 기존 도구(`schedule.html` 등)와 같은 저장소를 읽는다. 스키마를 새로 만들지 않는다.
3. 한 바퀴 순환은 약 40–60초(8–12스크린 × 5초)를 넘기지 않는다.

---

## Viable Options

### A. 정정 후 밀도 올리기 (채택)

08–11 마케팅 4장을 1장으로 합치고, TMAP 스냅샷 1장을 넣는다. 데이터 스크린은 고치고 새로고침한다.

- 장점: 순환 시간이 줄고, 연구(TMAP)·운영(수업)이 같은 벽에 모인다.
- 단점: 히어로 아래 소개 섹션에 더 의존한다.

### B. 13+스크린으로 확장

TMAP·UrbanVision·출판을 각각 스크린으로 추가한다.

- 장점: 나열은 쉽다.
- 단점: 5초 × 16 = 80초. 월로서 너무 길다. **기각.**

### C. 키오스크 전용 페이지 분리

`dashboard.html?kiosk=1`만 키우고 홈은 링크로 되돌린다.

- 장점: 홈 스크롤이 짧아진다.
- 단점: “맨 위 게시” 결정을 되돌린다. 나중에 옵션으로만 둔다.

---

## Acceptance Criteria

1. 예약 테이블/Storage가 **빈 배열로 성공**하면 오늘·주간 스크린은 데모가 아니라 “이번 주 예약 없음”을 보여야 한다. `hydrateLive`의 `if (!rows.length) return`이 데모를 남기면 실패.
2. 커맨드 센터 시스템 행은 `bookings / attendance / report / dday / kstartup` 다섯 소스를 각각 표시해야 한다. 지금 “출결 보고서”가 `state.source.attendance`만 보는 것은 실패 (`sysRow` 호출부).
3. D-Day 보조 목록의 지난 일정은 `D+N`이어야 한다. `D--3`이면 실패 (`renderDday` 보조 리스트).
4. 탭이 보일 때 최소 45초마다 `hydrateLive`가 다시 돌아가야 한다 (`schedule.html` 45초 폴과 맞춤).
5. TMAP은 순환 스크린 1장으로 들어가되, 지도 SDK를 매 5초마다 부팅하지 않는다. KPI(거리·시간·출발/도착 라벨) + `tmap/` 링크면 합격.
6. 마케팅 스크린은 최대 1장. 08–11 네 장이 그대로면 이 단계 미완료.
7. 공개 벽에 전화·이메일·전체 성명이 새로 노출되면 실패.
8. `npm run test:kstartup`은 계속 통과해야 한다. TMAP 라우트 함수는 좌표 범위·method 가드가 깨지지 않아야 한다 (`api/tmap-route.js`).

---

## Implementation Steps

### Phase 0 — 정직함 (먼저, 침습 최소)

파일: `ops-dashboard.js`

1. `hydrateLive`에서 빈 성공 응답을 **live-empty**로 구분한다. 데모는 fetch 실패(네트워크/404)에만 남긴다.
2. `updateLiveBadge`와 커맨드 `sysRow`를 5소스 + empty 상태로 고친다. “출결”과 “보고서”를 분리한다.
3. `renderDday` 보조 행에 `daysUntil` 부호를 반영한다 (`D-` / `D-DAY` / `D+`).
4. `setInterval(..., 45000)`으로 재하이드. `document.hidden`이면 건너뛴다.

검증: 예약 Storage가 이번 주 0건일 때 히트맵이 데모 점들로 채워지지 않아야 한다.

### Phase 1 — 스크린 세트 재배치

파일: `ops-dashboard.js` `screens[]`, `index.html` 인트로 문구, `renderGate`

권장 세트 (10장, 50초):

| # | 스크린 | 근거 |
|---|--------|------|
| 01 | 커맨드 | 기존 |
| 02 | 오늘 수업 | `schedule.html` 읽기 요약 |
| 03 | 주간 히트맵 | 기존 |
| 04 | 출결 | `report.html` KPI |
| 05 | 보고서 | `stats` jsonb 사용 (`class_daily_reports`) |
| 06 | D-Day | 라벨 수정 반영 |
| 07 | K-Startup | 기존 + 모집중 카운트 |
| 08 | TMAP 스냅샷 | `tmap/`에서 마지막 성공 경로를 `localStorage` 또는 고정 시드 좌표로 표시 |
| 09 | 사업 한 장 | 08–11을 한 카드 그리드로 합침 |
| 10 | 게이트 | 예약/출결/D-Day/K-Startup/TMAP |

`index.html` 섹션 설명의 “12개 스크린”을 실제 개수에 맞춘다.

TMAP 스냅샷 구현 제약:

- 순환 중 `new Tmapv3.Map` 금지. `tmap/app.js`의 KPI 숫자만 재사용하거나 정적 연구 루트(대치↔강남 등) 한 건을 `GET /api/tmap-route`로 미리 받아 텍스트/미니 바로 그린다.
- `TMAP_JS_APP_KEY` / `TMAP_REST_APP_KEY`는 `stargate-homepage` 프로젝트 env에 있어야 프리뷰가 산다. `deploy-kstartup-vercel.yml` 경로 필터에는 TMAP이 없다.

### Phase 2 — 도구와 같은 데이터

파일: `ops-dashboard.js`, 필요 시 공유 헬퍼 `js/ops-data.js` (신규, 선택)

1. 예약: `schedule.html`과 같은 slot key 파서·주간 범위를 유지하되, 월에는 과목 집계(수학/KOI/상담 수)를 커맨드 KPI 옆에 넣는다.
2. 출결: `report.html`의 present/late/absent/excused/pending 카운트를 그대로. `stats`가 있으면 그 값을 우선한다.
3. K-Startup: `limit=8` 유지. 행 클릭은 `kstartup/`로만 보낸다. 차트는 넣지 않는다(5초 화면에 Chart.js 부팅 비용).
4. 새로고침 중 스크린이 깜빡이지 않게 `renderAll` 대신 활성 스크린만 패치하거나 페이드를 유지한다.

### Phase 3 — 키오스크 옵션 (홈 최상단은 유지)

파일: `index.html`, `ops-dashboard.js`

- `?kiosk=1` 이면 히어로 이하를 숨기고 `#opsFrame`이 `100vh`를 채운다. 전체화면 버튼과 동일 레이아웃.
- 호버 일시정지는 키오스크에서 끈다(TV에 커서가 남아 멈추는 문제).

### Phase 4 — 배포

- 푸시로 `stargate-homepage` + `stargate-mcp` 프리뷰가 다시 빌드되는지 확인.
- TMAP 키가 없는 환경에서는 스크린 08이 “TMAP 키 없음 · tmap/에서 설정” empty를 보여야 하며, 나머지 순환은 죽지 않아야 한다.
- `api/kstartup.js` 전용 스크립트는 그대로 두고, 홈 프로젝트에는 `api/tmap-*.js`가 루트 배포에 포함된다 (`vercel.json` regions only).

---

## Risks and Mitigations

| 위험 | 완화 |
|------|------|
| 빈 주를 데모로 채워 학원 운영이 있는 것처럼 보임 | Phase 0 live-empty |
| TMAP 지도가 5초마다 재생성되어 쿼터/버벅임 | 스냅샷만, SDK는 `tmap/`에만 |
| 공개 홈에 경로 좌표·학생 정보가 과다 노출 | 성명 마스킹 유지, TMAP은 라벨만 |
| 스크린 수 증가로 한 바퀴가 너무 김 | 세트 상한 10–12, 마케팅 압축 |
| `stargate-kstartup-api` CI가 TMAP을 안 올림 | TMAP은 홈 프로젝트 풀 배포에 의존한다고 명시 |
| `hydrateLive` 재실행이 현재 스크린을 01로 리셋 | `keepIndex` 유지 (이미 있음) + 재렌더 최소화 |

---

## Verification Steps

1. 로컬 `python3 -m http.server 3000` → `/index.html` 최상단 보드, 순환, 이전/다음.
2. 네트워크 차단 또는 잘못된 키: 전 소스 DEMO, 앱이 죽지 않음.
3. 예약 Storage 빈 주: 오늘/주간이 비어 있고 배지가 해당 소스를 live-empty로 표시.
4. D-Day에 지난 날짜만 있을 때 보조 리스트가 `D+N`.
5. 45초 대기 후 네트워크 탭에 재요청.
6. TMAP 스크린이 지도 대신 KPI/링크. `/tmap/`은 기존처럼 지도가 뜸.
7. `?kiosk=1`에서 히어로가 안 보임, 호버로 순환이 멈추지 않음.
8. `npm run test:kstartup`.
9. 프로덕션 `https://stargate-homepage.vercel.app/` 하드 리프레시 후 첫 화면이 `#ops`.

---

## ADR

- **Decision:** Option A — 정직함 수정 후 스크린을 압축하고 TMAP을 스냅샷 1장으로 넣는다.
- **Drivers:** 공개 월의 신뢰, 5초 리듬, 기존 페이지와의 역할 분리.
- **Alternatives:** B 스크린 증식, C 홈에서 보드 제거.
- **Why chosen:** 이미 홈 최상단에 게시했고(`11d1470`), TMAP은 연구 축으로 들어왔다(`b9fe622`). 둘을 같은 순환에 넣되 길이를 늘리지 않는 쪽이 맞다.
- **Consequences:** 소개 카피는 히어로·Services에 남는다. 월은 운영/연구 요약이 된다.
- **Follow-ups:** Phase 0부터 이 브랜치에서 구현. 키오스크는 Phase 3.

---

## Changelog (계획 문서)

- 초안: 코드 조사 기준 Phase 0–4 확정. 구현 시작 전 문서.
- 구현: Phase 0–3을 `ops-dashboard.js` / `index.html` / `tmap/app.js`에 반영. Phase 4는 배포.
