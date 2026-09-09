"use client";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { MessageSquare, UploadCloud, UserCircle2 } from "lucide-react";

export default function HelpPage() {
  const { t } = useTranslation();

  return (
    <div className="flex-1 flex flex-col max-w-2xl mx-auto w-full pt-8 animate-in fade-in duration-500">
      <h1 className="font-serif text-3xl font-bold text-ink mb-8">{t("help.title")}</h1>

      <div className="space-y-6 relative before:absolute before:inset-0 before:ml-[35px] before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-ink/10 before:to-transparent">
        
        <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
          <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-paper bg-primary text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 ml-4 md:ml-0">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-2xl bg-surface border border-ink/5 shadow-sm">
            <h3 className="font-bold text-lg text-ink mb-1">{t("help.step1.title")}</h3>
            <p className="text-ink/70 leading-relaxed">{t("help.step1.desc")}</p>
          </div>
        </div>

        <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
          <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-paper bg-primary text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 ml-4 md:ml-0">
            <UploadCloud className="w-5 h-5" />
          </div>
          <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-2xl bg-surface border border-ink/5 shadow-sm">
            <h3 className="font-bold text-lg text-ink mb-1">{t("help.step2.title")}</h3>
            <p className="text-ink/70 leading-relaxed">{t("help.step2.desc")}</p>
          </div>
        </div>

        <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
          <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-paper bg-primary text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 ml-4 md:ml-0">
            <UserCircle2 className="w-5 h-5" />
          </div>
          <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-2xl bg-surface border border-ink/5 shadow-sm">
            <h3 className="font-bold text-lg text-ink mb-1">{t("help.step3.title")}</h3>
            <p className="text-ink/70 leading-relaxed">{t("help.step3.desc")}</p>
          </div>
        </div>
        
      </div>
    </div>
  );
}
