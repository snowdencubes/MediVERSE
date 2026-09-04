"use client";
import { useRouter } from "next/navigation";
import { Edit2, ArrowLeft, CheckCircle } from "lucide-react";

export default function ReviewPage() {
  const router = useRouter();

  return (
    <div className="flex-1 flex flex-col h-full animate-in fade-in duration-500 max-w-2xl mx-auto w-full pt-8">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => router.back()} className="p-3 bg-surface rounded-full text-ink hover:bg-ink/5">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="font-serif text-3xl font-bold text-ink">Review Your Summary</h1>
      </div>

      <p className="text-xl text-ink/80 mb-8">
        This is what we will share with your doctor. Please verify the information below.
      </p>

      <div className="space-y-4 flex-1">
        <ReviewSection 
          title="Main Reason for Visit" 
          content="Severe headache for the past 3 days."
          onEdit={() => router.push("/patient/intake")}
        />
        <ReviewSection 
          title="Past Medical History" 
          content="Hypertension"
          onEdit={() => router.push("/patient/intake")}
        />
        <ReviewSection 
          title="Digestion & Appetite" 
          content="Irregular (Vishamagni)"
          onEdit={() => router.push("/patient/intake")}
        />
        <ReviewSection 
          title="Documents Attached" 
          content="Past_Prescription.jpg"
          onEdit={() => router.push("/patient/upload")}
        />
      </div>

      <div className="pt-8 mt-auto">
        <button
          onClick={() => router.push("/patient/submitted")}
          className="w-full bg-primary hover:bg-primary-dark text-paper p-5 rounded-2xl text-xl font-semibold transition-colors active:scale-95 flex items-center justify-center gap-3"
        >
          <CheckCircle className="w-6 h-6" />
          Confirm & Submit
        </button>
      </div>
    </div>
  );
}

function ReviewSection({ title, content, onEdit }: { title: string; content: string; onEdit: () => void }) {
  return (
    <div className="bg-surface p-6 rounded-2xl border border-ink/5 flex items-start justify-between gap-4">
      <div>
        <h3 className="text-sm font-semibold text-ink/60 mb-2">{title}</h3>
        <p className="text-xl font-medium text-ink">{content}</p>
      </div>
      <button onClick={onEdit} className="p-3 bg-white rounded-full text-primary hover:bg-primary/10 transition-colors shrink-0 shadow-sm border border-ink/5">
        <Edit2 className="w-5 h-5" />
      </button>
    </div>
  );
}
