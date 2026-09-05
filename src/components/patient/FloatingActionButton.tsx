"use client";
import { Plus } from "lucide-react";

interface FloatingActionButtonProps {
  onClick: () => void;
  label?: string;
}

export default function FloatingActionButton({
  onClick,
  label = "Add",
}: FloatingActionButtonProps) {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-6 right-6 z-40 min-h-[56px] px-6 bg-gold text-paper rounded-[1.75rem] shadow-lg flex items-center justify-center gap-2 hover:brightness-110 transition-all active:scale-95"
    >
      <Plus className="w-6 h-6" strokeWidth={2.5} />
      <span className="font-bold text-lg tracking-wide">{label}</span>
    </button>
  );
}
