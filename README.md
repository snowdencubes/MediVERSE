<div align="center">
  <img src="https://capsule-render.vercel.app/api?type=waving&color=0052cc&height=250&section=header&text=MediVERSE&fontSize=90&fontAlignY=35&desc=The%20Next-Gen%20Hospital%20Queue%20%26%20AI%20Assistant&descAlignY=55&descAlign=50" />
  
  <p align="center">
    <strong>Revolutionizing Healthcare Management with AI, Voice, and Seamless Automation</strong>
  </p>

  <p align="center">
    <a href="https://github.com/snowdencubes/MediVERSE/releases"><img src="https://img.shields.io/github/v/tag/snowdencubes/MediVERSE?label=release&color=0052cc&style=for-the-badge" alt="Release"></a>
    <a href="https://www.python.org/"><img src="https://img.shields.io/badge/Python-3.10+-blue.svg?style=for-the-badge&logo=python&logoColor=white" alt="Python"></a>
    <a href="https://nextjs.org/"><img src="https://img.shields.io/badge/Next.js-Black?style=for-the-badge&logo=next.js&logoColor=white" alt="Next.js"></a>
    <a href="https://fastapi.tiangolo.com/"><img src="https://img.shields.io/badge/FastAPI-0052cc?style=for-the-badge&logo=fastapi&logoColor=white" alt="FastAPI"></a>
    <a href="https://supabase.com/"><img src="https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white" alt="Supabase"></a>
  </p>
</div>

---

## 🌟 Why MediVERSE? (The Hackathon Hook)
**Imagine a hospital where queues manage themselves and AI triages patients before they even see a doctor.** 

**MediVERSE** is a full-stack, AI-powered hospital management ecosystem. It seamlessly bridges the gap between physical hospital kiosks and advanced digital AI triage. Whether a patient uses the Next.js touch kiosk, chats with our LLM, or speaks directly to our Voice Assistant, MediVERSE handles check-in, dynamic queuing, and digital receipts (with instantly scannable QR codes) in real-time.

### ✨ Key Features That Wow
- 🚀 **Omnichannel Triage:** 
  - **Web UI:** Stunning Kiosk-style interface built on Next.js.
  - **AI Mode:** Understands symptoms in English, Hindi, and Hinglish using Qwen 72B (Online) or Qwen 0.5B-3B (100% Offline ONNX).
  - **Voice Mode:** Always-listening STT (Google/Vosk) + TTS (Edge-TTS).
- ⚡ **Digital Receipts via QR:** Instantly generates PDF receipts uploaded to Supabase Storage. Patients just scan a QR code and walk away.
- 🔋 **Resilient Architecture:** Fallback to local SQLite when offline. Once the internet returns, background threads seamlessly sync to Supabase.
- 🛠️ **Zero Config Launch:** Everything runs from one command: `python main.py`

---

## 📸 Sneak Peek
<div align="center">
  <img src="docs/assets/kiosk_ui.jpg" alt="Kiosk UI" width="48%" style="border-radius: 8px;">
  <img src="docs/assets/ai_terminal.jpg" alt="RITMO AI Terminal" width="48%" style="border-radius: 8px;">
</div>

---

## 👨‍💻 Meet the Masterminds

<div align="center">
  <table style="border-collapse: collapse; border: none;">
    <tr>
      <td align="center" style="border: none; padding: 20px;">
        <a href="https://github.com/pheonix14">
          <img src="https://github.com/pheonix14.png" width="130px;" alt="Phoenix 14" style="border-radius:50%; border: 3px solid #0052cc; margin-bottom: 10px; transition: transform 0.3s;"/>
          <br />
          <b style="font-size: 1.1em;">Phoenix 14</b>
        </a>
        <br />
        <span style="color: #0052cc; font-weight: bold; font-size: 0.9em;">Lead Developer</span><br/>
        <i>Backend Architecture,<br/>AI Integration & Core Engine</i>
      </td>
      <td align="center" style="border: none; padding: 20px;">
        <a href="https://github.com/krishkumarcodes">
          <img src="https://github.com/krishkumarcodes.png" width="130px;" alt="Showden" style="border-radius:50%; border: 3px solid #0052cc; margin-bottom: 10px; transition: transform 0.3s;"/>
          <br />
          <b style="font-size: 1.1em;">Showden</b>
        </a>
        <br />
        <span style="color: #0052cc; font-weight: bold; font-size: 0.9em;">Second Developer</span><br/>
        <i>Frontend Wizardry,<br/>Web UI & UX Experience</i>
      </td>
      <td align="center" style="border: none; padding: 20px;">
        <a href="https://github.com/droy">
          <img src="https://github.com/droy.png" width="130px;" alt="Dipankar Roy" style="border-radius:50%; border: 3px solid #555; margin-bottom: 10px; transition: transform 0.3s;"/>
          <br />
          <b style="font-size: 1.1em;">Dipankar Roy</b>
        </a>
        <br />
        <span style="color: #555; font-weight: bold; font-size: 0.9em;">Contributor</span><br/>
        <i>Cloud Infrastructure,<br/>Database & DevOps</i>
      </td>
    </tr>
  </table>
</div>

---

## 🛠️ Architecture

```mermaid
graph TD;
    Patient-->|Touches Screen| Kiosk[Next.js Frontend]
    Patient-->|Speaks/Chats| AI[Terminal/Voice]
    Kiosk-->|API Calls| FastAPI[FastAPI Backend]
    AI-->|Direct Logic| FastAPI
    FastAPI-->|Syncs| Supabase[(Supabase Cloud)]
    FastAPI-->|Fallback| SQLite[(Local SQLite)]
    FastAPI-->|Inference| HF[HuggingFace / ONNX]
```

---

## 🚀 Getting Started

### 1. Clone & Install
```bash
git clone https://github.com/snowdencubes/MediVERSE.git
cd MediVERSE
pip install fastapi uvicorn supabase requests
```

### 2. Configure (Zero Leaks!)
Copy `config.example.json` to `config.json` and add your keys. **(Don't worry, `config.json` is gitignored so your keys are safe and will never be committed!)**
```jsonc
{
  "supabase": {
    "url": "https://xxxx.supabase.co",
    "key": "eyJ..."
  },
  "hf_token": "hf_..."
}
```

### 3. Launch
```bash
python main.py
```
*Choose between Web UI, Terminal AI, or Backend-only mode!*

---

## 📁 Complete File Structure (Simplified)
```text
MediVERSE/
├── main.py              # Magic entry point
├── rekov/               # FastAPI Backend & System Launcher
├── rekoviu/             # Next.js Frontend
├── base/                # DB Layer & Offline SQLite logic
└── data/                # Local data (Receipts, DBs, Offline Backups)
```

---

<div align="center">
  <b>Built with ❤️ for the future of healthcare.</b><br>
  <sub>MediVERSE v12.0.0 · Hospital AI Queue Management System</sub>
</div>
