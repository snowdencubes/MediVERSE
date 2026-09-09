# MediVERSE (Team CureX - SIH26047)

MediVERSE is a comprehensive Patient Case-Taking System designed specifically for AYUSH OPDs. It provides an ultra-accessible, multilingual patient kiosk for self-service intake, and a powerful Doctor Portal for reviewing AI-drafted summaries.

## Features
- **Universal Usability Kiosk**: Built for low digital literacy. One decision per screen, massive 56px touch targets, plain-language text paired with every icon, and zero hidden gestures.
- **Multilingual Cold-Start**: Immediately prompts for language selection upon boot to ensure the patient is comfortable before proceeding.
- **ABHA Integration (Pending)**: Scan or enter ABHA details for rapid registration.
- **Doctor Portal**: Glassmorphic, modern dashboard for doctors to review the AI's parsed intake summaries alongside AYUSH-specific factors (Prakriti, Agni, etc.).
- **Red-Led Design System**: A sophisticated, oxblood-red and gold palette optimized for clarity without feeling like a generic hospital app.

## Tech Stack
- **Frontend**: Next.js 14 (App Router), React, Tailwind CSS
- **Animations**: Framer Motion, `tailwindcss-animate`
- **Containerization**: Docker (multi-stage standalone builds)
- **Tooling**: Pino (Logging)

## Quick Start (Local Development)

Ensure you are using **Node.js v20+**.

```bash
# 1. Install dependencies
npm install

# 2. Run the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the Kiosk. (Root redirects to `/patient` automatically).
To view the Doctor Portal, navigate to [http://localhost:3000/doctor/login](http://localhost:3000/doctor/login).

## Deployment (Docker)

The project includes a highly optimized, multi-stage `Dockerfile` and `docker-compose.yml`.

```bash
# Build and start the container in detached mode
docker-compose up --build -d
```
The production server will start on port `3000`.

## Next Steps for Contributors
Please read `AI_HANDOFF.md` before writing code to understand the strict design system variables, UI components folder structure, and our accessibility mandate. 

- Backend integration (Supabase)
- Real ABHA sandbox connection
- AI Summarization logic
