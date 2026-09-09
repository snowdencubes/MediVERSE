"use client";
import Link from "next/link";
import { Search, AlertCircle, Clock, ChevronRight } from "lucide-react";
import { MOCK_QUEUE } from "@/lib/mock-data";

export default function QueueDashboard() {
  const waitingPatients = MOCK_QUEUE.filter((p) => p.status === "waiting");

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="font-serif text-3xl font-bold text-ink">Patient Queue</h1>
          <p className="text-ink/60 mt-1">Review AI-drafted summaries before consulting.</p>
        </div>
        <div className="relative w-full sm:w-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-ink/40" />
          <input
            type="text"
            placeholder="Search patients..."
            className="w-full sm:w-64 glass-panel focus:border-primary focus:ring-0 rounded-xl py-2 pl-10 pr-4 outline-none transition-colors"
          />
        </div>
      </div>

      {/* Top Stat Cards (Glassmorphism) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="glass-panel p-5 rounded-2xl">
          <p className="text-sm font-semibold text-ink/60 mb-1">Waiting</p>
          <p className="text-3xl font-bold text-primary">{waitingPatients.length}</p>
        </div>
        <div className="glass-panel p-5 rounded-2xl">
          <p className="text-sm font-semibold text-ink/60 mb-1">Avg Wait Time</p>
          <p className="text-3xl font-bold text-ink">14m</p>
        </div>
        <div className="glass-panel p-5 rounded-2xl">
          <p className="text-sm font-semibold text-ink/60 mb-1">Red Flags</p>
          <p className="text-3xl font-bold text-alert">{waitingPatients.filter(p => p.redFlag).length}</p>
        </div>
      </div>

      <div className="grid gap-4">
        {waitingPatients.map((patient) => (
          <Link
            key={patient.id}
            href={`/doctor/patient/${patient.id}`}
            className={`glass-panel p-5 rounded-2xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm group ${
              patient.redFlag 
                ? "border-alert/30 hover:border-alert/50" 
                : "border-white/60 hover:border-primary/30"
            }`}
          >
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg shrink-0 ${
                patient.redFlag ? "bg-alert/10 text-alert" : "bg-primary/10 text-primary"
              }`}>
                {patient.name.charAt(0)}
              </div>
              <div>
                <h3 className="font-bold text-xl text-ink flex items-center gap-2">
                  {patient.name}
                  <span className="text-sm font-normal text-ink/60">{patient.age}y • {patient.gender}</span>
                </h3>
                <div className="flex flex-wrap items-center gap-3 mt-1 text-sm">
                  <span className="flex items-center gap-1 text-ink/60">
                    <Clock className="w-4 h-4" /> Wait: ~10m
                  </span>
                  <span className="text-ink/30">•</span>
                  <span className="text-ink/80 truncate max-w-[200px] sm:max-w-xs">
                    {patient.history.chiefComplaint}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
              {patient.redFlag && (
                <div className="flex items-center gap-1.5 text-alert bg-alert/5 px-3 py-1.5 rounded-lg text-sm font-medium">
                  <AlertCircle className="w-4 h-4" />
                  {patient.redFlag}
                </div>
              )}
              {!patient.redFlag && (
                <div className="text-sm font-medium text-gold bg-gold/10 px-3 py-1.5 rounded-lg">
                  Ready for review
                </div>
              )}
              <ChevronRight className="w-5 h-5 text-ink/30 group-hover:text-primary transition-colors hidden sm:block" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
