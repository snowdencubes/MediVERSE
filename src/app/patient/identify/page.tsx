"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { User, Phone, Scan, Briefcase, Shield, ChevronDown, ChevronUp } from "lucide-react";

const PROFESSION_OPTIONS = [
  "Student",
  "Senior Citizen",
  "Government Employee",
  "General Public",
  "Other",
];

export default function IdentifyPage() {
  const router = useRouter();
  const [profession, setProfession] = useState("");
  const [showInsurance, setShowInsurance] = useState(false);
  const [insuranceScheme, setInsuranceScheme] = useState("");
  const [insurancePolicyId, setInsurancePolicyId] = useState("");

  const handleContinue = () => {
    router.push("/patient/consent");
  };

  return (
    <div className="flex-1 flex flex-col space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-lg mx-auto w-full pt-12 pb-24">
      <div className="space-y-2">
        <h1 className="font-serif text-3xl font-bold text-ink">Patient Details</h1>
        <p className="text-ink/70">Enter your details or scan your ABHA ID card.</p>
      </div>

      <div className="space-y-6">
        {/* ABHA Scan */}
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
          {/* Full Name */}
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

          {/* Phone Number */}
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

          {/* Profession Selector */}
          <div>
            <label className="block text-sm font-medium text-ink mb-1.5 ml-1">
              Profession
              <span className="text-ink/40 ml-1 font-normal">(for concession eligibility)</span>
            </label>
            <div className="relative">
              <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-ink/40" />
              <select
                value={profession}
                onChange={(e) => setProfession(e.target.value)}
                className="w-full bg-surface border-2 border-surface focus:border-primary focus:ring-0 rounded-xl p-4 pl-12 outline-none transition-colors text-lg appearance-none cursor-pointer"
              >
                <option value="">Select profession</option>
                {PROFESSION_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-ink/40 pointer-events-none" />
            </div>
          </div>

          {/* Insurance (Optional, Collapsible) */}
          <div className="border-2 border-surface rounded-2xl overflow-hidden">
            <button
              type="button"
              onClick={() => setShowInsurance(!showInsurance)}
              className="w-full flex items-center justify-between p-4 bg-surface hover:bg-ink/5 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Shield className="w-5 h-5 text-ink/40" />
                <span className="font-medium text-ink">Insurance Info</span>
                <span className="text-xs text-ink/40 bg-paper px-2 py-0.5 rounded-full">Optional</span>
              </div>
              {showInsurance ? (
                <ChevronUp className="w-5 h-5 text-ink/40" />
              ) : (
                <ChevronDown className="w-5 h-5 text-ink/40" />
              )}
            </button>

            {showInsurance && (
              <div className="p-4 space-y-4 bg-paper border-t border-ink/5">
                <div>
                  <label className="block text-sm font-medium text-ink mb-1.5 ml-1">
                    Scheme / Insurer Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Ayushman Bharat, Star Health"
                    value={insuranceScheme}
                    onChange={(e) => setInsuranceScheme(e.target.value)}
                    className="w-full bg-surface border-2 border-surface focus:border-primary focus:ring-0 rounded-xl p-4 outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink mb-1.5 ml-1">
                    Policy / ID Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. AB-PM-JAY-12345678"
                    value={insurancePolicyId}
                    onChange={(e) => setInsurancePolicyId(e.target.value)}
                    className="w-full bg-surface border-2 border-surface focus:border-primary focus:ring-0 rounded-xl p-4 outline-none transition-colors"
                  />
                </div>
                <p className="text-xs text-ink/40 ml-1">
                  This is optional. You can always skip and provide it later.
                </p>
              </div>
            )}
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
