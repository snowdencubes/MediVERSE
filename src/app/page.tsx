"use client";
import Link from "next/link";
import { User, Stethoscope } from "lucide-react";
import { motion } from "framer-motion";

export default function Home() {
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.2 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100 } },
  };

  return (
    <div className="min-h-screen bg-[var(--paper)] text-[var(--ink)] font-sans flex flex-col items-center justify-center p-6 relative overflow-hidden">
      
      {/* Subtle Background Glows (Aceternity-style ambient light) */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-primary/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-gold/15 blur-[120px] rounded-full pointer-events-none" />

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="relative z-10 w-full max-w-2xl flex flex-col items-center"
      >
        <motion.div variants={itemVariants} className="text-center mb-12">
          <h1 className="font-serif text-5xl md:text-7xl font-bold text-primary mb-4 tracking-tight drop-shadow-sm">
            AyuLipi
          </h1>
          <p className="text-xl text-ink/70 max-w-md mx-auto">
            Patient Case-Taking System for AYUSH OPDs
          </p>
        </motion.div>

        <motion.div variants={itemVariants} className="grid sm:grid-cols-2 gap-6 w-full">
          <Link 
            href="/patient"
            className="bg-surface/80 backdrop-blur-md hover:bg-white border-2 border-primary/10 hover:border-primary/40 p-8 rounded-3xl flex flex-col items-center text-center transition-all duration-300 hover:shadow-xl hover:-translate-y-1 group relative overflow-hidden"
          >
            {/* Hover shine effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-[150%] group-hover:animate-[shimmer_1.5s_infinite] pointer-events-none" />
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-sm border border-primary/20">
              <User className="w-10 h-10 text-primary" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Patient Kiosk</h2>
            <p className="text-ink/60">Self-service intake, document upload, and AYUSH history.</p>
          </Link>

          <Link 
            href="/doctor/login"
            className="bg-surface/80 backdrop-blur-md hover:bg-white border-2 border-primary/10 hover:border-primary/40 p-8 rounded-3xl flex flex-col items-center text-center transition-all duration-300 hover:shadow-xl hover:-translate-y-1 group relative overflow-hidden"
          >
            {/* Hover shine effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-[150%] group-hover:animate-[shimmer_1.5s_infinite] pointer-events-none" />
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-sm border border-primary/20">
              <Stethoscope className="w-10 h-10 text-primary" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Doctor Portal</h2>
            <p className="text-ink/60">Review drafted summaries and manage patient queue.</p>
          </Link>
        </motion.div>
      </motion.div>
    </div>
  );
}
