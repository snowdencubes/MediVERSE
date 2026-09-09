# AI Context & Progress Tracking

**Project Name:** MediVERSE (MediVERSE)
**Current Phase:** Phase 0 Completed (Frontend UI Shell)
**Tech Stack:** Next.js 14 (App Router), React, TypeScript, Tailwind CSS, Lucide-React, Framer Motion

## What Has Been Built
1. **Repository Setup**: Initialized Next.js.
2. **Design System**: Implemented "Clinical Warmth" tokens (`--paper`, `--ink`, `--primary` (sage), `--gold`, `--alert`) in `tailwind.config.ts` and `globals.css`. Removed shadcn-specific standard colors and replaced with direct custom mappings.
3. **Typography**: Configured `Fraunces` (serif) for headings and `Inter` (sans-serif) for body text using `next/font`.
4. **Mock Data**: Created `src/lib/mock-data.ts` to power the app with realistic AYUSH conditions without a backend.
5. **Patient Flow (`/patient/*`)**:
   - Built a touch-friendly, highly responsive intake flow.
   - Screen progression: Language Select -> Identify/Scan -> Consent -> Question Flow (multi-step with `framer-motion`) -> Document Upload (mock OCR) -> Review -> Submitted.
6. **Doctor Flow (`/doctor/*`)**:
   - Sidebar layout (`layout.tsx`).
   - Queue dashboard (`page.tsx`) mapping red flags and waiting patients.
   - Patient Summary detail (`patient/[id]/page.tsx`) presenting AI-drafted notes and parsed documents.
7. **Linting/Build**: Fixed all ESLint and Vercel build issues (removed unused variables, fixed unescaped entities, removed non-existent `@apply border-border`).

## Important Notes for Next AI
- The original PRD is `MediVERSE-PRD-1.md` located in this `_docs` folder.
- **Phase 1** is next: Wiring up Supabase (Auth + Schema) and replacing the `mock-data.ts` with real data flow.
- Follow the "Clinical Warmth" rules strictly (no all-caps eyebrow headers, no generic tailwind blue/teal, do not use `shadcn` defaults without restyling).
- Use `lucide-react` for all icons.
- Ensure all screens remain fully responsive (no horizontal scroll) and accessible.
- **Do not** expose any environment variables or tokens in the codebase.

*(This folder `_docs` contains reference images and documents and can be safely ignored in production deployments or deleted if no longer needed.)*
