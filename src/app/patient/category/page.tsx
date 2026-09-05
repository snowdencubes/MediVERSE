"use client";
import { useRouter } from "next/navigation";
import {
  Eye,
  Heart,
  Bone,
  Droplets,
  Wind,
  Brain,
  Leaf,
  MoreHorizontal,
  Stethoscope,
} from "lucide-react";

const CATEGORIES = [
  { id: "eye", name: "Eye", icon: Eye, color: "text-blue-600 bg-blue-50" },
  { id: "heart", name: "Heart", icon: Heart, color: "text-red-500 bg-red-50" },
  { id: "bone", name: "Bone / Joint", icon: Bone, color: "text-amber-600 bg-amber-50" },
  { id: "skin", name: "Skin", icon: Droplets, color: "text-pink-500 bg-pink-50" },
  { id: "digestive", name: "Digestive", icon: Stethoscope, color: "text-orange-500 bg-orange-50" },
  { id: "respiratory", name: "Respiratory", icon: Wind, color: "text-teal-600 bg-teal-50" },
  { id: "mental", name: "Mental Health", icon: Brain, color: "text-violet-600 bg-violet-50" },
  { id: "ayush", name: "General / AYUSH", icon: Leaf, color: "text-primary bg-primary/10" },
  { id: "others", name: "Others", icon: MoreHorizontal, color: "text-ink/60 bg-ink/5" },
];

export default function CategorySelectionPage() {
  const router = useRouter();

  const handleSelect = (categoryId: string) => {
    // Save selected category to context / URL param
    router.push(`/patient/intake?category=${categoryId}`);
  };

  return (
    <div className="flex-1 flex flex-col space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-2xl mx-auto w-full pt-8 pb-24">
      <div className="text-center space-y-3">
        <h1 className="font-serif text-3xl font-bold text-ink">
          What brings you in today?
        </h1>
        <p className="text-lg text-ink/70">
          Select the area closest to your concern
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => handleSelect(cat.id)}
            className="bg-surface hover:bg-white border-2 border-surface hover:border-primary/30 p-5 rounded-2xl flex flex-col items-center text-center transition-all hover:shadow-md active:scale-95 group"
          >
            <div
              className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-3 ${cat.color} group-hover:scale-110 transition-transform`}
            >
              <cat.icon className="w-7 h-7" />
            </div>
            <span className="text-sm font-semibold text-ink leading-tight">
              {cat.name}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
