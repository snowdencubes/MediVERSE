# AyuLipi (AyuLipi)

AyuLipi is a patient case-taking web application designed for AYUSH OPDs. It allows patients to self-report their history, chief complaints, and upload past medical records prior to entering the consultation room. The system drafts a standardized clinical summary (including AYUSH specific history like Prakriti and Agni) for the doctor to review, edit, and confirm.

## Tech Stack
- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS (Custom "Clinical Warmth" design system)
- **Icons:** Lucide React
- **Animations:** Framer Motion

## Current Status: Phase 0 (Frontend MVP)
The frontend UI shell has been fully scaffolded with responsive designs for both kiosk (tablet) and doctor dashboard (desktop) usage. 
Currently, the application runs entirely on mock data located in `src/lib/mock-data.ts`. No backend services (Supabase/Auth) have been wired up yet.

## Quick Start for Developers

### Prerequisites
- Node.js (v20+ recommended)
- npm or pnpm

### Installation

1. **Clone the repository** (or your team's fork):
   ```bash
   git clone https://github.com/snowdencubes/AyuLipi.git
   cd AyuLipi
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the development server**:
   ```bash
   npm run dev
   ```

4. **Open in browser**:
   Navigate to [http://localhost:3000](http://localhost:3000) to view the application.

## Directory Structure
- `src/app/patient/*` - The patient-facing kiosk flows (Welcome, Consent, Intake, Upload, etc.)
- `src/app/doctor/*` - The physician-facing portal (Dashboard, Patient Summaries)
- `src/lib/mock-data.ts` - Local state for the UI shell.
- `_docs/` - Contains the original PRD, reference UI images, and an `AI_CONTEXT.md` file detailing the build history for AI assistants. *(Note: This folder is meant for development reference and context.)*

## Notes on Design System
This project adheres to a specific "Clinical Warmth" aesthetic defined in `tailwind.config.ts`.
- **Primary:** Sage Green (`var(--primary)`)
- **Background:** Off-white paper (`var(--paper)`)
- **Text:** Deep Navy-Green (`var(--ink)`)
- Please avoid generic UI tells (e.g., all-caps eyebrow labels, default blue colors, heavy box shadows).
- Ensure all new components remain touch-friendly with minimum 56px tap targets.

## Next Steps (Phase 1)
- Connect Supabase for PostgreSQL database and Authentication.
- Transition `mock-data.ts` usage to real API routes and server actions.
