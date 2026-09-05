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
      title={label}
      className="fixed bottom-6 right-6 z-40 w-14 h-14 bg-gold text-paper rounded-2xl shadow-lg flex items-center justify-center hover:brightness-110 transition-all active:scale-95"
      aria-label={label}
    >
      <Plus className="w-7 h-7" strokeWidth={2.5} />
    </button>
  );
}
