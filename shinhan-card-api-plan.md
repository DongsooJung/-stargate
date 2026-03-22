# 신한카드 API 무료 데이터 수집 프로그램 계획서

## 1. 개요

신한카드 관련 API를 활용하여 카드 승인내역, 소비 트렌드, 상권 분석 등의 데이터를 수집하는 프로그램을 개발합니다.

---

## 2. 활용 가능한 API 소스

### 2-1. 신한 Open API (공식)
- **URL**: https://openapi.shinhan.com
- **특징**: 신한금융그룹 통합 Open API 포털
- **가입 절차**: 제휴 문의 → 심사 → 회원가입 → 승인 → 서비스 연동
- **비용**: 기본 무료 (제휴 계약 필요)

### 2-2. 신한카드 DataBada (데이터바다)
- **URL**: https://databada.shinhancard.com
- **제공 서비스**:
  - 시장 트렌드 / 소비 패턴 분석 데이터
  - 상권 분석 솔루션
  - 신용 모형 데이터
  - 광고 서비스 (3,200만 고객, 월 3.5억건 소비 데이터 기반)
- **API 방식**: REST API로 시스템 간 연동 가능
- **비용**: 일부 무료 / 유료 상품 혼합 (가입 후 확인)

### 2-3. 서드파티 대안 (무료/프리미엄)

| 서비스 | URL | 특징 |
|--------|-----|------|
| **CODEF** | https://developer.codef.io | 신한카드 포함 전 카드사 승인내역 조회 통합 API |
| **쿠콘 (Coocon)** | https://coocon.net | 금융 데이터 연동 전문 |
| **바로빌** | https://dev.barobill.co.kr | 카드 사용내역 연동 API |
| **금융결제원 오픈뱅킹** | https://developers.kftc.or.kr | 거래내역 조회 API (핀테크 이용번호 + Access Token) |
| **마이데이터 표준 API** | https://developers.mydatakorea.org | 국내/해외 승인내역, 결제정보, 리볼빙 조회 등 |

---

## 3. 프로그램 아키텍처

```
shinhan-card-api/
├── src/
│   ├── config/
│   │   └── settings.py          # API 키, 엔드포인트 설정
│   ├── clients/
│   │   ├── shinhan_openapi.py   # 신한 Open API 클라이언트
│   │   ├── databada.py          # DataBada API 클라이언트
│   │   └── codef.py             # CODEF API 클라이언트 (대안)
│   ├── models/
│   │   ├── transaction.py       # 거래 내역 모델
│   │   └── trend.py             # 소비 트렌드 모델
│   ├── services/
│   │   ├── auth.py              # OAuth2 / Token 인증 관리
│   │   ├── card_history.py      # 카드 승인내역 조회
│   │   ├── trend_analysis.py    # 소비 트렌드 분석
│   │   └── scheduler.py        # 주기적 데이터 수집 스케줄러
│   ├── storage/
│   │   ├── database.py          # SQLite/PostgreSQL 저장
│   │   └── exporter.py          # CSV/JSON 내보내기
│   └── main.py                  # 메인 실행 파일
├── tests/
├── requirements.txt
├── .env.example
└── README.md
```

---

## 4. 기술 스택

| 구분 | 기술 |
|------|------|
| 언어 | Python 3.11+ |
| HTTP 클라이언트 | `httpx` (비동기 지원) |
| 인증 | OAuth2 / API Key |
| 데이터 저장 | SQLite (개발) / PostgreSQL (운영) |
| 스케줄링 | `APScheduler` |
| 데이터 분석 | `pandas` |
| 환경 변수 | `python-dotenv` |
| 테스트 | `pytest` |

---

## 5. 핵심 기능

### Phase 1: 기본 구조 (1주)
- [ ] 프로젝트 초기 설정 (Python 패키지, 의존성)
- [ ] API 인증 모듈 구현 (OAuth2 토큰 발급/갱신)
- [ ] 기본 HTTP 클라이언트 구현 (재시도, 에러 핸들링)
- [ ] 설정 관리 (.env 기반)

### Phase 2: 데이터 수집 (1~2주)
- [ ] 카드 승인내역 조회 API 연동
- [ ] 소비 트렌드 데이터 조회
- [ ] 상권 분석 데이터 조회
- [ ] 데이터 모델 정의 및 DB 저장

### Phase 3: 자동화 및 분석 (1주)
- [ ] 주기적 데이터 수집 스케줄러
- [ ] 데이터 내보내기 (CSV, JSON, Excel)
- [ ] 기본 소비 패턴 분석 리포트 생성

### Phase 4: 고도화 (선택)
- [ ] 대시보드 웹 UI (Streamlit 또는 React)
- [ ] 알림 기능 (이메일/슬랙)
- [ ] 여러 카드사 통합 지원

---

## 6. API 연동 흐름

```
1. 회원가입 / API Key 발급
   └─ 신한 Open API 또는 CODEF에 가입

2. 인증 토큰 발급
   └─ POST /oauth/token (client_id, client_secret)
   └─ Access Token 수신 (유효기간 관리)

3. 데이터 조회
   └─ GET /cards/transactions  (승인내역)
   └─ GET /cards/billing       (청구내역)
   └─ GET /trends/consumption  (소비트렌드)

4. 데이터 저장
   └─ SQLite/PostgreSQL에 저장
   └─ 중복 체크 후 INSERT/UPDATE

5. 분석 및 내보내기
   └─ pandas로 집계/분석
   └─ CSV/JSON 파일 출력
```

---

## 7. 보안 고려사항

- API 키, 시크릿은 `.env` 파일로 관리 (git에 커밋 금지)
- Access Token은 메모리 또는 암호화 저장
- 개인 금융정보 수집 시 개인정보보호법 준수
- HTTPS 통신만 사용
- Rate Limiting 준수 (API 호출 제한)

---

## 8. 무료 이용 전략

1. **CODEF 무료 플랜 활용**: 개인 개발자용 무료 호출 한도 제공
2. **신한 Open API 샌드박스**: 테스트 환경에서 무료로 API 테스트 가능
3. **금융결제원 오픈뱅킹**: 핀테크 사업자 등록 후 테스트 API 무료 이용
4. **마이데이터 표준 API**: 마이데이터 사업자 등록 시 표준 규격 무료 사용

---

## 9. 시작하기 (Quick Start)

```bash
# 1. 저장소 클론
git clone https://github.com/DongsooJung/-stargate.git
cd -stargate/shinhan-card-api

# 2. 가상환경 생성
python -m venv venv
source venv/bin/activate

# 3. 의존성 설치
pip install -r requirements.txt

# 4. 환경변수 설정
cp .env.example .env
# .env 파일에 API 키 입력

# 5. 실행
python src/main.py
```

---

## 10. 참고 자료

- [신한 Open API](https://openapi.shinhan.com/)
- [신한은행 Open API 마켓](https://api.shinhan.com/)
- [신한카드 DataBada](https://databada.shinhancard.com/)
- [CODEF 개발자](https://developer.codef.io/)
- [금융결제원 오픈API](https://developers.kftc.or.kr/)
- [마이데이터 API 규격](https://developers.mydatakorea.org/)
- [바로빌 카드 연동](https://dev.barobill.co.kr/)
- [신한카드 Trendis (소비트렌드)](https://www.shinhancard.com/pconts/html/benefit/trendis/MOBFM500.html)
