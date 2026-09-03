# Play Console — 순차 제출 가이드 (법인 계정)

개발자 **법인 계정** 인증·결제 완료. 개인 계정용 비공개 테스트(12명×14일)는 **해당 없음**.
패키지: `kr.co.stargateedu.app` · 버전 `1.0.0` (versionCode 3)

콘솔: https://play.google.com/console/u/0/developers/5270732068654725252/app-list

업로드 파일:
- AAB: 아티팩트 `Stargate-1.0.0.aab`
- 아이콘: `play-store/store-listing/icon-512.png`
- 피처 그래픽: `play-store/store-listing/feature-graphic.png`
- 스크린샷: `play-store/store-listing/screenshots/` (01~05, 1080×1920)

---

## 1. 앱 만들기

앱 목록 → **앱 만들기** (이미 만들어 두었다면 2번으로)

| 항목 | 값 |
|------|-----|
| 앱 이름 | Stargate |
| 기본 언어 | 한국어 |
| 앱 또는 게임 | 앱 |
| 무료/유료 | 무료 |
| 정책·미국 수출법 | 둘 다 동의 |

---

## 2. 스토어 설정 → 앱 액세스 / 광고 / 카테고리

- 앱 액세스: **모든 기능이 제한 없이 사용 가능**
- 광고: **광고 없음**
- 카테고리: **교육**
- 이메일: `ceo@stargateedu.co.kr`
- 웹사이트: `https://stargateedu.co.kr/`
- 개인정보처리방침: `https://stargateedu.co.kr/-stargate/privacy.html` (라이브 확인됨)

---

## 3. 콘텐츠 등급 (IARC)

설문 시작 → 유틸리티 / 생산성 / 교육에 가깝게 선택.

- 폭력, 성적 콘텐츠, 마약, 도박, 욕설: **없음**
- 사용자 간 소통·UGC: **아니요** (채팅 없음, 예약 폼만)
- 위치 공유: **아니요**
- 완료 후 등급 적용

---

## 4. 타겟 연령

**만 18세 이상** 권장 (Designed for Families 회피).

---

## 5. 데이터 보안

`DATA_SAFETY.md` 그대로.

- 수집: 이름, 전화번호, 이메일 (수업 예약 시, 선택)
- 공유·판매: 아니요
- 전송 중 암호화: 예
- 삭제 요청: 예 (`ceo@stargateedu.co.kr`)

---

## 6. 스토어 등록정보 (한국어)

`STORE_LISTING_KO.md` 붙여 넣기.

1. 앱 아이콘 512×512 → `icon-512.png`
2. 피처 그래픽 1024×500 → `feature-graphic.png`
3. 휴대전화 스크린샷
   - `01-home.png` 포털 홈
   - `02-schedule.png` 수업 예약
   - `03-stargate-home.png` Stargate 홈
   - `04-report.png` 출결 보고서
   - `05-reading.png` 서재

---

## 7. AAB 업로드 → 프로덕션

법인 계정이므로 비공개 테스트 트랙은 **생략**합니다.

1. 출시 → **프로덕션** → 새 버전 만들기
2. `Stargate-1.0.0.aab` 업로드
3. 출시 메모 예: `최초 출시. Stargate 포털·수업 예약·출결 TWA.`
4. 대시보드 미완료 항목이 0인지 확인 후 **심사 제출**

(선택) 본인만 설치해 보고 싶으면 내부 테스트에 같은 AAB를 먼저 올려도 됩니다. 심사 대기 조건은 아닙니다.

---

## 8. Play 앱 서명 SHA-256 (주소창 제거)

설정 → **앱 서명** → 앱 서명 키 SHA-256을 복사해 채팅에 붙여 주세요.

업로드 키 지문(이미 패치 파일에 있음):
```
B2:30:C1:2C:19:3D:2E:E7:7F:E8:FD:23:FD:74:C6:B3:AF:C4:F6:EA:1D:F2:03:57:09:C3:CD:10:43:9D:89:92
```

라이브 `https://stargateedu.co.kr/.well-known/assetlinks.json` 은 아직 placeholder입니다.
포털(`dongsoojung.github.io`)에 패치를 반영해야 TWA 주소창이 사라집니다.
심사 제출은 assetlinks 없이도 가능하고, 반영 전에는 상단에 URL 바가 보입니다.

검증: https://developers.google.com/digital-asset-links/tools/generator  
호스트 `stargateedu.co.kr` · 패키지 `kr.co.stargateedu.app`

---

## 이 환경에서 끝난 것 / 콘솔에서 할 것

| 완료 | 콘솔에서 |
|------|----------|
| AAB/APK 서명 빌드 | 앱 만들기·설문·등록정보 |
| 아이콘·피처·스크린샷 5장 | 프로덕션에 AAB 업로드·심사 제출 |
| 문구·데이터보안 답안 | Play 서명 SHA-256 회신 |
| 방침 URL 라이브 | 포털에 assetlinks 배포 |
| 법인 계정 → 테스트 트랙 생략 | |

업로드 키스토어는 아티팩트 `stargate-upload.keystore`에만 있습니다. git에 넣지 말고 백업하세요.
