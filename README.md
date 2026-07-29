<p align="center">
  <img src="assets/stargate-logo.png" alt="Stargate Corporation Logo" width="200"/>
</p>

<h1 align="center">🌌 Stargate Corporation (주식회사 별의문)</h1>

<p align="center">
  <strong>AI-Powered Solutions for a Smarter Future</strong>
</p>

<p align="center">
  <a href="https://www.stargate11.com">Website</a> •
  <a href="#about">About</a> •
  <a href="#services">Services</a> •
  <a href="#tech-stack">Tech Stack</a> •
  <a href="#getting-started">Getting Started</a> •
  <a href="#contact">Contact</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Founded-2025.08.15-blue?style=flat-square" alt="Founded"/>
  <img src="https://img.shields.io/badge/Location-Seoul,%20Korea-green?style=flat-square" alt="Location"/>
  <img src="https://img.shields.io/badge/Domain-AI%20Software-purple?style=flat-square" alt="Domain"/>
  <img src="https://img.shields.io/badge/License-MIT-yellow?style=flat-square" alt="License"/>
</p>

---

## About

**Stargate Corporation** is an AI software development startup based in Daechi-dong, Seoul, South Korea. Founded on Liberation Day (August 15, 2025), we bridge the gap between cutting-edge AI research and real-world business applications.

Our core mission is to deliver intelligent, scalable solutions across AI software development, educational content creation, e-publishing, and global e-commerce.

---

## Services

| Domain | Description |
|--------|-------------|
| 🤖 AI Software Development | Custom AI solutions, automation pipelines, and intelligent business tools |
| 📚 Educational Content | Math & Informatics Olympiad (KOI) prep programs, AI-powered learning |
| 📖 E-Publishing | Digital content creation and distribution across multiple platforms |
| 🛒 Global E-Commerce | Multi-channel commerce solutions (Naver Smart Store, Coupang, etc.) |
| 🏙️ Urban Data Science | Spatial econometrics, hedonic pricing models, GIS-based urban analysis |

---

## Tech Stack

```
Frontend:    HTML5 / CSS3 / JavaScript / React
Backend:     Python / Node.js / Firebase Functions
Infra:       Cloudflare Pages / Firebase / GitHub Actions CI/CD
AI/ML:       Python / TensorFlow / LLM Integration
Data:        GIS / Spatial Econometrics / Big Data Analytics
Automation:  n8n / Google Apps Script / Custom Pipelines
```

---

## Project Structure

```
stargate-homepage/
├── index.html                              # 홈페이지 (예약 · 출결 CTA)
├── schedule.html                           # 수업 주간 시간표 · Supabase 예약
├── report.html                             # 출결 현황 · 당일 수업 보고서
├── supabase/class_bookings.sql             # 예약 테이블 스키마
├── supabase/class_attendance.sql           # 출결 · 일일 보고서 스키마
├── scripts/apply-class-bookings-schema.mjs # 스키마 적용 스크립트
├── .github/workflows/apply-class-bookings-schema.yml
├── play-store/                             # Google Play TWA 배포 준비
├── PLAY_STORE.md                           # Play 배포 현황 요약
├── STARGATE HOMEPAGE.html
└── README.md
```

## Google Play 배포

수업 예약·출결 웹앱을 포함한 **Stargate TWA** 앱(`kr.co.stargateedu.app`) 배포 준비 파일은 `play-store/` · `PLAY_STORE.md`를 참고하세요.
AAB/APK·업로드 키는 비공개 아티팩트로 보관합니다(저장소에 커밋하지 않음).

---

## 수업 시간표 · 예약 (`schedule.html`)

주간 그리드 시간표로 수업을 예약하고 **Supabase**에 저장합니다. (Google Calendar 연동 없음)

| 축 | 구성 |
|----|------|
| 가로 | 일요일 → 토요일 |
| 세로 | 09:00 → 22:00 (1시간 단위) |
| 시작일 | **2026년 8월 1일**부터 예약 가능 |
| 저장소 | Supabase `class_bookings` |

### 동작 방식

