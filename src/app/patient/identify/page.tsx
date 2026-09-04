"use client";
import { useRouter } from "next/navigation";
import { User, Phone, Scan } from "lucide-react";

export default function IdentifyPage() {
  const router = useRouter();

  const handleContinue = () => {
    router.push("/patient/consent");
  };

  return (
    <div className="flex-1 flex flex-col space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-lg mx-auto w-full pt-12">
      <div className="space-y-2">
        <h1 className="font-serif text-3xl font-bold text-ink">Patient Details</h1>
        <p className="text-ink/70">Enter your details or scan your ABHA ID card.</p>
      </div>

      <div className="space-y-6">
        <button className="w-full border-2 border-dashed border-primary/40 bg-primary/5 hover:bg-primary/10 transition-colors p-8 rounded-2xl flex flex-col items-center justify-center space-y-4 group">
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
            <Scan className="w-8 h-8 text-primary" />
          </div>
          <div className="text-center">
            <div className="font-medium text-lg text-ink">Scan ABHA ID</div>
            <div className="text-sm text-ink/60">Fastest way to register</div>
          </div>
        </button>

        <div className="relative flex items-center py-4">
          <div className="flex-grow border-t border-ink/10"></div>
          <span className="flex-shrink-0 mx-4 text-ink/40 text-sm font-medium">OR ENTER MANUALLY</span>
          <div className="flex-grow border-t border-ink/10"></div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-ink mb-1.5 ml-1">Full Name</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-ink/40" />
              <input
                type="text"
                placeholder="e.g. Ramesh Kumar"
                className="w-full bg-surface border-2 border-surface focus:border-primary focus:ring-0 rounded-xl p-4 pl-12 outline-none transition-colors text-lg"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-ink mb-1.5 ml-1">Phone Number</label>
            <div className="relative">
              <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-ink/40" />
              <input
                type="tel"
                placeholder="10-digit mobile number"
                className="w-full bg-surface border-2 border-surface focus:border-primary focus:ring-0 rounded-xl p-4 pl-12 outline-none transition-colors text-lg"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="pt-8">
        <button
          onClick={handleContinue}
          className="w-full bg-primary hover:bg-primary-dark text-paper p-5 rounded-2xl text-xl font-semibold transition-colors active:scale-95"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
