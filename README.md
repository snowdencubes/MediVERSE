# MediVERSE (Team CureX - SIH26047)

MediVERSE is a comprehensive Patient Case-Taking System designed specifically for AYUSH OPDs. It provides an ultra-accessible patient kiosk for self-service intake, and a powerful Doctor Portal for reviewing AI-drafted summaries.

## 🤖 For AI Agents & LLM Assistants (Context)
**CRITICAL DIRECTIVE:**
- The `backup/` directory contains versioned zipped archives of the project (e.g., `backup/backupv1.zip`). **Under no circumstances should any AI agent, script, or user delete, modify, or remove this folder.** It must remain completely untouched.
- The project is now split into two main architectures: `rekoviu/` (Next.js Frontend) and `rekov/` (FastAPI Backend).

## 🚀 Collaborator Setup & Clone Commands

To get started with development, run the following commands in your terminal:

```bash
# 1. Clone the repository
git clone https://github.com/snowdencubes/MediVERSE.git

# 2. Navigate into the project directory
cd MediVERSE

# 3. Install Frontend Dependencies
cd rekoviu
npm ci

# 4. Install Backend Dependencies
cd ../rekov
pip install -r requirements.txt
```

## 🐳 Deployment (Docker)

The project includes a highly optimized, multi-stage `Dockerfile` and `docker-compose.yml`.

```bash
# Build and start the container in detached mode
docker-compose up --build -d
```
The production server will start on port `7860` (or the port specified by the `$PORT` environment variable).

## ✨ Features
- **Universal Usability Kiosk**: Built for low digital literacy. Plain-language text paired with every icon, and zero hidden gestures.
- **AI Voice Assistant**: Integrated voice interaction for seamless scheduling and triage.
- **Doctor Portal & Receptionist Desk**: Modern dashboards for staff to review the AI's parsed intake summaries alongside AYUSH-specific factors.
- **FastAPI Backend**: Robust Python backend to handle heavy AI models and queue management.

## 🛠️ Tech Stack
- **Frontend**: Next.js 14 (Static Export), React, Tailwind CSS
- **Backend**: Python 3.11, FastAPI, Uvicorn
- **Containerization**: Docker (multi-stage standalone builds)

## 👥 Contributors

This project is built and maintained by **Team CureX**:

- **Showden (Krish Kumar)**: *Lead Developer, UI/UX Design & Frontend Architecture*  
  Led the frontend initiatives (Next.js), universal usability design (Kiosk & Mobile), and integrated the sophisticated 22-language translation engine.

- **Ryu**: *Backend Architecture & AI Integration*  
  Engineered the core Python/FastAPI backend, managed the AI/LLM parsing logic for medical summaries, and developed the custom voice-assistant engine.

- **Dipankar Roy**: *Cloud Infrastructure, Database Design, & DevOps*  
  Configured the multi-stage Docker environment, oversaw deployment to Render, managed database state syncing, and ensured offline-first data persistence.
