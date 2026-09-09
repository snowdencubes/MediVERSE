"use client";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { ShieldCheck, Volume2 } from "lucide-react";

export default function ConsentPage() {
  const router = useRouter();
  const { t } = useTranslation();

  const handleAccept = () => {
    router.push("/patient/category");
  };

  return (
    <div className="flex-1 flex flex-col space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-2xl mx-auto w-full pt-8 pb-12">
      <div className="text-center space-y-4 mb-4">
        <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <ShieldCheck className="w-10 h-10 text-primary" />
        </div>
        <h1 className="font-serif text-3xl font-bold text-ink">{t("consent.title")}</h1>
      </div>

      <div className="glass-panel rounded-3xl p-8 space-y-8">
        <div className="flex flex-col gap-4">
          <p className="text-lg text-ink/80 leading-relaxed">
            {t("consent.p1")}
          </p>
          <button className="flex items-center gap-2 self-start bg-primary/10 text-primary hover:bg-primary/20 px-6 min-h-[56px] rounded-2xl transition-colors">
            <Volume2 className="w-6 h-6" />
            <span className="font-bold">{t("consent.read_aloud") || "Read Aloud"}</span>
          </button>
        </div>
        
        <div className="flex flex-col gap-4">
          <p className="text-lg text-ink/80 leading-relaxed">
            {t("consent.p2")}
          </p>
          <button className="flex items-center gap-2 self-start bg-primary/10 text-primary hover:bg-primary/20 px-6 min-h-[56px] rounded-2xl transition-colors">
            <Volume2 className="w-6 h-6" />
            <span className="font-bold">{t("consent.read_aloud") || "Read Aloud"}</span>
          </button>
        </div>
        
        <div className="flex flex-col gap-4">
          <p className="text-lg text-ink/80 leading-relaxed">
            {t("consent.p3")}
          </p>
          <button className="flex items-center gap-2 self-start bg-primary/10 text-primary hover:bg-primary/20 px-6 min-h-[56px] rounded-2xl transition-colors">
            <Volume2 className="w-6 h-6" />
            <span className="font-bold">{t("consent.read_aloud") || "Read Aloud"}</span>
          </button>
        </div>
      </div>

      <div className="pt-4 flex flex-col sm:flex-row gap-4">
        <button
          onClick={() => router.back()}
          className="flex-1 bg-surface hover:bg-ink/5 text-ink p-5 rounded-2xl text-xl font-medium transition-colors"
        >
          {t("consent.decline")}
        </button>
        <button
          onClick={handleAccept}
          className="flex-1 bg-primary hover:bg-primary-dark text-paper p-5 rounded-2xl text-xl font-semibold transition-colors shadow-md active:scale-95"
        >
          {t("consent.accept")}
        </button>
      </div>
    </div>
  );
}
