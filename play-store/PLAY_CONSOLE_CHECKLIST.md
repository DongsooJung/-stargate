# Google Play Console 제출 체크리스트 — Stargate

패키지: `kr.co.stargateedu.app` · 웹: https://stargateedu.co.kr/

## A. 개발자 계정

- [x] [Play Console](https://play.google.com/console) 가입 (법인 계정)
- [x] 신원 확인(조직) 완료
- [x] 법인 계정 — 비공개 테스트 12명×14일 **해당 없음**

## B. 앱 생성

- [ ] 앱 이름: **Stargate**
- [ ] 기본 언어: 한국어
- [ ] 앱 또는 게임: 앱
- [ ] 무료
- [ ] 선언: Play 정책 / US export laws 동의

## C. 정책·설문

| 항목 | 입력값 |
|------|--------|
| 개인정보처리방침 | https://stargateedu.co.kr/-stargate/privacy.html |
| 광고 포함 | 아니요 |
| 타겟 연령 | 만 18세 이상(또는 교육 앱에 맞게 선택) |
| 뉴스 앱 | 아니요 |
| COVID 관련 | 아니요 |
| 데이터 보안 | 예약 시 이름·전화·이메일 수집 (`DATA_SAFETY.md`) |
| 콘텐츠 등급 | IARC 설문 완료 |

> 방침 URL은 `https://stargateedu.co.kr/-stargate/privacy.html` (예약 연락처 수집을 명시).

## D. 스토어 등록정보 (한국어)

### 짧은 설명 (80자 이내)

```
AI·교육·공간계량 포털. 수업 예약과 출결, Stargate 프로젝트를 한 앱에서.
```

### 전체 설명

```
Stargate는 Stargate Corporation의 공식 포털 앱입니다.

대치동 기반 AI·교육·공간계량 프로젝트를 모은 홈과,
수학·KOI 수업 예약·출결 현황을 모바일에서 바로 이용할 수 있습니다.

주요 기능
• 포털 홈 — 프로젝트·연구·교육 콘텐츠
• 수업 예약 — 주간 시간표에서 슬롯 예약 (2026년 8월~)
• 출결 보고서 — 당일 수업 출결 현황

웹사이트: https://stargateedu.co.kr/
수업 예약: https://stargateedu.co.kr/-stargate/schedule.html
문의: ceo@stargateedu.co.kr
```

### 그래픽 에셋

| 에셋 | 규격 | 파일 |
|------|------|------|
| 앱 아이콘 | 512×512 | `../assets/icons/icon-512.png` |
| 피처 그래픽 | 1024×500 | `store-listing/feature-graphic.png` |
| 휴대전화 스크린샷 | 1080×1920 × 5 | `store-listing/screenshots/01`~`05` |

## E. 출시 (AAB)

1. [ ] 프로덕션 트랙에 `Stargate-1.0.0.aab` 업로드 (법인 계정 — 비공개 테스트 생략)
2. [ ] Play App Signing → **앱 서명 키 SHA-256** 복사
3. [ ] `.well-known/assetlinks.json`에 Play 서명 키 지문 추가 후 포털 배포
4. [ ] Digital Asset Links [테스터](https://developers.google.com/digital-asset-links/tools/generator) 통과
5. [ ] 프로덕션 심사 제출

## F. 빌드 산출물 (로컬/아티팩트)

- AAB: Play Console 업로드용
- APK: `adb install` 사전 테스트용
- 업로드 키스토어: 비공개 백업 필수 (저장소 커밋 금지)
