"use client";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";

export default function DoctorLogin() {
  const router = useRouter();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    router.push("/doctor");
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="bg-surface p-8 sm:p-12 rounded-3xl w-full max-w-md border border-ink/5 shadow-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-primary" />
          </div>
          <h1 className="font-serif text-3xl font-bold text-ink">Physician Login</h1>
          <p className="text-ink/60 mt-2">Access patient queues and drafts.</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-ink mb-1.5 ml-1">Doctor ID</label>
            <input
              type="text"
              placeholder="Enter your ID"
              className="w-full bg-paper border-2 border-paper focus:border-primary focus:ring-0 rounded-xl p-4 outline-none transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink mb-1.5 ml-1">Password</label>
            <input
              type="password"
              placeholder="••••••••"
              className="w-full bg-paper border-2 border-paper focus:border-primary focus:ring-0 rounded-xl p-4 outline-none transition-colors"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-primary hover:bg-primary-dark text-paper p-4 rounded-xl text-lg font-semibold transition-colors mt-4"
          >
            Sign In
          </button>
        </form>
      </div>
    </div>
  );
}
