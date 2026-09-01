# K-Startup 지원사업 관측소

창업진흥원 **K-Startup(사업소개, 사업공고, 콘텐츠 등) 조회서비스** (`15125364`)를
**100건씩** 조회하고 Supabase에 upsert하는 전략 대시보드입니다.

## 엔드포인트

| 리소스 | API | 테이블 |
|--------|-----|--------|
| announcements | `getAnnouncementInformation01` | `kstartup_announcements` |
| business | `getBusinessInformation01` | `kstartup_business` |
| contents | `getContentInformation01` | `kstartup_contents` |
| statistics | `getStatisticalInformation01` | `kstartup_statistics` |

- 공식: `https://apis.data.go.kr/B552735/kisedKstartupService01`
- 폴백: `https://nidapi.k-startup.go.kr/api/kisedKstartupService/v1`
- 프록시: `POST /api/kstartup` (정적 호스트에서는 `stargate-bid-api.vercel.app`)

## 로컬

```bash
# 스키마 적용
SUPABASE_ACCESS_TOKEN=... node scripts/apply-kstartup-schema.mjs

# 또는 SQL Editor에서 supabase/kstartup.sql 실행
```

## 포털 배포

www.stargateedu.co.kr 전략 대시보드에 넣으려면
`portal-sync/dongsoojung.github.io/` 내용을
[DongsooJung/dongsoojung.github.io](https://github.com/DongsooJung/dongsoojung.github.io)
루트에 복사한 뒤 Vercel에 `api/kstartup.js`가 배포되도록 하면 됩니다.
