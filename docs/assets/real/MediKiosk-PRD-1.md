# MediVERSE — Product Requirements Document

**Problem Statement:** SIH26047 — Patient Case-Taking Software
**Organization:** Ministry of Ayush | **Department:** All India Institute of Ayurveda (AIIA)
**Theme:** MedTech / BioTech / HealthTech
**Team:** CureX
**Event:** Smart India Hackathon 2026 — AEC Internal Round (IIC-AEC)
**Deadline:** 30 September 2026

> Read this entire document before generating any code. It is the source of truth for scope, users, screens, and the tech stack. Where a later prompt in this conversation gives more specific instructions for one part of the build (e.g. "build only the frontend now"), follow that prompt's scope but keep everything consistent with this PRD.

---

## 1. Problem, in one paragraph

Government and AYUSH OPDs see thousands of patients a day with a doctor consultation window as short as 2–5 minutes. There's no time to take a full history, AYUSH history (Prakriti, Vikriti, Agni, Dashavidha Pariksha, etc.) is even more detailed than allopathic history, and patients arrive with scattered paper prescriptions and reports nobody has time to read. MediVERSE lets the patient do the time-consuming part — answering structured history questions and uploading old documents — **before** they enter the consultation room, so the doctor opens the visit with a ready, organized summary instead of building one from scratch.

## 2. Users

- **Patient** — walk-in OPD patient, any literacy/tech-comfort level, may be elderly, may not speak English/Hindi fluently. Uses a tablet/kiosk (touch-first) or their own phone/browser.
- **Doctor / AYUSH Physician** — reviews the generated summary right before or during consultation, edits/confirms it, never receives an unreviewable auto-diagnosis.
- **Triage nurse / staff** — receives red-flag/emergency alerts raised by the system; assists patients who need help.
- **Admin** (later phase, not MVP) — manages hospital/OPD configuration.

## 3. MVP scope — build this first

- Tablet-first responsive web app (works on desktop and phone too)
- English + Hindi UI (structured for more languages later, not required now)
- Touch-based question flow (voice is a later phase — see §8)
- Patient history flow: chief complaint → guided follow-ups → past medical/surgical history → drug & allergy history → family history → personal/lifestyle history → AYUSH module (Prakriti, Vikriti, Agni, Koshtha, Ahara-Vihara)
- Document upload (PDF/image) with basic OCR text extraction
- Automatic draft summary generation from answers + extracted document text
- Doctor review screen: edit, confirm, save
- Simple login + explicit consent screen (DPDP Act 2023-style consent language, plain and translated)
- Emergency/red-flag detection on specific answers, surfaced to staff — **the system never outputs a diagnosis or prescription**

### Explicitly do NOT build (MVP or ever, per problem statement)
- Automatic final diagnosis
- Automatic prescription generation
- Any workflow that lets the AI output replace physician judgment — every AI-generated summary is a draft the doctor must confirm

### Deferred to later phases (design for them, don't build them yet)
- Real voice input/output (Bhashini / AI4Bharat ASR+TTS)
- Handwriting OCR / multilingual document OCR at production accuracy
- Live ABHA / ABDM (FHIR) integration — MVP can mock this screen
- Offline-first sync for low/no-internet OPDs
- More Indian languages beyond English/Hindi

## 4. Core user flow (patient)

1. **Welcome / language select** — pick English or Hindi
2. **Identify** — enter details or scan ABHA ID (mocked for MVP) / register as new patient
3. **Consent** — plain-language, audio-icon-affordanced consent screen; must be explicitly accepted before continuing
4. **Converse** (touch-based for MVP) — adaptive question flow: chief complaint sets the branch (e.g. SOCRATES-style follow-ups for pain), then past history, drugs/allergies, family, personal/lifestyle, then the AYUSH module
5. **Scan** — upload prior prescriptions/reports/discharge summaries (drag-and-drop + camera-style capture on mobile), see extracted text per document
6. **Review** — patient sees a plain-language read-back of what was captured, can go back and fix anything
7. **Submitted** — confirmation screen; explains the summary is now ready for the doctor

## 5. Core user flow (doctor)

1. **Login**
2. **Queue dashboard** — list of patients who've completed intake, waiting for consultation, with any red-flag patients visually prioritized
3. **Patient summary screen** — structured, standard-format history (Chief complaint → HPI → Past medical/surgical → Drug & allergy → Family → Personal → ROS → AYUSH findings → document timeline with flagged abnormal values) — every field editable
4. **Confirm & save** — doctor accepts/edits, saved as the record of consultation

