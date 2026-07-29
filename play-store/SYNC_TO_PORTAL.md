# 포털 저장소 동기화 (필수)

Digital Asset Links와 TWA 설정은 **도메인 루트**를 서빙하는
`DongsooJung/dongsoojung.github.io`에 반영되어야 합니다.

이 Cloud Agent 토큰으로는 해당 레포에 push할 수 없어, 아래 파일을 수동 반영하세요.

## 복사할 파일

| 이 폴더 | 포털 경로 |
|---------|-----------|
| `.well-known-patch/assetlinks.json` | `.well-known/assetlinks.json` |
| `twa-manifest.json` | `app/twa-manifest.json` |
| `README.md` | `app/README.md` |
| `PLAY_CONSOLE_CHECKLIST.md` | `app/PLAY_CONSOLE_CHECKLIST.md` |
| `store-listing/feature-graphic.png` | `app/store-listing/feature-graphic.png` |

```bash
# 로컬에서 예시
git clone https://github.com/DongsooJung/dongsoojung.github.io.git
cp play-store/.well-known-patch/assetlinks.json dongsoojung.github.io/.well-known/
cp play-store/twa-manifest.json dongsoojung.github.io/app/
# …나머지 동일
```

반영 후 `https://stargateedu.co.kr/.well-known/assetlinks.json` 에
업로드 키 SHA-256이 보이면 TWA 주소창 제거가 가능합니다.
