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
├── index.html          # 홈페이지
├── schedule.html       # 수업 주간 시간표 · 예약 (8월~)
├── STARGATE HOMEPAGE.html
└── README.md
```

---

## 수업 시간표 · 예약 (`schedule.html`)

주간 그리드 시간표로 수업을 예약할 수 있습니다.

| 축 | 구성 |
|----|------|
| 가로 | 일요일 → 토요일 |
| 세로 | 09:00 → 22:00 (1시간 단위) |
| 시작일 | **2026년 8월 1일**부터 예약 가능 |

### 동작 방식

1. 빈 슬롯 클릭 → 학생/연락처/과목 입력
2. 예약 확정 시
   - 브라우저(localStorage)에 저장
   - **Google Calendar** 일정 추가 창 오픈 (`ceo@stargateedu.co.kr` 초대)
   - 예약 내용 **메일 초안** (`mailto:ceo@stargateedu.co.kr`) 오픈
3. 페이지 하단에서 Google Calendar 주간 뷰 임베드 확인

### Google Calendar API 연동 (선택)

busy 슬롯을 자동으로 막으려면 [Google Cloud Console](https://console.cloud.google.com/)에서 Calendar API를 활성화하고 API Key를 발급하세요.

1. Google Cloud → **Google Calendar API** 사용 설정
2. API Key 생성 (HTTP referrer 제한 권장: `stargateedu.co.kr/*`)
3. Google Calendar에서 `ceo@stargateedu.co.kr` 캘린더를 **공개**하거나, API Key로 읽을 수 있게 공유
4. `schedule.html` 페이지의 **API Key / Calendar ID** 입력란에 저장 후 **캘린더 동기화**

> Calendar ID 기본값: `ceo@stargateedu.co.kr`  
> 임베드 URL: `https://calendar.google.com/calendar/embed?src=ceo%40stargateedu.co.kr&ctz=Asia%2FSeoul&mode=WEEK`

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
