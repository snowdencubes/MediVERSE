"use client";
import { useState } from "react";
import { HandHelping, X, Globe, BookOpen, Accessibility } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const CARE_NEEDS = [
  { id: "translator", label: "I need a translator", icon: Globe },
  { id: "reader", label: "I need someone to read for me", icon: BookOpen },
  { id: "mobility", label: "I need mobility assistance", icon: Accessibility },
];

export default function CustomCareButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);

  const toggleNeed = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const handleSubmit = () => {
    // TODO: Send to Supabase so staff can see
    setSubmitted(true);
    setTimeout(() => {
      setIsOpen(false);
      setTimeout(() => setSubmitted(false), 300);
    }, 1500);
  };

  return (
    <>
      {/* Persistent trigger — top-right, always visible on patient screens */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed top-4 right-4 z-40 flex items-center gap-2 px-5 min-h-[56px] bg-gold/10 text-gold border-2 border-gold/20 rounded-full text-base font-bold hover:bg-gold/20 transition-colors"
        aria-label="Need Help?"
      >
        <HandHelping className="w-6 h-6" />
        <span>Need Help?</span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-ink/20 backdrop-blur-sm z-[60]"
              onClick={() => setIsOpen(false)}
            />

            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="fixed top-16 right-4 w-80 max-w-[calc(100vw-2rem)] bg-surface rounded-2xl shadow-2xl border border-ink/5 z-[70] overflow-hidden"
            >
              <div className="flex items-center justify-between p-4 border-b border-ink/5">
                <h3 className="font-semibold text-ink text-lg">Custom Care</h3>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-lg text-ink/40 hover:bg-ink/5"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {!submitted ? (
                <div className="p-4 space-y-3">
                  <p className="text-sm text-ink/60 mb-4">
                    Let us know if you need any special assistance:
                  </p>
                  {CARE_NEEDS.map((need) => {
                    const isSelected = selected.includes(need.id);
                    return (
                      <button
                        key={need.id}
                        onClick={() => toggleNeed(need.id)}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-colors text-left ${
                          isSelected
                            ? "border-primary bg-primary/5 text-primary"
                            : "border-surface bg-paper text-ink hover:border-primary/30"
                        }`}
                      >
                        <need.icon className="w-5 h-5 shrink-0" />
                        <span className="font-medium">{need.label}</span>
                      </button>
                    );
                  })}
                  <button
                    onClick={handleSubmit}
                    disabled={selected.length === 0}
                    className="w-full bg-primary hover:bg-primary-dark disabled:opacity-40 text-paper p-3 rounded-xl font-semibold transition-colors mt-2"
                  >
                    Notify Staff
                  </button>
                </div>
              ) : (
                <div className="p-6 text-center space-y-2">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                    <HandHelping className="w-6 h-6 text-primary" />
                  </div>
                  <p className="font-semibold text-ink">Staff has been notified!</p>
                  <p className="text-sm text-ink/60">Someone will assist you shortly.</p>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
