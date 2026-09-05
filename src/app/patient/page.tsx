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
    <div className="flex-1 flex flex-col items-center justify-center p-4">
      <div className="bg-white/50 backdrop-blur-xl border border-white/60 p-8 sm:p-12 rounded-[2.5rem] shadow-[0_8px_32px_rgba(0,0,0,0.04)] w-full max-w-md flex flex-col items-center animate-in fade-in slide-in-from-bottom-8 duration-700">
        <div className="text-center space-y-4 mb-10">
          <Globe className="w-16 h-16 text-primary mx-auto mb-6" />
          <h1 className="font-serif text-4xl font-bold text-ink tracking-tight">
            Welcome to AyuLipi
          </h1>
          <p className="text-lg text-ink/70">Please select your preferred language</p>
        </div>

        <div className="flex flex-col w-full space-y-4">
          <button
            onClick={() => setLang("en")}
            className={`p-6 rounded-2xl border-2 transition-all duration-300 text-xl font-medium flex items-center justify-between hover:shadow-md hover:-translate-y-1 ${
              lang === "en"
                ? "border-primary bg-primary/5 text-primary shadow-sm"
                : "border-white/60 bg-white/40 text-ink hover:border-primary/30"
            }`}
          >
            <span>English</span>
            {lang === "en" && <div className="w-4 h-4 rounded-full bg-primary" />}
          </button>
          <button
            onClick={() => setLang("hi")}
            className={`p-6 rounded-2xl border-2 transition-all duration-300 text-xl font-medium flex items-center justify-between hover:shadow-md hover:-translate-y-1 ${
              lang === "hi"
                ? "border-primary bg-primary/5 text-primary shadow-sm"
                : "border-white/60 bg-white/40 text-ink hover:border-primary/30"
            }`}
          >
            <span>हिन्दी</span>
            {lang === "hi" && <div className="w-4 h-4 rounded-full bg-primary" />}
          </button>
        </div>

        <button
          onClick={handleContinue}
          className="w-full bg-primary hover:bg-primary-dark text-paper p-5 rounded-2xl text-xl font-semibold transition-all duration-300 mt-8 active:scale-95 shadow-md hover:shadow-lg"
        >
          {lang === "en" ? "Continue" : "आगे बढ़ें"}
        </button>
      </div>
    </div>
  );
}
