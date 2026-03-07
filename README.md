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
├── public/
│   ├── index.html
│   ├── assets/
│   └── favicon.ico
├── src/
│   ├── components/
│   ├── pages/
│   ├── styles/
│   └── utils/
├── functions/          # Firebase Cloud Functions
├── .github/
│   └── workflows/
│       └── deploy.yml  # CI/CD Pipeline
├── package.json
├── wrangler.toml       # Cloudflare config
└── README.md
```

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
