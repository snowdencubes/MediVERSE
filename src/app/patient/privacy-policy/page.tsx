"use client";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { ShieldCheck } from "lucide-react";

export default function PrivacyPage() {
  const { t } = useTranslation();

  return (
    <div className="flex-1 flex flex-col max-w-2xl mx-auto w-full pt-8 animate-in fade-in duration-500 pb-12">
      <div className="flex items-center gap-4 mb-8">
        <div className="p-3 bg-primary/10 rounded-xl text-primary">
          <ShieldCheck className="w-8 h-8" />
        </div>
        <h1 className="font-serif text-3xl font-bold text-ink">{t("privacy_full.title")}</h1>
      </div>

      <div className="bg-surface border border-ink/5 p-8 rounded-3xl shadow-sm prose prose-p:text-ink/70 prose-headings:text-ink max-w-none">
        <p className="text-lg leading-relaxed">
          {t("privacy_full.content")}
        </p>
        <p className="mt-4 leading-relaxed">
          <strong>1. Information We Collect:</strong> We only collect health data you explicitly provide through this kiosk, including self-reported symptoms and documents you upload.
        </p>
        <p className="mt-4 leading-relaxed">
          <strong>2. How We Use It:</strong> Your data is used exclusively to assist your consulting doctor in diagnosing and treating you. We do not sell or share your data with third parties.
        </p>
        <p className="mt-4 leading-relaxed">
          <strong>3. DPDP Act 2023 Compliance:</strong> All data is securely processed in accordance with the Digital Personal Data Protection Act of India (2023). You retain full rights over your digital personal data.
        </p>
        <p className="mt-4 leading-relaxed">
          <strong>4. Data Deletion:</strong> You have the right to request the deletion of your digital intake records at the hospital reception at any time.
        </p>
      </div>
    </div>
  );
}
