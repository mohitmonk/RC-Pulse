# RC Pulse Deployment Guide

This repository is pre-configured for full-stack deployment on **Firebase / GCP Cloud Run** and **Cloudflare Pages / Workers**.

---

## Option 1: Deploying to Firebase & GCP Cloud Run (Recommended for Full-Stack Node API)

Since RC Pulse includes a Node.js Express backend proxy for RingCentral OAuth token exchanges and API routing, deploying via **Google Cloud Run** + **Firebase Hosting** (or **Firebase App Hosting**) is the seamless method.

### Quick Deployment via Google Cloud Run (Single Command)

1. Install the Google Cloud SDK (`gcloud`) and log in:
   ```bash
   gcloud auth login
   gcloud config set project YOUR_GCP_PROJECT_ID
   ```
2. Deploy directly from the source code:
   ```bash
   gcloud run deploy rc-pulse --source . --port 3000 --allow-unauthenticated --region us-central1
   ```
3. Copy the output HTTPS URL (e.g. `https://rc-pulse-xxxxxx.a.run.app`).

### Deploying via Firebase Hosting + Cloud Run

1. Install Firebase CLI:
   ```bash
   npm install -g firebase-tools
   firebase login
   ```
2. Initialize Firebase in your project:
   ```bash
   firebase use --add YOUR_FIREBASE_PROJECT_ID
   ```
3. Build the production application:
   ```bash
   npm run build
   ```
4. Deploy to Firebase:
   ```bash
   firebase deploy
   ```

---

## Option 2: Deploying to Cloudflare Pages

### Deploying Static Frontend with Cloudflare Pages

1. Install Wrangler CLI:
   ```bash
   npm install -g wrangler
   wrangler login
   ```
2. Build the project:
   ```bash
   npm run build
   ```
3. Deploy the build output to Cloudflare Pages:
   ```bash
   npx wrangler pages deploy dist --project-name=rc-pulse
   ```

### Connecting Environment Variables in Cloudflare
In the Cloudflare Dashboard under **Pages > rc-pulse > Settings > Environment Variables**, add:
- `RINGCENTRAL_CLIENT_ID`: Your RingCentral App Key
- `RINGCENTRAL_CLIENT_SECRET`: Your RingCentral App Secret
- `RINGCENTRAL_SERVER_URL`: `https://platform.ringcentral.com`

---

## Option 3: Standard Docker Container Deployment

RC Pulse includes a production-ready multi-stage `Dockerfile`.

1. Build the Docker image:
   ```bash
   docker build -t rc-pulse .
   ```
2. Run the container:
   ```bash
   docker run -d -p 3000:3000 --name rc-pulse-app rc-pulse
   ```
3. Open `http://localhost:3000` in your browser.
