# Play Console — 순차 제출 가이드 (1→끝)

개발자 계정 인증·결제 완료 후, **위에서 아래로만** 진행하세요.
패키지: `kr.co.stargateedu.app` · 버전 `1.0.0` (versionCode 3)

콘솔: https://play.google.com/console/u/0/developers/5270732068654725252/app-list

업로드 파일:
- AAB: 아티팩트 `Stargate-1.0.0.aab`
- 아이콘: `play-store/store-listing/icon-512.png`
- 피처 그래픽: `play-store/store-listing/feature-graphic.png`
- 스크린샷: `play-store/store-listing/screenshots/` (01~05, 1080×1920)

---

## 1. 앱 만들기

앱 목록 → **앱 만들기**

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
- 카테고리: **교육** (또는 비즈니스)
- 이메일: `ceo@stargateedu.co.kr`
- 웹사이트: `https://stargateedu.co.kr/`
- 개인정보처리방침: `https://stargateedu.co.kr/-stargate/privacy.html`

이 PR이 main에 머지되면 위 방침 URL이 살아 있습니다. 머지 전이면 임시로 `https://stargateedu.co.kr/privacy.html` 사용.

---

## 3. 콘텐츠 등급 (IARC)

설문 시작 → 카테고리 **유틸리티 / 생산성 / 교육**에 가깝게 선택.

권장 답:
- 폭력, 성적 콘텐츠, 마약, 도박, 욕설: **없음**
- 사용자 간 소통: **없음**(채팅 없음). 예약 폼만 있음 → “사용자가 만든 콘텐츠”는 **아니요**가 맞음
- 위치 공유: **아니요**
- 완료 후 등급 적용

---

## 4. 타겟 연령

첫 출시는 **만 18세 이상**을 권장합니다.
(13세 미만/가족을 위한 앱이면 Designed for Families 추가 심사가 붙습니다.)

---

## 5. 데이터 보안

자세한 칸 매핑은 `DATA_SAFETY.md`.

요약:
- 수집: **이름, 전화번호, 이메일**(수업 예약 시, 선택)
- 공유: **아니요**(처리자 Supabase는 “서비스 제공업체”로만)
- 판매: **아니요**
- 보안 관행: 전송 중 암호화 **예**(HTTPS)
- 삭제 요청: **예** (`ceo@stargateedu.co.kr`)

---

## 6. 스토어 등록정보 (한국어)

짧은 설명·전체 설명은 `STORE_LISTING_KO.md`를 그대로 붙여 넣습니다.

그래픽:
1. 앱 아이콘 512×512 → `icon-512.png`
2. 피처 그래픽 1024×500 → `feature-graphic.png`
3. 휴대전화 스크린샷 최소 2장 (권장 전부 업로드)
   - `01-home.png` 포털 홈
   - `02-schedule.png` 수업 예약
   - `03-stargate-home.png` Stargate 홈
   - `04-report.png` 출결 보고서
   - `05-reading.png` 서재

---

## 7. 내부 테스트에 AAB 업로드

테스트 → **내부 테스트** → 새 버전 만들기 → `Stargate-1.0.0.aab` 업로드 → 출시.

본인 Gmail을 테스터로 추가하고, 테스트 링크에서 설치해 실행을 확인합니다.

---

## 8. Play 앱 서명 SHA-256 복사 (필수)

설정 → **앱 서명** → **앱 서명 키 인증서**의 SHA-256 지문을 복사합니다.

업로드 키 지문(이미 준비됨):
```
B2:30:C1:2C:19:3D:2E:E7:7F:E8:FD:23:FD:74:C6:B3:AF:C4:F6:EA:1D:F2:03:57:09:C3:CD:10:43:9D:89:92
```

Play 서명 키 지문을 채팅에 붙여 주시면 `assetlinks.json`에 추가해 드립니다.
그 파일을 포털 `.well-known/assetlinks.json`에 반영해야 **주소창이 사라집니다**.

검증: https://developers.google.com/digital-asset-links/tools/generator  
호스트 `stargateedu.co.kr` · 패키지 `kr.co.stargateedu.app`

---

## 9. 개인 계정 비공개 테스트 (프로덕션 전)

2023-11 이후 개인 개발자 계정은 프로덕션 전에
**비공개 테스트 테스터 12명 × 14일 연속**이 필요합니다.

1. 테스트 → 비공개 테스트 트랙 생성
2. 같은 AAB 출시
3. 테스터 12명 초대·옵트인
4. 14일 유지 후 프로덕션 제출 가능

---

## 10. 프로덕션 제출

대시보드의 미완료 항목이 0이 되면 **프로덕션** → 출시 → 심사 제출.

---

## 이 환경에서 끝난 것 / 직접 눌러야 하는 것

| 완료 | 직접 진행 |
|------|-----------|
| AAB/APK 서명 빌드 | 콘솔 앱 만들기·설문 |
| 아이콘·피처·스크린샷 | AAB 업로드 |
| 문구·데이터보안 답안 | Play 서명 SHA-256 회신 |
| 업로드 키 + assetlinks 패치 | 포털에 assetlinks 배포 |
| 앱용 개인정보처리방침 | 내부/비공개 테스트·프로덕션 |

업로드 키스토어는 아티팩트 `stargate-upload.keystore`에만 있습니다. **git에 넣지 말고 비밀번호 관리자에 백업**하세요.
