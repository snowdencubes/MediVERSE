# Deploying MediVERSE to Render

## Prerequisites
- A [Render](https://render.com) account (free tier works)
- This repo pushed to GitHub or GitLab

## Steps

1. **Create a New Web Service**
   - Go to [Render Dashboard](https://dashboard.render.com) → New → Web Service
   - Connect your GitHub/GitLab repository

2. **Configure the Service**
   - **Name:** `mediverse-web`
   - **Region:** Pick the closest to your users
   - **Runtime:** Docker (Render auto-detects the `Dockerfile`)
   - **Instance Type:** Free (or Starter for production)

3. **Set Environment Variables**
   - In the service settings → Environment, add every variable from `.env.example` with real values:
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     - `GROQ_API_KEY`
     - `GEMINI_API_KEY`
     - `ABDM_CLIENT_ID` / `ABDM_CLIENT_SECRET`
     - `OCR_API_KEY`
   - Render automatically sets `PORT` — **do not hardcode it**

4. **Deploy**
   - Click "Create Web Service" — Render builds the Docker image and deploys
   - Subsequent pushes to your default branch auto-deploy

5. **Verify**
   - Visit the provided `*.onrender.com` URL
   - Check the Render logs tab to see colorized pino output from each module

## Local Docker Testing

```bash
# Production build + run
docker compose up --build

# Development mode with hot reload
docker compose --profile dev up
```

## Notes
- The app listens on `process.env.PORT` (Render assigns this dynamically)
- The multi-stage Dockerfile keeps the final image small (~150MB)
- Never commit `.env.local` — use `.env.example` as a template
