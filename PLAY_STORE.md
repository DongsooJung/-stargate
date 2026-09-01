# Stargate Google Play 배포 준비

이 저장소(`-stargate`)는 **수업 예약·출결** 웹앱이며,
Google Play용 네이티브 래퍼(TWA)는 동일 도메인 포털과 이 폴더의 빌드 설정으로 배포합니다.

| 구분 | 위치 |
|------|------|
| 웹앱 | https://stargateedu.co.kr/-stargate/ |
| 수업 예약 | https://stargateedu.co.kr/-stargate/schedule.html |
| 출결 보고서 | https://stargateedu.co.kr/-stargate/report.html |
| Play 패키지 | `kr.co.stargateedu.app` |
| 개인정보처리방침 | https://stargateedu.co.kr/-stargate/privacy.html |

## 준비 완료 현황 (2026-09-01)

- [x] 개발자 계정 인증·결제 (콘솔에서 완료)
- [x] 서명된 AAB / APK `1.0.0` (versionCode 3)
- [x] 아이콘 512, 피처 그래픽 1024×500, 휴대전화 스크린샷 5장
- [x] 스토어 문구 · 데이터 보안 답안 · IARC 가이드
- [x] 업로드 키 SHA-256 → `play-store/.well-known-patch/assetlinks.json`
- [ ] Play Console에 앱 생성 + AAB 업로드
- [ ] Play 앱 서명 키 지문을 assetlinks에 추가 후 포털 배포
- [ ] 내부 테스트 → 비공개 테스트 14일 → 프로덕션

**다음 클릭 순서:** [`play-store/CONSOLE_STEPS.md`](play-store/CONSOLE_STEPS.md)
