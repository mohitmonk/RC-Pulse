# RC Pulse - Deployment & Architecture Guide

RC Pulse is structured into modular frontend and backend folders for easy multi-platform deployment and GitHub CI/CD automation.

---

## Directory Structure

```text
rc-pulse/
├── frontend/             # Frontend React UI Source Code
│   ├── index.html        # Standalone Frontend Entry Point
│   └── src/
│       ├── App.tsx       # Main Application Component
│       ├── components/   # UI Components (KPI Cards, Charts, Call Tables)
│       ├── hooks/        # React Query Custom Hooks (useAuth, useCalls, useDashboard)
│       ├── layouts/      # Dashboard Layouts
│       ├── pages/        # Application Pages (Login, Dashboard, Settings)
│       ├── store/        # Zustand State Stores (authStore, dashboardStore)
│       └── styles/       # Tailwind CSS Configuration
├── backend/              # Backend Services & Worker APIs
│   ├── worker.ts         # Cloudflare Worker API (Serverless API)
│   ├── server.ts         # Express Node.js Backend Server
│   └── wrangler.toml     # Cloudflare Worker deployment configuration
├── functions/            # Cloudflare Pages Functions
│   └── api/[[path]].ts   # Functions Proxy Route
├── src/                  # Core Shared Utilities & Legacy Bridge
│   ├── main/             # RingCentral REST API Services & Analytics Engines
│   └── types/            # Shared TypeScript Interfaces (Call, User, Settings)
├── .github/
│   └── workflows/
│       └── deploy.yml    # GitHub Actions Workflow for automated Cloudflare deployment
├── DEPLOYMENT.md         # Deployment Guide
├── Dockerfile            # Multi-stage Dockerfile
├── package.json          # Project Dependencies & Scripts
└── wrangler.toml         # Cloudflare Pages Configuration
```

---

## Connecting Cloudflare Pages to Cloudflare Worker

Cloudflare Pages connects to the `rc-pulse-backend` Worker seamlessly using **Service Bindings**.

### Automatic Connection (Configured in `wrangler.toml`)
The root `wrangler.toml` includes a Service Binding configuration:

```toml
[[services]]
binding = "BACKEND"
service = "rc-pulse-backend"
```

When deployed via `wrangler pages deploy` or GitHub Actions, Cloudflare Pages will automatically bind the Worker to `env.BACKEND`. All requests to `/api/*` and `/oauth/*` are forwarded directly to `rc-pulse-backend` without extra network latency or CORS issues.

### Manual Connection via Cloudflare Dashboard (Optional)
If deploying via the Cloudflare Dashboard interface:
1. Go to **Cloudflare Dashboard > Workers & Pages > Pages > rc-pulse**.
2. Select **Settings > Functions**.
3. Scroll to **Service Bindings** and click **Add binding**:
   - **Variable name**: `BACKEND`
   - **Service**: `rc-pulse-backend`
   - **Environment**: `Production`
4. Alternatively, under **Environment Variables**, you can add `BACKEND_URL` pointing to `https://rc-pulse-backend.<your-subdomain>.workers.dev`.

---

## Option 1: Automatic Deployment via GitHub to Cloudflare

The repository includes a ready-to-use GitHub Actions workflow (`.github/workflows/deploy.yml`).

### Setup Instructions for GitHub + Cloudflare:

1. Push this repository to your GitHub account:
   ```bash
   git init
   git add .
   git commit -m "Initial commit of RC Pulse"
   git remote add origin https://github.com/YOUR_USERNAME/rc-pulse.git
   git push -u origin main
   ```

2. Retrieve your Cloudflare credentials:
   - **Cloudflare API Token**: Go to **Cloudflare Dashboard > My Profile > API Tokens > Create Token > Edit Cloudflare Workers**.
   - **Cloudflare Account ID**: Found on the right sidebar of any domain in your Cloudflare dashboard.

3. Add GitHub Repository Secrets:
   - Go to your GitHub repository **Settings > Secrets and variables > Actions**.
   - Add Secret: `CLOUDFLARE_API_TOKEN` = *(Your Cloudflare API Token)*
   - Add Secret: `CLOUDFLARE_ACCOUNT_ID` = *(Your Cloudflare Account ID)*

4. Push any commit to `main` — GitHub Actions will automatically deploy:
   - **Frontend** to Cloudflare Pages (`rc-pulse`)
   - **Backend Worker** to Cloudflare Workers (`rc-pulse-backend`)

---

## Option 2: Direct CLI Deployment to Cloudflare

### Deploy Backend Worker:
```bash
cd backend
npx wrangler deploy worker.ts --name rc-pulse-backend
```

### Deploy Frontend Pages:
```bash
npm run build
npx wrangler pages deploy dist --project-name=rc-pulse
```

---

## Option 3: Docker / Google Cloud Run / Firebase Deployment

### Run Container Locally:
```bash
docker build -t rc-pulse .
docker run -p 3000:3000 rc-pulse
```

### Deploy to Google Cloud Run:
```bash
gcloud run deploy rc-pulse --source . --port 3000 --allow-unauthenticated --region us-central1
```
