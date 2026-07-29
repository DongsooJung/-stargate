# portal-sync · dongsoojung.github.io

이 폴더는 www.stargateedu.co.kr (DongsooJung/dongsoojung.github.io)에
K-Startup 대시보드를 이식하기 위한 패키지입니다.

현재 Cloud Agent 토큰은 `-stargate` 저장소에만 push 권한이 있어
포털 저장소에는 직접 push하지 못했습니다.

## 적용 방법

```bash
# 1) 포털 저장소 클론
git clone https://github.com/DongsooJung/dongsoojung.github.io.git
cd dongsoojung.github.io

# 2) 파일 복사
cp -a ../portal-sync/dongsoojung.github.io/kstartup ./
cp portal-sync 경로의 api/kstartup.js ./api/
cp .../supabase/kstartup.sql ./supabase/
cp .../scripts/apply-kstartup-schema.mjs ./scripts/
cp .../.github/workflows/apply-kstartup-schema.yml ./.github/workflows/

# 3) strategy/index.html
# - 분석 프레임 표에 matrix-row.snippet.html 행 추가
# - 전략 보고서 그리드 상단에 kstartup-card.snippet.html 카드 추가
# - 히어로 통계 프로젝트 수 +1

# 4) index.html 프로젝트 그리드에 index-kstartup-card.snippet.html 추가
# 5) Vercel에 api/kstartup.js 배포 + DATA_GO_KR_API_KEY 확인
# 6) supabase/kstartup.sql 적용
```
