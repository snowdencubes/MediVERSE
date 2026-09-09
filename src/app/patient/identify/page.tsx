"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { User, Phone, Scan, Briefcase, ChevronDown, ArrowLeft, AlertCircle, CheckCircle2 } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

const PROFESSION_OPTIONS = [
  "Student",
  "Senior Citizen",
  "Government Employee",
  "General Public",
  "Other",
];

export default function IdentifyPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [mode, setMode] = useState<"choice" | "manual" | "camera" | "qr" | "success">("choice");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [profession, setProfession] = useState("");
  const [error, setError] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);

  // Stop camera if we navigate away
  useEffect(() => {
    return () => stopCamera();
  }, []);

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
  };

  const handleScanClick = () => {
    // Check if we are on a small device (phone/tablet)
    if (window.innerWidth < 1024) {
      setMode("camera");
      // Start camera
      navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
        .then(stream => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
          // Mock successful scan after 3 seconds
          setTimeout(() => {
            stopCamera();
            setMode("success");
            setTimeout(() => router.push("/patient/consent"), 2000);
          }, 3000);
        })
        .catch(err => {
          console.error("Camera access denied or unavailable", err);
          setError("Camera access denied. Please type manually.");
          setMode("manual");
        });
    } else {
      // Laptop / Desktop / Kiosk Mode
      setMode("qr");
      // Mock completion after simulated phone scan delay
      setTimeout(() => {
        setMode("success");
        setTimeout(() => router.push("/patient/consent"), 2000);
      }, 5000);
    }
  };

  const handleContinue = () => {
    if (!name.trim()) {
      setError(t("identify.err_name") || "Please tell us your full name so we know what to call you.");
      return;
    }
    if (!phone.trim() || phone.length < 10) {
      setError(t("identify.err_phone") || "Please enter a valid 10-digit phone number so we can reach you.");
      return;
    }
    setError("");
    router.push("/patient/consent");
  };

  const handleBack = () => {
    if (mode === "manual" || mode === "camera" || mode === "qr") {
      stopCamera();
      setMode("choice");
      setError("");
    } else {
      router.back();
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full animate-in fade-in duration-500">
      <div className="flex items-center justify-between mb-8 w-full max-w-lg mx-auto">
        <div className="flex-1 flex justify-start">
          <button onClick={handleBack} className="flex items-center gap-2 px-5 min-h-[56px] bg-surface rounded-[1.75rem] text-ink font-bold hover:bg-ink/5 transition-colors">
            <ArrowLeft className="w-6 h-6" />
            <span>{t("identify.back") || "Back"}</span>
          </button>
        </div>
        <div className="flex-1" />
      </div>

      <div className="flex-1 flex flex-col space-y-8 max-w-lg mx-auto w-full pt-4 pb-24">
        
        {mode === "success" && (
          <div className="flex flex-col items-center justify-center text-center space-y-4 py-12 animate-in zoom-in-95 duration-500">
            <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mb-2">
              <CheckCircle2 className="w-12 h-12 text-primary" />
            </div>
            <h1 className="font-serif text-3xl font-bold text-ink">{t("identify.success_title") || "ABHA Linked Successfully!"}</h1>
            <p className="text-lg text-ink/70">{t("identify.success_sub") || "Redirecting to consent..."}</p>
          </div>
        )}

        {mode !== "success" && (
          <>
            <div className="space-y-2 text-center md:text-left">
              <h1 className="font-serif text-3xl font-bold text-ink">
                {mode === "choice" ? (t("identify.choice_title") || "How would you like to start?") : (t("identify.title") || "Patient Details")}
              </h1>
              <p className="text-ink/70">
                {mode === "choice" ? (t("identify.choice_sub") || "Choose the fastest option for you.") : (t("identify.subtitle") || "Enter your details or scan your ABHA ID card.")}
              </p>
            </div>

            {mode === "choice" && (
              <div className="space-y-6">
                <button
                  onClick={handleScanClick}
                  className="w-full border-2 border-primary/40 bg-primary/5 hover:bg-primary/10 transition-colors p-8 rounded-3xl flex flex-col items-center justify-center space-y-4 group min-h-[200px]"
                >
                  <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                    <Scan className="w-10 h-10 text-primary" />
                  </div>
                  <div className="text-center">
                    <div className="font-bold text-2xl text-ink mb-1">{t("identify.scan")}</div>
                    <div className="text-base text-ink/70">{t("identify.scan_sub")}</div>
                  </div>
                </button>

                <button
                  onClick={() => setMode("manual")}
                  className="w-full border-2 border-surface bg-surface hover:border-primary/30 transition-colors p-8 rounded-3xl flex flex-col items-center justify-center space-y-4 group min-h-[160px]"
                >
                  <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                    <User className="w-8 h-8 text-ink/60 group-hover:text-primary transition-colors" />
                  </div>
                  <div className="text-center">
                    <div className="font-bold text-xl text-ink mb-1">{t("identify.or")}</div>
                    <div className="text-sm text-ink/60">{t("identify.no_card") || "If you don't have a card"}</div>
                  </div>
                </button>
              </div>
            )}

            {mode === "camera" && (
              <div className="flex flex-col items-center justify-center space-y-6 animate-in fade-in duration-500">
                <div className="relative w-full max-w-sm aspect-[3/4] bg-ink rounded-3xl overflow-hidden shadow-xl border-4 border-surface">
                  <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                  <div className="absolute inset-0 border-[6px] border-primary/50 m-8 rounded-xl z-10 pointer-events-none" />
                  <div className="absolute top-4 left-0 right-0 text-center z-20">
                    <span className="bg-black/60 text-white px-4 py-1.5 rounded-full text-sm font-medium backdrop-blur-md">
                      {t("identify.camera_scanning") || "Scanning ABHA..."}
                    </span>
                  </div>
                </div>
                <p className="text-ink/60 font-medium">{t("identify.camera_instruction") || "Position your card inside the frame"}</p>
              </div>
            )}

            {mode === "qr" && (
              <div className="flex flex-col items-center justify-center space-y-8 animate-in fade-in duration-500 p-8 glass-panel rounded-3xl">
                <div className="bg-white p-4 rounded-2xl shadow-sm">
                  <QRCodeSVG value="https://abha.abdm.gov.in/" size={200} />
                </div>
                <div className="text-center space-y-2">
                  <h3 className="font-bold text-2xl text-ink">{t("identify.qr_title") || "Waiting for your phone..."}</h3>
                  <p className="text-ink/70">{t("identify.qr_sub") || "Scan this QR code with your mobile camera to link your ABHA securely."}</p>
                </div>
              </div>
            )}

            {mode === "manual" && (
              <div className="space-y-6 animate-in fade-in duration-300">
                {error && (
                  <div className="bg-alert/10 text-alert p-4 rounded-xl flex items-start gap-3">
                    <AlertCircle className="w-6 h-6 shrink-0" />
                    <p className="font-medium text-sm mt-0.5">{error}</p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-ink mb-1.5 ml-1">{t("identify.fullname") || "Full Name"}</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-ink/40" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Ramesh Kumar"
                      className="w-full min-h-[64px] bg-surface border-2 border-surface focus:border-primary focus:ring-0 rounded-2xl p-4 pl-12 outline-none transition-colors text-lg"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-ink mb-1.5 ml-1">{t("identify.phone") || "Phone Number"}</label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-ink/40" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="10-digit mobile number"
                      className="w-full min-h-[64px] bg-surface border-2 border-surface focus:border-primary focus:ring-0 rounded-2xl p-4 pl-12 outline-none transition-colors text-lg"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-ink mb-1.5 ml-1">
                    {t("identify.profession") || "Profession"} <span className="text-ink/40 font-normal">{t("identify.optional") || "(optional)"}</span>
                  </label>
                  <div className="relative">
                    <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-ink/40" />
                    <select
                      value={profession}
                      onChange={(e) => setProfession(e.target.value)}
                      className="w-full min-h-[64px] bg-surface border-2 border-surface focus:border-primary focus:ring-0 rounded-2xl p-4 pl-12 outline-none transition-colors text-lg appearance-none cursor-pointer"
                    >
                      <option value="">{t("identify.select") || "Select if you want"}</option>
                      {PROFESSION_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-ink/40 pointer-events-none" />
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    onClick={handleContinue}
                    className="w-full min-h-[64px] flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-paper p-5 rounded-2xl text-xl font-bold transition-colors active:scale-95 shadow-sm"
                  >
                    {t("identify.continue") || "Continue"}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
