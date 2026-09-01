# AGENTS.md

## Cursor Cloud specific instructions

This repo is a **static-first web project** (Stargate Corporation homepage + several small tools). There is **no build/compile step and no `npm run dev` script** — the `README.md`'s "Getting Started" section (React/Vite/Firebase/Cloudflare, `npm run dev`, `npm run build`, `.env.example`) is aspirational and does **not** match the actual code. Trust the code, not that section of the README.

### What's here (services)
- **Static site (main product):** hand-written HTML + vanilla JS at the repo root (`index.html`, `schedule.html`, `report.html`, `dday.html`) plus the K-Startup dashboard under `kstartup/`. No bundler. Serve the repo root statically.
- **`api/kstartup.js`:** a Vercel serverless function (K-Startup → Supabase proxy). Deployed to Vercel in prod; running it locally (`npx vercel dev`) is **optional** because the client auto-falls back to hosted proxies. Running `vercel dev` requires a Vercel login/token.
- **Supabase (hosted):** the frontends embed a hosted Supabase URL + anon key, so booking/attendance/D-Day/K-Startup data reads & writes hit the cloud project directly. No local database is needed — just outbound internet access. If Supabase tables are absent the frontends fall back to Supabase Storage JSON.
- **`portal-sync/`:** a distribution bundle meant to be copied into a separate repo, not a runtime service.

### How to run locally
- Serve the repo root on **port 3000** (the `api/kstartup.js` CORS allow-list expects `localhost:3000`):
  - `python3 -m http.server 3000` (then open `http://localhost:3000/schedule.html`, `/index.html`, `/kstartup/`, etc.)
- Any static server works for the pure-static pages, but use port 3000 so the K-Startup proxy path behaves.
- The booking/D-Day/report/K-Startup features require **outbound internet** to reach the hosted Supabase project and government/Vercel APIs. If those flows fail, first check network egress.

### Lint / test / build
- **Lint:** none configured.
- **Test:** `npm run test:kstartup` (a `node:assert` unit test of the K-Startup parser; no server needed).
- **Build:** none (static files served as-is).
- **Deploy (not for local dev):** `npm run deploy:kstartup-api` needs `VERCEL_TOKEN`; GitHub Actions handle Supabase schema apply + Vercel deploy on push to `main`.

### Notes / gotchas
- Node >= 18 (CI uses Node 22). `npm install` only pulls the `vercel` devDependency; the site itself needs no dependencies.
- `package-lock.json` is gitignored, so `npm install` (not `npm ci`) is the correct install command.
- Optional env vars (`DATA_GO_KR_API_KEY`, `SUPABASE_ACCESS_TOKEN`/`DATABASE_URL`, `VERCEL_TOKEN`) are only needed for fetching fresh K-Startup data, applying DB schemas, or deploying — not for local viewing/testing.
