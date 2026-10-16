# portal-sync · dongsoojung.github.io

www.stargateedu.co.kr 포털(`DongsooJung/dongsoojung.github.io`)에
기능을 이식하는 패키지입니다. Cloud Agent는 포털에 push 권한이 없어
여기 두고 로컬에서 적용합니다.

## 패키지

| 경로 | 내용 |
|------|------|
| `apply-to-portal.sh` | K-Startup 대시보드 이식 |
| `apply-reading-library.sh` | Notion 서재(~598권) 카탈로그 + 자동 갱신 |
| `READING_LIBRARY.md` | 서재 연동 상세 가이드 |
| `dongsoojung.github.io/` | 포털에 복사할 파일 트리 |

## 서재 연동 (권장)

```bash
./portal-sync/apply-reading-library.sh /path/to/dongsoojung.github.io
```

자세한 절차: [READING_LIBRARY.md](./READING_LIBRARY.md)

## 전략 허브 선반 (2026-10-16)

라이브 전략 페이지를 네 선반(기업 재무 19, 산업 신호 6, 실행·사업개발 9, 관측 트래커 9)으로 다시 묶습니다. 히어로 숫자는 카드 43·플랫폼 12선·기간 2022–26에 맞추고, 알라딘·서점 3사·BidScout·휴게소 입찰 레이더·재무 안내를 목록에 넣습니다. `theme-boot.js`가 전략 히어로에 버튼을 덧붙이고 카드 수를 1 올리던 동작은 빼서, 표시 숫자가 카드 수와 같습니다. 날씨 캘린더와 OneNote·Notion 상태판은 연구 허브로 옮깁니다. 공항 카드는 연구 허브에 이미 있습니다.

`assets/intelligence-hub.js`는 교육·수학 AI 그룹을 연구 허브(`body.research`)에만 붙이고, 전략 허브는 `data-preserve-group-order`로 선반 순서를 유지합니다.

```bash
./portal-sync/apply-strategy-structure.sh /path/to/dongsoojung.github.io
```

## K-Startup 한 줄 적용

포털 저장소는 **vercel[bot]** 이 연결되어 있어, `api/kstartup.js` 가
main(또는 연결된 브랜치)에 들어가면 `stargate-bid-api.vercel.app` 로
자동 배포됩니다.

## 한 줄 적용

```bash
./portal-sync/apply-to-portal.sh /path/to/dongsoojung.github.io
cd /path/to/dongsoojung.github.io
git checkout -b cursor/kstartup-dashboard
git add kstartup api/kstartup.js supabase/kstartup.sql scripts/apply-kstartup-schema.mjs \
  .github/workflows/apply-kstartup-schema.yml strategy/index.html research/index.html index.html
git commit -m "feat: K-Startup 100건 Supabase 전략 대시보드 + Vercel API"
git push -u origin HEAD
# PR 머지 → vercel[bot] Production 배포
```

## Vercel 단독 배포 (토큰)

```bash
export VERCEL_TOKEN=...   # https://vercel.com/account/tokens
export DATA_GO_KR_API_KEY=...
npm run deploy:kstartup-api
# → https://stargate-kstartup-api.vercel.app/api/kstartup
```

## Supabase

```bash
# SQL Editor에서 supabase/kstartup.sql 실행
# 또는
SUPABASE_ACCESS_TOKEN=... node scripts/apply-kstartup-schema.mjs
```