1. 빈 슬롯 클릭 → 학생/연락처/과목 입력
2. 예약 확정 시 Supabase에 저장 (DB 또는 Storage)
3. 같은 슬롯 중복 예약은 409 충돌로 차단 후 시간표 갱신
4. 취소 시 `status = cancelled` (취소 슬롯 재예약 가능)
5. 시간대는 **Asia/Seoul** 고정 · 모바일은 요일 탭(일간) 뷰

### Supabase 저장 방식

1. **DB 모드 (권장)**: `class_bookings` 테이블이 있으면 여기로 저장
2. **Storage 모드 (즉시 사용)**: 테이블이 없으면 `public-data-csv/class-bookings/{slot_key}.json`에 슬롯 단위 저장

### DB 스키마 적용 (선택, 최초 1회)

프로젝트: `https://inftexpcnfinglwlrvsj.supabase.co`

1. [Supabase SQL Editor](https://supabase.com/dashboard/project/inftexpcnfinglwlrvsj/sql/new) 열기
2. `supabase/class_bookings.sql` 내용 실행
3. 또는:

```bash
SUPABASE_ACCESS_TOKEN=... node scripts/apply-class-bookings-schema.mjs
# 또는
DATABASE_URL=postgres://... node scripts/apply-class-bookings-schema.mjs
```

### 최근 보완 (UX)
- 예약 취소 시 **연락처 본인 확인**
- 이름/연락처/이메일/과목 **기기 기억**
- 과목 필터 · 주간 **CSV** 내보내기 · 예약 **.ics** 저장
- 상세에서 **출결 보고서**(`report.html?date=`)·메일 알림 연동
- 45초 자동 새로고침(탭 활성 시, 로딩 깜빡임 없음)
- `?week=` / `?slot=` URL로 특정 주·슬롯 바로가기

---

## 출결 · 당일 수업 보고서 (`report.html`)

당일 예약 수업을 기준으로 **출결 현황**을 기록하고, **일일 수업 정리 보고서**를 작성·저장·인쇄합니다.

| 항목 | 내용 |
|------|------|
| 출결 | 출석 / 지각 / 결석 / 공결 / 미처리 |
| 수업 메모 | 진도, 숙제, 개별 피드백 |
| 보고서 | 총평 · 하이라이트 · 이슈 · 다음 계획 |
| KPI | 출석·지각·결석·공결·미처리·출석률 |
| 저장 | Supabase DB 또는 Storage |

### 저장 경로 (Storage 모드)

- 출결: `public-data-csv/class-attendance/{slot_key}.json`
- 보고서: `public-data-csv/class-reports/{yyyy-mm-dd}.json`

### DB 스키마 (선택)

`supabase/class_attendance.sql` 을 SQL Editor에서 실행하면
`class_attendance`, `class_daily_reports` 테이블을 사용합니다.

---

## Getting Started

### Prerequisites

- Node.js >= 18.x
- npm or pnpm
- Firebase CLI
- Wrangler CLI (Cloudflare)

### Installation

```bash
# Clone the repository
git clone https://github.com/stargate-corp/stargate-homepage.git
cd stargate-homepage

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local

# Start development server
npm run dev
```

### Deployment

```bash
# Build for production
npm run build

# Deploy to Cloudflare Pages
npm run deploy:production

# Or simply push to main for auto-deployment via GitHub Actions
git push origin main
```

### Environment Variables

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_API_URL=https://stargate-corp.pages.dev/api
```

---

## CI/CD Pipeline

Every push to `main` triggers the automated deployment pipeline:

```
Push → Lint & Test → Build → Deploy to Cloudflare Pages → Verify
```

---

## Founder

**동수** — CEO & Founder

- 🎓 SNU (Seoul National University) Engineering — youngest admitted at age 17
- 📐 PhD Candidate, Smart City Engineering @ SNU
- 🪖 Former ROKAF Facilities Officer — managed ₩80.3B+ infrastructure projects
- 🏆 National Informatics Olympiad award recipient
- 📊 Research: Corporate credit big data survival analysis & spatial econometrics

---

## License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

## Contact

- 🌐 Website: [www.stargate11.com](https://www.stargate11.com)
- 📧 Email: contact@stargate11.com
- 📍 Location: Daechi-dong, Gangnam-gu, Seoul, South Korea

---

<p align="center">
  <sub>© 2025-2026 Stargate Corporation (주식회사 별의문). All rights reserved.</sub>
</p>
