"use client";
import { useRouter } from "next/navigation";
import { CheckCircle2, Home } from "lucide-react";

export default function SubmittedPage() {
  const router = useRouter();

  // Optionally auto-redirect after some time in a real kiosk, 
  // but we'll leave a button for manual reset for demo purposes.

  return (
    <div className="flex-1 flex flex-col items-center justify-center space-y-8 animate-in zoom-in-95 duration-700 max-w-lg mx-auto w-full text-center">
      <div className="w-32 h-32 bg-primary/10 rounded-full flex items-center justify-center mb-4">
        <CheckCircle2 className="w-16 h-16 text-primary" />
      </div>
      
      <h1 className="font-serif text-4xl font-bold text-ink tracking-tight">
        You&apos;re All Set!
      </h1>
      
      <p className="text-xl text-ink/80 leading-relaxed max-w-sm">
        Your health summary has been securely sent to your doctor. 
        <br/><br/>
        Please wait in the reception area until your name is called.
      </p>

      <div className="pt-12 w-full">
        <button
          onClick={() => router.push("/patient")}
          className="w-full bg-surface hover:bg-ink/5 border-2 border-surface text-ink p-5 rounded-2xl text-xl font-semibold transition-colors active:scale-95 flex items-center justify-center gap-3"
        >
          <Home className="w-5 h-5" />
          Return to Home
        </button>
      </div>
    </div>
  );
}
