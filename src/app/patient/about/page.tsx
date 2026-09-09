"use client";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { Info, Users, Hash, FileCode2 } from "lucide-react";

export default function AboutPage() {
  const { t } = useTranslation();

  return (
    <div className="flex-1 flex flex-col max-w-2xl mx-auto w-full pt-8 animate-in fade-in duration-500">
      <h1 className="font-serif text-3xl font-bold text-ink mb-8">{t("about.title")}</h1>

      <div className="space-y-4">
        <div className="bg-surface border border-ink/5 p-6 rounded-2xl flex items-center gap-4">
          <div className="p-3 bg-primary/10 rounded-xl text-primary">
            <Info className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-semibold text-lg text-ink">MediVERSE</h3>
            <p className="text-ink/70">{t("about.desc")}</p>
          </div>
        </div>

        <div className="bg-surface border border-ink/5 p-6 rounded-2xl flex items-center gap-4">
          <div className="p-3 bg-primary/10 rounded-xl text-primary">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-semibold text-lg text-ink">Built By</h3>
            <p className="text-ink/70">{t("about.team")}</p>
          </div>
        </div>

        <div className="bg-surface border border-ink/5 p-6 rounded-2xl flex items-center gap-4">
          <div className="p-3 bg-primary/10 rounded-xl text-primary">
            <Hash className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-semibold text-lg text-ink">Problem Statement</h3>
            <p className="text-ink/70">{t("about.ps")}</p>
          </div>
        </div>

        <div className="bg-surface border border-ink/5 p-6 rounded-2xl flex items-center gap-4">
          <div className="p-3 bg-primary/10 rounded-xl text-primary">
            <FileCode2 className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-semibold text-lg text-ink">Build Version</h3>
            <p className="text-ink/70">{t("about.version")}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
