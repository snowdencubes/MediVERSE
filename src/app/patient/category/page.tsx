"use client";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/lib/i18n/useTranslation";
import {
  Eye,
  Heart,
  Bone,
  Drop,
  Wind,
  Brain,
  Leaf,
  DotsThree,
  Stethoscope,
} from "@phosphor-icons/react";

export default function CategorySelectionPage() {
  const router = useRouter();
  const { t } = useTranslation();

  const CATEGORIES = [
    { id: "eye", name: "Eye", icon: Eye, color: "text-primary bg-primary/10" },
    { id: "heart", name: "Heart", icon: Heart, color: "text-primary bg-primary/10" },
    { id: "bone", name: "Bone / Joint", icon: Bone, color: "text-gold bg-gold/10" },
    { id: "skin", name: "Skin", icon: Drop, color: "text-primary bg-primary/10" },
    { id: "digestive", name: "Digestive", icon: Stethoscope, color: "text-primary bg-primary/10" },
    { id: "respiratory", name: "Respiratory", icon: Wind, color: "text-primary bg-primary/10" },
    { id: "mental", name: "Mental Health", icon: Brain, color: "text-gold bg-gold/10" },
    { id: "ayush", name: "General / AYUSH", icon: Leaf, color: "text-primary bg-primary/10" },
    { id: "others", name: "Others", icon: DotsThree, color: "text-ink/60 bg-ink/5" },
  ];

  const handleSelect = (categoryId: string) => {
    router.push(`/patient/intake?category=${categoryId}`);
  };

  return (
    <div className="flex-1 flex flex-col space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-2xl mx-auto w-full pt-8 pb-24">
      <div className="text-center space-y-3">
        <h1 className="font-serif text-3xl font-bold text-ink">
          {t("category.title") || "What brings you in today?"}
        </h1>
        <p className="text-lg text-ink/70">
          {t("category.subtitle") || "Select the area closest to your concern"}
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => handleSelect(cat.id)}
            className="bg-surface hover:bg-white border-2 border-surface hover:border-primary/30 p-5 rounded-2xl flex flex-col items-center text-center transition-all hover:shadow-md active:scale-95 group"
          >
            <div
              className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-3 ${cat.color} group-hover:scale-110 transition-transform`}
            >
              <cat.icon weight="duotone" className="w-8 h-8" />
            </div>
            <span className="text-sm font-semibold text-ink leading-tight">
              {t(`category.${cat.id}`) || cat.name}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
