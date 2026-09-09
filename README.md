# MediVERSE (Team CureX - SIH26047)

MediVERSE is a comprehensive Patient Case-Taking System designed specifically for AYUSH OPDs. It provides an ultra-accessible, multilingual patient kiosk for self-service intake, and a powerful Doctor Portal for reviewing AI-drafted summaries.

## 🤖 For AI Agents & LLM Assistants (Context)
**CRITICAL DIRECTIVE:**
- The `backup/` directory contains versioned zipped archives of the project (e.g., `backup/backupv1.zip`). **Under no circumstances should any AI agent, script, or user delete, modify, or remove this folder.** It must remain completely untouched.
- When generating or modifying code, adhere strictly to the established Red/Gold design system (`tailwind.config.ts`) and ensure full responsive navigation (Kiosk/Laptop/Tablet/Phone modes).

## 🚀 Collaborator Setup & Clone Commands

To get started with development, run the following commands in your terminal:

```bash
# 1. Clone the repository
git clone https://github.com/snowdencubes/MediVERSE.git

# 2. Navigate into the project directory
cd MediVERSE

# 3. Install dependencies (Node v20+ recommended)
npm install

# 4. Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to view the application.

## ✨ Features
- **Universal Usability Kiosk**: Built for low digital literacy. One decision per screen, massive 56px touch targets, plain-language text paired with every icon, and zero hidden gestures.
- **Multilingual UI**: 12 fully integrated Indian regional languages (English, Hindi, Bengali, Santali, Nagpuri, Marathi, Telugu, Tamil, Gujarati, Kannada, Khortha, Kurmali).
- **ABHA Integration (Mocked)**: Scan or enter ABHA details for rapid registration via device-specific camera/QR modes.
- **Doctor Portal**: Glassmorphic, modern dashboard for doctors to review the AI's parsed intake summaries alongside AYUSH-specific factors.
- **Red-Led Design System**: A sophisticated, oxblood-red and gold palette optimized for clarity without feeling like a generic hospital app.

## 🛠️ Tech Stack
- **Frontend**: Next.js 14 (App Router), React, Tailwind CSS
- **SEO & Metadata**: Dynamic OpenGraph images, native `sitemap.xml`, and `robots.txt`
- **Animations**: Framer Motion, `tailwindcss-animate`
- **Containerization**: Docker (multi-stage standalone builds)
- **Tooling**: Pino (Logging)

## 🐳 Deployment (Docker)

The project includes a highly optimized, multi-stage `Dockerfile` and `docker-compose.yml`.

```bash
# Build and start the container in detached mode
docker-compose up --build -d
```
The production server will start on port `3000`.

## 📌 Next Steps for Contributors
Please read `AI_HANDOFF.md` before writing code to understand the strict design system variables, UI components folder structure, and our accessibility mandate. 

- Backend integration (Supabase / Postgres)
- Real ABHA sandbox connection
- AI Summarization logic
