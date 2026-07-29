# Google Play Console 제출 체크리스트 — Stargate

패키지: `kr.co.stargateedu.app` · 웹: https://stargateedu.co.kr/

## A. 개발자 계정

- [ ] [Play Console](https://play.google.com/console) 가입 ($25 1회)
- [ ] 신원 확인(개인/조직) 완료
- [ ] 개인 계정이면 프로덕션 전 **비공개 테스트 12명 × 14일** 계획

## B. 앱 생성

- [ ] 앱 이름: **Stargate**
- [ ] 기본 언어: 한국어
- [ ] 앱 또는 게임: 앱
- [ ] 무료
- [ ] 선언: Play 정책 / US export laws 동의

## C. 정책·설문

| 항목 | 입력값 |
|------|--------|
| 개인정보처리방침 | https://stargateedu.co.kr/privacy.html |
| 광고 포함 | 아니요 |
| 타겟 연령 | 만 18세 이상(또는 교육 앱에 맞게 선택) |
| 뉴스 앱 | 아니요 |
| COVID 관련 | 아니요 |
| 데이터 보안 | **수집·공유하는 데이터 없음** (앱은 웹뷰/TWA이며, 예약 폼은 웹에서 Supabase로 처리 — 정책에 맞게 재검토) |
| 콘텐츠 등급 | IARC 설문 완료 |

> 예약·출결 페이지가 연락처를 받을 수 있으므로, 실제 출시 전 데이터 보안 설문을 **수집하는 데이터(이름·전화번호)** 기준으로 다시 확인하세요. 필요 시 `privacy.html`도 업데이트합니다.

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
| 휴대전화 스크린샷 | 최소 2장 | 실기기/에뮬레이터에서 홈·예약 화면 캡처 |

## E. 출시 (AAB)

1. [ ] 내부 테스트 트랙에 `Stargate-*.aab` 업로드
2. [ ] Play App Signing 활성화(기본) → **앱 서명 키 SHA-256** 복사
3. [ ] `.well-known/assetlinks.json`에 Play 서명 키 지문 **추가** 후 배포
4. [ ] Digital Asset Links [테스터](https://developers.google.com/digital-asset-links/tools/generator) 통과
5. [ ] 실기기에서 주소창 없이 실행 확인
6. [ ] (개인 계정) 비공개 테스트 14일 충족
7. [ ] 프로덕션 심사 제출

## F. 빌드 산출물 (로컬/아티팩트)

- AAB: Play Console 업로드용
- APK: `adb install` 사전 테스트용
- 업로드 키스토어: 비공개 백업 필수 (저장소 커밋 금지)
