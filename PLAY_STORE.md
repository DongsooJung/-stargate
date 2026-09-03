# Stargate Google Play 배포 준비

| 구분 | 위치 |
|------|------|
| 웹앱 | https://stargateedu.co.kr/-stargate/ |
| 수업 예약 | https://stargateedu.co.kr/-stargate/schedule.html |
| 출결 보고서 | https://stargateedu.co.kr/-stargate/report.html |
| Play 패키지 | `kr.co.stargateedu.app` · 1.0.0 (versionCode 3) |
| 개인정보처리방침 | https://stargateedu.co.kr/-stargate/privacy.html |

계정: **법인(조직) 개발자** — 비공개 테스트 12명×14일 **불필요**. 설문·스토어 등록정보 완료 후 프로덕션 바로 제출.

## 현황 (2026-09-03)

- [x] 법인 계정 인증·결제
- [x] 서명 AAB / APK
- [x] 아이콘·피처·스크린샷 5장
- [x] 스토어 문구 · 데이터 보안 · IARC 가이드
- [x] 앱 방침 URL 라이브
- [x] 업로드 키 SHA-256 패치 (`play-store/.well-known-patch/assetlinks.json`)
- [ ] Play Console 앱 생성 + 프로덕션 AAB 업로드 + 심사
- [ ] Play 앱 서명 키를 라이브 `assetlinks.json`에 반영 (포털)

**클릭 순서:** [`play-store/CONSOLE_STEPS.md`](play-store/CONSOLE_STEPS.md)
