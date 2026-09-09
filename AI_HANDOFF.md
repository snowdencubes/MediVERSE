# AI Handoff & Project Context (MediVERSE)

Hello! If you are an AI assistant or a new developer taking over this project, this document provides the exact context, rules, and current state of the **MediVERSE** (MediKiosk) project. Read this carefully before generating new code.

## 1. Project Overview
MediVERSE (Team CureX, SIH26047) is a Patient Case-Taking System designed for AYUSH OPDs. It consists of two main parts:
1. **Patient Kiosk (`/patient`)**: A highly accessible, universal-usability self-service kiosk for patients to enter their symptoms, ABHA ID, and lifestyle details.
2. **Doctor Portal (`/doctor`)**: A dashboard for doctors to review AI-generated drafts of patient summaries and manage their queue.

## 2. Tech Stack
- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS + `tailwindcss-animate`
- **Animations**: Framer Motion
- **Icons**: `lucide-react`
- **Infra**: Docker (multi-stage standalone Next.js build)
- **Planned Backend**: Supabase (Auth/DB), LLM provider (for medical summaries)

## 3. Strict Design System (Red-Led Palette)
DO NOT use arbitrary Tailwind colors (e.g., `text-blue-500`, `bg-red-500`). Use the defined CSS variables in `globals.css`:
- `--paper`: `#FBF3F1` (Backgrounds)
- `--surface`: `#FCF7F6` (Cards/Panels)
- `--ink`: `#2B1416` (Text)
- `--primary`: `#8C2F39` (Oxblood red — Brand color, buttons)
- `--primary-dk`: `#6B222C` (Hover states)
- `--gold`: `#C9852E` (Secondary accent)
- `--teal-accent`: `#2F6E58` (Tertiary accent)
- `--alert`: `#E8871E` (Amber — **STRICTLY for emergencies/red-flags only**)

**Glassmorphism Rules**:
Frosted glass (`bg-white/50 backdrop-blur-xl border border-white/60`) is used on Welcome/Consent screens and the Doctor sidebar/stat cards over a soft gradient background.
**DO NOT** use glassmorphism on patient question flows (Intake, Identify) — they must remain on solid `--surface` for maximum legibility.

## 4. Universal Usability Mandate (CRITICAL)
The kiosk is designed for users with zero digital literacy. You must enforce these rules:
1. **One Decision Per Screen**: Never ask for two disparate things at once.
2. **56px Minimum Touch Targets**: Every button, input, or trigger must have `min-h-[56px]` or equivalent.
3. **Icons MUST have Text**: Never use icon-only buttons. Always pair an icon with a plain-language label (e.g., `☰ Menu`, `+ Add Document`).
4. **Plain Language**: Explain everything as if to a 10-year-old. No medical jargon without explanation.
5. **Cold Start**: The language selection screen must always be the very first thing a patient sees. (Currently handled via a redirect from `/` to `/patient`).

## 5. File Structure Organization
Keep the repository clean:
- `src/app/patient/...` -> Patient kiosk routes
- `src/app/doctor/...` -> Doctor portal routes
- `src/components/patient/...` -> Kiosk-specific components (BurgerMenu, FAB)
- `src/components/ui/...` -> Generic/shared UI components
- `src/lib/...` -> Utilities, mock data, i18n
- `Dockerfile`, `docker-compose.yml` -> DevOps at root

## 6. Current Status & Next Steps
**Status**: The frontend UI shell is **100% complete**, heavily refined for accessibility, and styled to the final brand guidelines. It currently uses mock data (`src/lib/mock-data.ts`) and client-side state.

**Next Developer/AI Tasks**:
1. **Database & Auth Integration**: Replace `mock-data.ts` with Supabase/PostgreSQL hooks.
2. **ABHA Integration**: Implement the real ABHA scanning/OTP flow on `/patient/identify`.
3. **AI Summarization**: Connect the final intake payload from the patient flow to an LLM to generate the draft visible in `/doctor/patient/[id]`.
4. **i18n Translation**: Implement actual English/Hindi swapping based on the language selection at `/patient`.

Good luck! Maintain the accessibility standards, keep the codebase clean, and respect the Red-Led palette.
