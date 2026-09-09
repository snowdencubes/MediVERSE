"use client";
import { useRouter } from "next/navigation";
import { Globe } from "lucide-react";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { LANGUAGES, SupportedLang } from "@/lib/i18n/translations";

export default function WelcomePage() {
  const router = useRouter();
  const { lang, setLang, t } = useTranslation();

  const handleContinue = () => {
    router.push("/patient/identify");
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 min-h-[100dvh] bg-[var(--paper)]">
      {/* Visual Polish: Consistent glass-panel treatment */}
      <div className="glass-panel p-8 sm:p-12 rounded-[2.5rem] w-full max-w-lg flex flex-col items-center animate-in fade-in slide-in-from-bottom-8 duration-700">
        <div className="text-center space-y-4 mb-10">
          <Globe className="w-16 h-16 text-primary mx-auto mb-6" />
          <h1 className="font-serif text-4xl font-bold text-ink tracking-tight">
            {t("welcome.title")}
          </h1>
          <p className="text-lg text-ink/70">{t("welcome.subtitle")}</p>
        </div>

        <div className="w-full grid grid-cols-2 gap-3 sm:gap-4 mb-8">
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              onClick={() => setLang(l.code)}
              className={`p-4 rounded-2xl border-2 transition-all duration-300 text-lg font-medium flex items-center justify-between hover:-translate-y-0.5 ${
                lang === l.code
                  ? "border-primary bg-primary/10 text-primary shadow-sm"
                  : "border-white/60 bg-white/40 text-ink hover:border-primary/30"
              }`}
            >
              <span>{l.nativeName}</span>
              {lang === l.code && <div className="w-3 h-3 rounded-full bg-primary" />}
            </button>
          ))}
        </div>

        <button
          onClick={handleContinue}
          className="w-full bg-primary hover:bg-primary-dark text-paper p-5 rounded-2xl text-xl font-semibold transition-all duration-300 mt-2 active:scale-95 shadow-md hover:shadow-lg"
        >
          {t("welcome.continue")}
        </button>
      </div>
    </div>
  );
}
