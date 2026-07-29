# Stargate Google Play 배포 준비

이 저장소(`-stargate`)는 **수업 예약·출결** 웹앱이며,
Google Play용 네이티브 래퍼(TWA)는 동일 도메인 포털 저장소에서 관리합니다.

| 구분 | 위치 |
|------|------|
| 웹앱 (이 레포) | https://stargateedu.co.kr/-stargate/ |
| 수업 예약 | https://stargateedu.co.kr/-stargate/schedule.html |
| 출결 보고서 | https://stargateedu.co.kr/-stargate/report.html |
| Play TWA 설정 | [dongsoojung.github.io/app](https://github.com/DongsooJung/dongsoojung.github.io/tree/main/app) |
| 패키지명 | `kr.co.stargateedu.app` |
| 개인정보처리방침 | https://stargateedu.co.kr/privacy.html |

## 준비 완료 현황

- [x] PWA manifest / 아이콘 / 개인정보처리방침 (포털)
- [x] Bubblewrap `twa-manifest.json` (패키지·서명키 경로·바로가기)
- [x] Digital Asset Links — 업로드 키 SHA-256 등록
- [x] 서명된 AAB / APK 빌드 (로컬 아티팩트)
- [x] Play Console 제출 체크리스트·짧은/전체 설명·피처 그래픽
- [ ] Play Console에 AAB 업로드 + Play 앱 서명 키 지문을 assetlinks에 추가
- [ ] 내부/비공개 테스트 후 프로덕션 심사

## Play Console에서 할 일

1. https://play.google.com/console 에서 앱 `Stargate` 생성
2. AAB 업로드 (아티팩트 `Stargate-1.0.0.aab`)
3. 스토어 문구·아이콘·피처 그래픽·스크린샷 등록
4. Play 앱 서명 SHA-256을 `.well-known/assetlinks.json`에 추가
5. 내부 테스트 → (개인 계정 시 비공개 테스트 14일) → 프로덕션

상세: 포털 저장소 `app/PLAY_CONSOLE_CHECKLIST.md`
