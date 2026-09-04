import Link from "next/link";
import { User, Stethoscope } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-[var(--paper)] text-[var(--ink)] font-sans flex flex-col items-center justify-center p-6 animate-in fade-in duration-700">
      <div className="text-center mb-12">
        <h1 className="font-serif text-5xl font-bold text-primary mb-4">AyuLipi</h1>
        <p className="text-xl text-ink/70 max-w-md mx-auto">
          Patient Case-Taking System for AYUSH OPDs
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-6 w-full max-w-2xl">
        <Link 
          href="/patient"
          className="bg-surface hover:bg-white border-2 border-primary/20 hover:border-primary p-8 rounded-3xl flex flex-col items-center text-center transition-all hover:shadow-lg group"
        >
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
            <User className="w-10 h-10 text-primary" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Patient Kiosk</h2>
          <p className="text-ink/60">Self-service intake, document upload, and AYUSH history.</p>
        </Link>

        <Link 
          href="/doctor/login"
          className="bg-surface hover:bg-white border-2 border-primary/20 hover:border-primary p-8 rounded-3xl flex flex-col items-center text-center transition-all hover:shadow-lg group"
        >
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
            <Stethoscope className="w-10 h-10 text-primary" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Doctor Portal</h2>
          <p className="text-ink/60">Review drafted summaries and manage patient queue.</p>
        </Link>
      </div>
    </div>
  );
}
