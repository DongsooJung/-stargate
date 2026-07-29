# Stargate — Google Play 앱 빌드 가이드 (TWA)

`stargateedu.co.kr` 홈페이지를 그대로 여는 **Trusted Web Activity(TWA)** 앱입니다.
이 폴더에는 [Bubblewrap](https://github.com/GoogleChromeLabs/bubblewrap) 설정 파일(`twa-manifest.json`)만 버전 관리하고,
Gradle 프로젝트·APK/AAB·서명키는 로컬에서 생성합니다(`.gitignore` 처리됨).

| 항목 | 값 |
|------|-----|
| 패키지명 | `kr.co.stargateedu.app` |
| 앱 이름 | Stargate |
| 시작 URL | `https://stargateedu.co.kr/` |
| 개인정보처리방침 | `https://stargateedu.co.kr/privacy.html` |
| 현재 버전 | `1.0.0` (versionCode 1+) |

## 0. 사전 준비

- Node.js 18+ 설치
- **JDK 17** (Bubblewrap 필수 — JDK 21은 거부됨)
- 사이트가 배포되어 `https://stargateedu.co.kr/manifest.webmanifest` 가 200으로 열리는지 확인
- Bubblewrap 설치: `npm i -g @bubblewrap/cli` 또는 로컬 `npx @bubblewrap/cli`
  (첫 실행 시 JDK 17과 Android SDK를 자동으로 내려받을지 물어봅니다 — Yes 권장)

## 1. 서명키(업로드 키) 생성 — 최초 1회

```bash
cd app
keytool -genkeypair -v \
  -keystore stargate-upload.keystore \
  -alias stargate \
  -keyalg RSA -keysize 2048 -validity 10000
```

> ⚠️ **`stargate-upload.keystore`와 비밀번호는 절대 커밋하지 마세요.**
> 이 저장소는 루트가 그대로 공개 서빙됩니다. 키는 비밀번호 관리자/클라우드 비공개 저장소에 백업하세요.

빌드 시 비밀번호를 환경변수로 넘길 수 있습니다:

```bash
export BUBBLEWRAP_KEYSTORE_PASSWORD='...'
export BUBBLEWRAP_KEY_PASSWORD='...'
```

## 2. 앱 빌드

```bash
cd app
bubblewrap update   # twa-manifest.json 변경 반영
bubblewrap build    # Gradle 빌드 + 서명
```

산출물:
- `app-release-signed.apk` — 실기기 설치 테스트용 (`adb install app-release-signed.apk`)
- `app-release-bundle.aab` — Play Console 업로드용

버전 올릴 때: `twa-manifest.json`의 `appVersionCode`(+1)와 `appVersionName` 수정 후 다시 `bubblewrap update` → `build`.

## 3. Digital Asset Links 지문 등록 (주소창 제거)

앱과 사이트가 같은 소유자임을 증명해야 앱 상단에 브라우저 주소창이 뜨지 않습니다.

1. 업로드 키 SHA-256 지문 확인:
   ```bash
   keytool -list -v -keystore stargate-upload.keystore -alias stargate | grep SHA256
   ```
2. 저장소 루트 `.well-known/assetlinks.json`의 지문을 위 값으로 교체 후 커밋·푸시.
3. **Play App Signing 사용 시(권장, 기본값)**: 첫 업로드 후
   Play Console → 설정 → 앱 서명 페이지의 **앱 서명 키 SHA-256 지문**을 복사해
   `sha256_cert_fingerprints` 배열에 **추가**하세요(업로드 키 지문과 병기).
4. 검증: [Statement List Generator & Tester](https://developers.google.com/digital-asset-links/tools/generator)
   에 `stargateedu.co.kr` + `kr.co.stargateedu.app` + 지문 입력 → 초록불 확인.

업로드 키 지문은 이미 `assetlinks.json`에 반영되어 있습니다.
Play 앱 서명 키 지문은 **첫 AAB 업로드 후** 콘솔에서 받아 추가하세요.

## 4. Google Play Console 배포

상세 체크리스트·문구·에셋 경로는 [`PLAY_CONSOLE_CHECKLIST.md`](./PLAY_CONSOLE_CHECKLIST.md) 참고.

요약:
1. [Play Console](https://play.google.com/console) 개발자 계정 등록 ($25, 1회) + 본인 인증
   - ⚠️ 2023-11 이후 생성한 **개인 계정**은 프로덕션 공개 전
     **비공개 테스트: 테스터 12명 × 14일 연속** 요건이 있습니다.
2. 앱 만들기: 이름 `Stargate`, 기본 언어 한국어, 유형 앱, 무료
3. 대시보드 설문 작성:
   - 개인정보처리방침 URL: `https://stargateedu.co.kr/privacy.html`
   - 데이터 보안: 수집·공유하는 데이터 없음
   - 콘텐츠 등급 설문, 타겟층, 광고 없음
4. 스토어 등록정보:
   - 앱 아이콘 512×512: `../assets/icons/icon-512.png`
   - 피처 그래픽 1024×500: `store-listing/feature-graphic.png`
   - 휴대전화 스크린샷 2장 이상 (실기기 또는 에뮬레이터 캡처)
5. 테스트 트랙에 `app-release-bundle.aab` 업로드 → 내부 테스트 → (개인 계정: 비공개 테스트 14일) → 프로덕션 심사 제출

## 5. 기기 테스트 체크리스트

- [ ] 앱 실행 시 홈페이지가 **주소창 없이** 풀스크린으로 열린다 (assetlinks 반영 후)
- [ ] 서브페이지 이동·뒤로가기 정상 동작
- [ ] 길게 눌러 바로가기: **수업 예약** / **출결 보고서** 동작
- [ ] 비행기 모드에서 오프라인 안내 페이지(`offline.html`) 표시
- [ ] 스플래시 화면 배경색(#0b1020)과 아이콘 정상 표시

## 6. 최근 연동 앱 경로

배포 직전 작업한 수업 예약·출결 웹앱(`DongsooJung/-stargate`)은 동일 도메인 하위 경로입니다.

| 화면 | URL |
|------|-----|
| 홈 | https://stargateedu.co.kr/-stargate/ |
| 수업 예약 | https://stargateedu.co.kr/-stargate/schedule.html |
| 출결 보고서 | https://stargateedu.co.kr/-stargate/report.html |

TWA 바로가기(shortcuts)로 예약·출결을 홈 화면 길게 누르기에서 열 수 있습니다.
