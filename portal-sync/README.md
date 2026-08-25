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
