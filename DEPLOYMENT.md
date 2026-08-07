# RC Pulse - Deployment & Architecture Guide

RC Pulse is structured into modular frontend and backend folders for easy multi-platform deployment and GitHub CI/CD automation.

---

## Directory Structure

```text
rc-pulse/
├── backend/
│   ├── worker.ts         # Cloudflare Worker API entry point (Serverless API)
│   ├── server.ts         # Express Node.js Backend Server (Docker / Cloud Run)
│   └── wrangler.toml     # Cloudflare Worker deployment configuration
├── functions/
│   └── api/[[path]].ts   # Cloudflare Pages Functions routing
├── src/
│   ├── renderer/         # React Frontend UI (Dashboard, Auth, Analytics)
│   ├── main/             # Shared Services (RingCentral REST API, Analytics)
│   └── types/            # Shared TypeScript Interfaces & Types
├── .github/
│   └── workflows/
│       └── deploy.yml    # GitHub Actions Workflow for automated Cloudflare deployment
├── DEPLOYMENT.md
├── Dockerfile            # Multi-stage Dockerfile for Cloud Run / Container deployment
├── package.json
└── wrangler.toml         # Cloudflare Pages configuration
```

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
