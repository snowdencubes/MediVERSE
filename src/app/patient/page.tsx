"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Globe } from "lucide-react";

export default function WelcomePage() {
  const router = useRouter();
  const [lang, setLang] = useState<"en" | "hi">("en");

  const handleContinue = () => {
    // In a real app we'd save this to a context or cookie
    router.push("/patient/identify");
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center space-y-12 animate-in fade-in zoom-in duration-500">
      <div className="text-center space-y-4">
        <Globe className="w-16 h-16 text-primary mx-auto mb-6" />
        <h1 className="font-serif text-4xl font-bold text-ink tracking-tight">
          Welcome to AyuLipi
        </h1>
        <p className="text-lg text-ink/70">Please select your preferred language</p>
      </div>

      <div className="flex flex-col w-full max-w-sm space-y-4">
        <button
          onClick={() => setLang("en")}
          className={`p-6 rounded-2xl border-2 transition-all text-xl font-medium flex items-center justify-between ${
            lang === "en"
              ? "border-primary bg-primary/5 text-primary"
              : "border-surface bg-surface text-ink hover:border-primary/30"
          }`}
        >
          <span>English</span>
          {lang === "en" && <div className="w-4 h-4 rounded-full bg-primary" />}
        </button>
        <button
          onClick={() => setLang("hi")}
          className={`p-6 rounded-2xl border-2 transition-all text-xl font-medium flex items-center justify-between ${
            lang === "hi"
              ? "border-primary bg-primary/5 text-primary"
              : "border-surface bg-surface text-ink hover:border-primary/30"
          }`}
        >
          <span>हिन्दी</span>
          {lang === "hi" && <div className="w-4 h-4 rounded-full bg-primary" />}
        </button>
      </div>

      <button
        onClick={handleContinue}
        className="w-full max-w-sm bg-primary hover:bg-primary-dark text-paper p-5 rounded-2xl text-xl font-semibold transition-colors mt-8 active:scale-95"
      >
        {lang === "en" ? "Continue" : "आगे बढ़ें"}
      </button>
    </div>
  );
}
