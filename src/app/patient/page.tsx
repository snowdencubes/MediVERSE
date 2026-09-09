"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, Globe2, HeartPulse, Languages, ShieldCheck, Sparkles, Plus } from "lucide-react";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { LANGUAGES } from "@/lib/i18n/translations";


export default function WelcomePage() {
  const router = useRouter();
  const { lang, setLang, t } = useTranslation();
  const [showMore, setShowMore] = useState(false);

  const BENEFITS = [
    { icon: Languages, label: t("welcome.benefit1") || "Choose your language" },
    { icon: ShieldCheck, label: t("welcome.benefit2") || "Your information stays private" },
    { icon: HeartPulse, label: t("welcome.benefit3") || "Simple questions for better care" },
  ];

  return (
    <main className="relative min-h-[100dvh] overflow-hidden bg-[var(--paper)] text-ink">
      <div className="pointer-events-none absolute -right-28 -top-28 h-80 w-80 rounded-full bg-gold/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -left-24 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute left-[12%] top-[18%] h-3 w-3 rounded-full bg-gold/70 shadow-[0_0_0_10px_rgba(201,133,46,0.08)]" />

      <div className="mx-auto flex min-h-[100dvh] w-full max-w-6xl flex-col px-5 py-6 sm:px-8 sm:py-8 lg:px-12">
        <header className="flex items-center justify-between" aria-label="MediVERSE header">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-paper shadow-[0_10px_24px_rgba(140,47,57,0.2)]">
              <HeartPulse className="h-6 w-6" strokeWidth={2.2} />
            </div>
            <div>
              <p className="font-serif text-xl font-bold leading-none tracking-tight text-primary">MediVERSE</p>
              <p className="mt-1 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-ink/45">{t("welcome.header_sub") || "AYUSH care, made simple"}</p>
            </div>
          </div>
          <div className="hidden items-center gap-2 rounded-full border border-ink/10 bg-white/45 px-4 py-2 text-sm font-semibold text-ink/60 shadow-sm backdrop-blur-sm sm:flex">
            <ShieldCheck className="h-4 w-4 text-primary" />
            {t("welcome.header_badge") || "Private & secure"}
          </div>
        </header>

        <section className="grid flex-1 items-center gap-10 py-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20 lg:py-16">
          <div className="max-w-xl animate-in fade-in slide-in-from-left-4 duration-700">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-gold/25 bg-gold/10 px-3.5 py-2 text-sm font-bold text-primary">
              <Sparkles className="h-4 w-4 text-gold" />
              {t("welcome.hero_tag") || "Welcome to your care journey"}
            </div>
            <h1 className="max-w-lg font-serif text-5xl font-bold leading-[1.03] tracking-[-0.04em] text-ink sm:text-6xl">
              {t("welcome.hero_title") || "Care starts with "} <span className="text-primary">{t("welcome.hero_title_hl") || "being heard."}</span>
            </h1>
            <p className="mt-6 max-w-md text-lg leading-8 text-ink/65 sm:text-xl">
              {t("welcome.hero_desc") || "Tell us a little about yourself in the language you are most comfortable with. It only takes a few minutes."}
            </p>
            <div className="mt-9 hidden space-y-4 sm:block">
              {BENEFITS.map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-3 text-sm font-semibold text-ink/65">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Icon className="h-4 w-4" />
                  </span>
                  {label}
                </div>
              ))}
            </div>
          </div>

          <div className="glass-panel relative rounded-[2rem] p-6 shadow-[0_24px_80px_rgba(91,38,41,0.1)] sm:rounded-[2.5rem] sm:p-9 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="absolute -right-3 -top-3 flex h-12 w-12 rotate-12 items-center justify-center rounded-2xl bg-gold text-paper shadow-lg">
              <Globe2 className="h-6 w-6" />
            </div>
            <div className="mb-8 pr-8">
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-primary/70">{t("welcome.step") || "Step 01 · Language"}</p>
              <h2 className="font-serif text-3xl font-bold tracking-tight text-ink sm:text-4xl">{t("welcome.title")}</h2>
              <p className="mt-2 text-base leading-6 text-ink/60">{t("welcome.subtitle")}</p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:gap-4" role="radiogroup" aria-label="Choose your language">
              {(showMore ? LANGUAGES : LANGUAGES.slice(0, 5)).map((language) => {
                const selected = lang === language.code;
                return (
                  <button
                    key={language.code}
                    type="button"
                    onClick={() => setLang(language.code)}
                    aria-pressed={selected}
                    className={`group flex min-h-[72px] items-center justify-between rounded-2xl border-2 px-4 text-left transition-all duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20 sm:px-5 ${
                      selected
                        ? "border-primary bg-primary text-paper shadow-[0_12px_24px_rgba(140,47,57,0.18)]"
                        : "border-ink/10 bg-white/55 text-ink hover:border-primary/35 hover:bg-white/80"
                    }`}
                  >
                    <span>
                      <span className="block text-lg font-bold leading-tight">{language.nativeName}</span>
                      <span className={`mt-1 block text-xs ${selected ? "text-paper/70" : "text-ink/45"}`}>{language.name}</span>
                    </span>
                    <span className={`flex h-7 w-7 items-center justify-center rounded-full ${selected ? "bg-paper text-primary" : "border border-ink/15 text-transparent"}`}>
                      <Check className="h-4 w-4" strokeWidth={3} />
                    </span>
                  </button>
                );
              })}
              {!showMore && LANGUAGES.length > 5 && (
                <button
                  type="button"
                  onClick={() => setShowMore(true)}
                  className="group flex min-h-[72px] items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-ink/20 bg-transparent px-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:bg-white/40 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20 sm:px-5"
                >
                  <Plus className="h-5 w-5 text-ink/60 group-hover:text-primary transition-colors" />
                  <span className="text-base font-bold text-ink/60 group-hover:text-primary transition-colors">
                    More
                  </span>
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => router.push("/patient/identify")}
              className="mt-7 flex min-h-[64px] w-full items-center justify-center gap-3 rounded-2xl bg-primary px-5 text-lg font-bold text-paper shadow-[0_14px_28px_rgba(140,47,57,0.2)] transition-all hover:bg-primary-dark hover:shadow-[0_18px_32px_rgba(140,47,57,0.26)] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/25"
            >
              {t("welcome.continue")}
              <ArrowRight className="h-5 w-5" />
            </button>
            <p className="mt-4 text-center text-xs leading-5 text-ink/45">{t("welcome.note") || "You can change your language later from the menu."}</p>
          </div>
        </section>

        <footer className="flex flex-col gap-2 border-t border-ink/10 pt-5 text-xs text-ink/45 sm:flex-row sm:items-center sm:justify-between">
          <span>{t("welcome.footer1") || "Designed for every patient, every story."}</span>
          <span>© {new Date().getFullYear()} MediVERSE · Team CureX</span>
        </footer>
      </div>
    </main>
  );
}
