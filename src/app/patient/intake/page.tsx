"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const STAGES = [
  "Chief Complaint",
  "Past History",
  "Vitals & Lifestyle",
  "AYUSH Pariksha",
];

export default function IntakeFlow() {
  const router = useRouter();
  const [stageIndex, setStageIndex] = useState(0);
  const [complaint, setComplaint] = useState("");

  const handleNext = () => {
    if (stageIndex < STAGES.length - 1) {
      setStageIndex((prev) => prev + 1);
    } else {
      router.push("/patient/upload");
    }
  };

  const handleBack = () => {
    if (stageIndex > 0) {
      setStageIndex((prev) => prev - 1);
    } else {
      router.back();
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full animate-in fade-in duration-500">
      <div className="flex items-center justify-between mb-8">
        <div className="flex-1 flex justify-start">
          <button onClick={handleBack} className="flex items-center gap-2 px-5 min-h-[56px] bg-surface rounded-[1.75rem] text-ink font-bold hover:bg-ink/5 transition-colors">
            <ArrowLeft className="w-6 h-6" />
            <span>Back</span>
          </button>
        </div>
        <div className="flex gap-2">
          {STAGES.map((_, i) => (
            <div
              key={i}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === stageIndex ? "w-8 bg-primary" : i < stageIndex ? "w-4 bg-primary/40" : "w-4 bg-ink/10"
              }`}
            />
          ))}
        </div>
        <div className="flex-1" /> {/* Spacer for centering */}
      </div>

      <div className="flex-1 flex flex-col items-center max-w-2xl mx-auto w-full">
        <h2 className="text-sm font-bold text-gold tracking-widest mb-2">Step {stageIndex + 1} of {STAGES.length}</h2>
        <h1 className="font-serif text-3xl font-bold text-ink mb-8">{STAGES[stageIndex]}</h1>

        <div className="w-full bg-surface p-8 rounded-3xl border border-ink/5 shadow-sm min-h-[300px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={stageIndex}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              {stageIndex === 0 && (
                <div className="space-y-6">
                  <p className="text-xl text-ink/80">What is the main reason for your visit today?</p>
                  <textarea
                    value={complaint}
                    onChange={(e) => setComplaint(e.target.value)}
                    placeholder="e.g., I have been having a severe headache for the past 3 days..."
                    className="w-full bg-paper border-2 border-primary/20 rounded-2xl p-5 text-lg min-h-[150px] outline-none focus:border-primary resize-none"
                  />
                  {complaint.toLowerCase().includes("chest pain") && (
                    <div className="bg-alert/10 text-alert p-4 rounded-xl flex items-start gap-3">
                      <AlertTriangle className="w-6 h-6 shrink-0 mt-0.5" />
                      <p className="font-medium">Please inform the reception immediately. Chest pain requires urgent attention.</p>
                    </div>
                  )}
                </div>
              )}

              {stageIndex === 1 && (
                <div className="space-y-6">
                  <p className="text-xl text-ink/80">Do you have any ongoing medical conditions?</p>
                  <div className="grid grid-cols-2 gap-4">
                    {["Diabetes", "Hypertension", "Asthma", "Thyroid", "Arthritis", "None"].map((cond) => (
                      <button key={cond} className="p-4 rounded-xl border-2 border-surface bg-paper hover:border-primary/40 transition-colors text-lg font-medium text-ink">
                        {cond}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {stageIndex === 2 && (
                <div className="space-y-6">
                  <p className="text-xl text-ink/80">Select any lifestyle factors that apply to you:</p>
                  <div className="space-y-3">
                    {["Smoking", "Alcohol consumption", "Sedentary work", "Irregular sleep"].map((factor) => (
                      <label key={factor} className="flex items-center gap-4 p-4 rounded-xl border-2 border-surface bg-paper cursor-pointer hover:border-primary/40">
                        <input type="checkbox" className="w-6 h-6 rounded-md text-primary focus:ring-primary border-ink/20" />
                        <span className="text-lg font-medium text-ink">{factor}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {stageIndex === 3 && (
                <div className="space-y-6">
                  <p className="text-xl text-ink/80">How is your digestion and appetite usually?</p>
                  <div className="space-y-3">
                    {["Normal (Sama Agni)", "Irregular (Vishamagni)", "Intense/Sharp (Tikshnagni)", "Weak/Slow (Mandagni)"].map((agni) => (
                      <label key={agni} className="flex items-center gap-4 p-4 rounded-xl border-2 border-surface bg-paper cursor-pointer hover:border-primary/40">
                        <input type="radio" name="agni" className="w-6 h-6 text-primary focus:ring-primary border-ink/20" />
                        <span className="text-lg font-medium text-ink">{agni}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="mt-8 w-full">
          <button
            onClick={handleNext}
            className="w-full bg-primary hover:bg-primary-dark text-paper p-5 rounded-2xl text-xl font-semibold transition-colors flex items-center justify-center gap-2 active:scale-95"
          >
            {stageIndex === STAGES.length - 1 ? "Finish Questions" : "Continue"}
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
}
