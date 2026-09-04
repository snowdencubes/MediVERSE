"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { UploadCloud, FileText, X, ArrowLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function DocumentUploadPage() {
  const router = useRouter();
  const [docs, setDocs] = useState<{name: string, text: string}[]>([]);

  const handleSimulateUpload = () => {
    setDocs([...docs, {
      name: "Past_Prescription.jpg",
      text: "Extracted Text (Draft): Patient prescribed Metformin 500mg OD. Blood pressure 130/85."
    }]);
  };

  const removeDoc = (index: number) => {
    setDocs(docs.filter((_, i) => i !== index));
  };

  return (
    <div className="flex-1 flex flex-col h-full animate-in fade-in duration-500 max-w-2xl mx-auto w-full pt-8">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => router.back()} className="p-3 bg-surface rounded-full text-ink hover:bg-ink/5">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="font-serif text-3xl font-bold text-ink">Previous Records</h1>
      </div>

      <p className="text-xl text-ink/80 mb-8">
        Upload any previous prescriptions, lab reports, or discharge summaries.
      </p>

      <div 
        className="w-full border-2 border-dashed border-primary/40 bg-primary/5 rounded-3xl p-10 flex flex-col items-center justify-center text-center hover:bg-primary/10 transition-colors cursor-pointer mb-8"
        onClick={handleSimulateUpload}
      >
        <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-sm mb-6">
          <UploadCloud className="w-10 h-10 text-primary" />
        </div>
        <h3 className="text-2xl font-bold text-ink mb-2">Tap to scan or upload</h3>
        <p className="text-ink/60 text-lg">Use your camera or select files</p>
      </div>

      <div className="space-y-4 flex-1">
        <AnimatePresence>
          {docs.map((doc, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-surface border border-ink/5 p-4 rounded-2xl flex gap-4 items-start shadow-sm"
            >
              <div className="p-3 bg-primary/10 rounded-xl">
                <FileText className="w-8 h-8 text-primary" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-lg text-ink">{doc.name}</h4>
                  <button onClick={() => removeDoc(idx)} className="text-ink/40 hover:text-alert transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="bg-white p-3 rounded-xl border border-ink/5 text-sm text-ink/70">
                  {doc.text}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="pt-8 mt-auto">
        <button
          onClick={() => router.push("/patient/review")}
          className="w-full bg-primary hover:bg-primary-dark text-paper p-5 rounded-2xl text-xl font-semibold transition-colors active:scale-95 flex items-center justify-center gap-2"
        >
          {docs.length > 0 ? "Continue with Documents" : "Skip for now"}
        </button>
      </div>
    </div>
  );
}
