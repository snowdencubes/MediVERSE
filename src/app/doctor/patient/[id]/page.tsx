"use client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Edit3, AlertTriangle, FileText } from "lucide-react";
import { MOCK_QUEUE } from "@/lib/mock-data";

export default function PatientSummary({ params }: { params: { id: string } }) {
  const router = useRouter();
  const patient = MOCK_QUEUE.find(p => p.id === params.id) || MOCK_QUEUE[0];
  
  // We mock the edit state to show it's editable
  const history = patient.history;

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-500 pb-20">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link href="/doctor" className="p-2 bg-surface rounded-full text-ink hover:bg-ink/5">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="font-serif text-2xl font-bold text-ink">{patient.name}</h1>
            <p className="text-ink/60 text-sm">{patient.age}y • {patient.gender} • ID: {patient.id}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-primary/10 text-primary px-3 py-1.5 rounded-lg text-sm font-semibold border border-primary/20 flex items-center gap-1.5">
            <Edit3 className="w-4 h-4" />
            AI Draft
          </div>
        </div>
      </div>

      {patient.redFlag && (
        <div className="bg-alert/10 border border-alert/20 p-4 rounded-xl flex items-start gap-3 mb-6">
          <AlertTriangle className="w-6 h-6 text-alert shrink-0" />
          <div>
            <h4 className="text-alert font-bold">System Flag: {patient.redFlag}</h4>
            <p className="text-alert/80 text-sm">Patient reported symptoms that may require urgent attention.</p>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Section title="Chief Complaint & HPI">
            <textarea
              className="w-full bg-transparent resize-none outline-none text-ink text-lg min-h-[80px]"
              value={history.chiefComplaint + "\n" + history.hpi}
              onChange={() => {}}
            />
          </Section>

          <div className="grid sm:grid-cols-2 gap-6">
            <Section title="Past Medical/Surgical">
              <textarea
                className="w-full bg-transparent resize-none outline-none text-ink text-sm min-h-[60px]"
                value={"Medical: " + history.pastMedical + "\nSurgical: " + history.pastSurgical}
                onChange={() => {}}
              />
            </Section>
            <Section title="Drugs & Allergies">
              <textarea
                className="w-full bg-transparent resize-none outline-none text-ink text-sm min-h-[60px]"
                value={history.drugsAndAllergies}
                onChange={() => {}}
              />
            </Section>
          </div>

          <Section title="AYUSH Pariksha (Drafted from Patient Input)">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-ink/50 block mb-1">Prakriti</span> <span className="font-medium">{history.ayush.prakriti}</span></div>
              <div><span className="text-ink/50 block mb-1">Vikriti</span> <span className="font-medium">{history.ayush.vikriti}</span></div>
              <div><span className="text-ink/50 block mb-1">Agni</span> <span className="font-medium">{history.ayush.agni}</span></div>
              <div><span className="text-ink/50 block mb-1">Koshtha</span> <span className="font-medium">{history.ayush.koshtha}</span></div>
            </div>
            <div className="mt-4 pt-4 border-t border-ink/5">
              <span className="text-ink/50 block mb-1 text-sm">Ahara-Vihara (Diet & Lifestyle)</span>
              <span className="font-medium text-sm">{history.ayush.aharaVihara}</span>
            </div>
          </Section>
        </div>

        <div className="space-y-6">
          <div className="bg-white/60 backdrop-blur-md shadow-[0_8px_32px_rgba(0,0,0,0.04)] rounded-2xl border border-white/60 p-5">
            <h3 className="font-serif font-bold text-ink mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Uploaded Documents
            </h3>
            {patient.documents.length === 0 ? (
              <p className="text-ink/40 text-sm">No documents uploaded.</p>
            ) : (
              <div className="space-y-4">
                {patient.documents.map(doc => (
                  <div key={doc.id} className="bg-white p-3 rounded-xl border border-ink/5">
                    <p className="font-medium text-sm text-ink mb-1 truncate">{doc.name}</p>
                    <p className="text-xs text-ink/40 mb-2">{doc.date}</p>
                    <div className={`p-2 rounded-lg text-xs ${doc.flagged ? 'bg-alert/5 text-alert border border-alert/20' : 'bg-surface text-ink/70'}`}>
                      <span className="font-semibold block mb-1">Extracted Text:</span>
                      {doc.extractedText}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 md:left-64 bg-white/70 backdrop-blur-xl border-t border-white/60 p-4 flex justify-end gap-4 z-10 shadow-[0_-8px_32px_rgba(0,0,0,0.04)]">
        <button className="px-6 py-3 rounded-xl font-medium text-ink bg-white/60 backdrop-blur-md border border-white/60 hover:bg-white/80 transition-colors shadow-sm">
          Request More Tests
        </button>
        <button
          onClick={() => router.push("/doctor")}
          className="px-6 py-3 rounded-xl font-bold text-white bg-primary hover:bg-primary-dark transition-colors flex items-center gap-2"
        >
          <CheckCircle2 className="w-5 h-5" />
          Confirm & Save Record
        </button>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string, children: React.ReactNode }) {
  return (
    <div className="bg-white/60 backdrop-blur-md rounded-2xl border border-white/60 shadow-[0_8px_32px_rgba(0,0,0,0.04)] p-5 focus-within:ring-2 ring-primary/20 transition-all">
      <h3 className="text-xs font-bold text-ink/50 mb-3 flex justify-between items-center">
        {title}
        <Edit3 className="w-3 h-3 opacity-50" />
      </h3>
      {children}
    </div>
  );
}