## 6. Information architecture (screens to design)

**Patient side:** Welcome/Language → Identify/Register → Consent → Question flow (multi-step, one focus area per screen) → Document upload → Per-document extraction preview → Review/read-back → Submitted confirmation

**Doctor side:** Login → Queue dashboard (sidebar nav) → Patient detail/summary review → Confirmed state

**Shared:** Emergency/red-flag alert banner or screen (staff-facing)

## 7. Design direction

Not a generic teal medical-app clone. Direction: **"Clinical Warmth"** — feels trustworthy and premium like a modern health product, but the palette nods to AYUSH/Ayurveda instead of the usual cold clinical blue:

- Background: warm paper/cream, not stark white
- Ink: deep navy-green for text, not pure black
- Primary accent: sage/mint green
- Secondary accent: warm gold/ochre for highlights, progress, and emphasis (never for errors)
- Alert/red-flag color: a clear clinical red, used ONLY for the emergency system, nowhere else, so it stays meaningful
- Cards: soft rounded corners, gentle shadows, generous whitespace — not boxy or heavily bordered
- Touch UI (patient side): large tap targets, icon-forward, big readable type, minimal text per screen
- Dashboard UI (doctor side): denser, sidebar-nav, card/panel layout, real data visualization where it earns its place (e.g. a small vitals/history-completeness indicator), not decoration for its own sake

## 8. Technical architecture

**Frontend:** Next.js (App Router) + React + TypeScript + Tailwind CSS, deployed on Vercel
**Backend:** Supabase (Postgres + Auth + Storage for uploaded documents)
**Version control:** GitHub
**Build tool:** Google Antigravity (agentic IDE) — this document plus the staged prompts in this conversation are what Antigravity should build from

**Free tools/services for later phases (not needed for the frontend-only build):**
- **OCR (MVP-usable, fully free, client-side, no API key/quota):** Tesseract.js — good enough for printed text; flag handwriting as lower-confidence rather than pretending to read it perfectly
- **PDF text extraction:** pdf.js
- **Indian-language voice (deferred phase):** Bhashini API (Digital India Bhashini Division, Ministry of Electronics & IT) — free government API covering speech-to-text, text-to-speech, and translation across 22 Indian languages; requires free signup at bhashini.gov.in for an API key. This is the same stack the official problem statement names, so it's worth using specifically (not a generic paid ASR vendor) when the voice phase is built.
- **ABHA/ABDM (deferred phase):** ABDM Sandbox (free developer sandbox environment) for mocking FHIR-based HIS/ABHA integration before any real integration is attempted

## 9. Non-functional requirements

- **Accessibility:** large touch targets, high contrast, icon + text pairing (not icon-only) so low-literacy users aren't lost, everything usable with zero training
- **Responsive:** must work cleanly on kiosk tablet (primary), desktop (doctor dashboard), and phone — no overlapping elements, no clutter, smooth breakpoint transitions
- **Privacy:** consent-first design; DPDP Act 2023 language; session data should be understood as sensitive throughout the design (visual language should signal "this is protected," not just say so)
- **i18n-ready:** even though only English/Hindi ship in MVP, all UI text should live in a translation-key structure, not be hardcoded, so adding languages later is a content change, not a rebuild

## 10. Build phases

1. **Phase 0 (current):** Frontend UI shell — all screens above, responsive, with realistic mock data, no backend wiring yet
2. **Phase 1:** Supabase schema + auth (patient + doctor roles) + real data flowing through the question flow
3. **Phase 2:** Document upload wired to Supabase Storage + Tesseract.js/pdf.js extraction
4. **Phase 3:** AI-generated draft summary (LLM call synthesizing answers + extracted document text into the standard format)
5. **Phase 4:** Doctor dashboard on live data, red-flag alert routing
6. **Phase 5 (stretch, post-MVP):** Bhashini voice input/output, ABDM sandbox integration, offline-first sync, handwriting OCR, more languages

## 11. Notes for the coding agent

- Build in the order of the phases above; don't jump ahead to backend/AI logic while a "frontend only" prompt is active.
- Every AI-generated field in the UI must be visually marked as an editable draft, never presented as final.
- Nothing in the emergency/red-flag flow should imply automated diagnosis — it's a "notify a human" system only.
- Prefer free, open, or government-provided services (see §8) over paid vendors at every step.
