"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { User, Phone, Scan, Briefcase, ChevronDown, ArrowLeft, AlertCircle } from "lucide-react";

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
  const [mode, setMode] = useState<"choice" | "manual">("choice");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [profession, setProfession] = useState("");
  const [error, setError] = useState("");

  const handleContinue = () => {
    if (mode === "choice") {
      setMode("manual");
      return;
    }

    if (!name.trim()) {
      setError("Please tell us your full name so we know what to call you.");
      return;
    }
    if (!phone.trim() || phone.length < 10) {
      setError("Please enter a valid 10-digit phone number so we can reach you.");
      return;
    }

    setError("");
    router.push("/patient/consent");
  };

  const handleBack = () => {
    if (mode === "manual") {
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
            <span>Back</span>
          </button>
        </div>
        <div className="flex-1" />
      </div>

      <div className="flex-1 flex flex-col space-y-8 max-w-lg mx-auto w-full pt-4 pb-24">
        <div className="space-y-2">
          <h1 className="font-serif text-3xl font-bold text-ink">
            {mode === "choice" ? "How would you like to start?" : t("identify.title")}
          </h1>
          <p className="text-ink/70">
            {mode === "choice" ? "Choose the fastest option for you." : t("identify.subtitle")}
          </p>
        </div>

        {mode === "choice" ? (
          <div className="space-y-6">
            <button
              onClick={() => router.push("/patient/consent")}
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
                <div className="text-sm text-ink/60">If you don&apos;t have a card</div>
              </div>
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {error && (
              <div className="bg-alert/10 text-alert p-4 rounded-xl flex items-start gap-3">
                <AlertCircle className="w-6 h-6 shrink-0" />
                <p className="font-medium text-sm mt-0.5">{error}</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-ink mb-1.5 ml-1">Full Name</label>
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
              <label className="block text-sm font-medium text-ink mb-1.5 ml-1">Phone Number</label>
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
                Profession <span className="text-ink/40 font-normal">(optional)</span>
              </label>
              <div className="relative">
                <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-ink/40" />
                <select
                  value={profession}
                  onChange={(e) => setProfession(e.target.value)}
                  className="w-full min-h-[64px] bg-surface border-2 border-surface focus:border-primary focus:ring-0 rounded-2xl p-4 pl-12 outline-none transition-colors text-lg appearance-none cursor-pointer"
                >
                  <option value="">Select if you want</option>
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
                className="w-full min-h-[64px] flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-paper p-5 rounded-2xl text-xl font-bold transition-colors active:scale-95"
              >
                Continue
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
