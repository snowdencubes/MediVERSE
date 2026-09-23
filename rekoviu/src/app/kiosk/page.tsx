'use client';

import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { MediVERSENav } from '@/components/common/MediVERSENav';
import { PatientIdentity } from '@/components/kiosk/PatientIdentity';
import { CategoryNav } from '@/components/kiosk/CategoryNav';
import { DoctorCard } from '@/components/kiosk/DoctorCard';
import { ComboCart } from '@/components/kiosk/ComboCart';
import { VitalsPicker } from '@/components/kiosk/VitalsPicker';
import { TicketModal } from '@/components/kiosk/TicketModal';
import { Department, Doctor, HealthComboPackage, VitalsInput, QueueTicket } from '@/types';
import { fetchDepartments, fetchDoctors, fetchHealthCombos, createTicket, logSessionEvent } from '@/services/api';

class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, error: any}> {
  constructor(props: any) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error: any) { return { hasError: true, error }; }
  render() {
    if (this.state.hasError) return <div style={{padding: 20, color: 'red'}}>UI Error: {this.state.error?.message}</div>;
    return this.props.children;
  }
}

// Wrap with Suspense because useSearchParams() requires it in App Router
export default function KioskPageWrapper() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>Loading...</div>}>
      <KioskPage />
    </Suspense>
  );
}

function KioskPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState<number>(1);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [combos, setCombos] = useState<HealthComboPackage[]>([]);

  // Step 1: Patient Identity
  const [patientName, setPatientName] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  
  // Step 2: Department
  const [selectedDepId, setSelectedDepId] = useState<string | null>(null);
  
  // Step 3: Doctor & Cart
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [selectedCombos, setSelectedCombos] = useState<string[]>([]);
  
  // Step 4: Vitals
  const [vitals, setVitals] = useState<VitalsInput>({
    systolic_bp: 120, diastolic_bp: 80, heart_rate: 75,
    temperature_c: 36.8, pain_score: 0, symptoms: []
  });

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false); // tracks ticket creation specifically
  const [ticket, setTicket] = useState<QueueTicket | null>(null);

  // ── Session ID: read from URL or generate new one, then stamp it in the URL ──
  const sessionId = useRef<string>('');
  useEffect(() => {
    const existing = searchParams?.get('session');
    if (existing) {
      sessionId.current = existing;
    } else {
      const newId = typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `kiosk-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      sessionId.current = newId;
      // Stamp the session ID into the URL without a page reload
      router.replace(`/kiosk?session=${newId}`, { scroll: false });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Gesture: pinch-to-zoom + touch drag scroll ─────────────────────────────
  const scrollRef = useRef<HTMLDivElement>(null);
  const pinchRef = useRef<{ dist: number; scale: number } | null>(null);
  const [scale, setScale] = useState(1);

  const getTouchDist = (t: React.TouchList) =>
    Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      pinchRef.current = { dist: getTouchDist(e.touches), scale };
    }
  }, [scale]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinchRef.current) {
      const newDist = getTouchDist(e.touches);
      const ratio = newDist / pinchRef.current.dist;
      const next = Math.min(2.5, Math.max(0.6, pinchRef.current.scale * ratio));
      setScale(next);
      e.preventDefault();
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    pinchRef.current = null;
    // Snap scale back to 1 if very close
    setScale(s => (Math.abs(s - 1) < 0.08 ? 1 : s));
  }, []);

  useEffect(() => {
    async function loadCatalog() {
      const deps = await fetchDepartments();
      const docs = await fetchDoctors();
      const cmbs = await fetchHealthCombos();
      setDepartments(deps);
      setDoctors(docs);
      setCombos(cmbs);
      setLoading(false);

      const intentDept = localStorage.getItem('voice_intent_dept');
      const intentIssue = localStorage.getItem('voice_intent_issue');
      const intentEmergency = localStorage.getItem('voice_intent_emergency') === 'true';
      const whatsappPhone = localStorage.getItem('whatsapp_phone');
      const telName = localStorage.getItem('telegram_name');
      const telSymptoms = localStorage.getItem('telegram_symptoms');

      if (whatsappPhone) {
        setPatientPhone(whatsappPhone);
        localStorage.removeItem('whatsapp_phone');
      }
      if (telName) {
        setPatientName(telName);
        localStorage.removeItem('telegram_name');
      }
      if (telSymptoms) {
        setVitals(v => ({ ...v, symptoms: [telSymptoms] }));
        localStorage.removeItem('telegram_symptoms');
      }

      if (intentDept) {
        setSelectedDepId(intentDept);
        localStorage.removeItem('voice_intent_dept');
        
        if (intentIssue) {
          setVitals(v => ({ ...v, symptoms: [intentIssue] }));
          localStorage.removeItem('voice_intent_issue');
        }
        if (intentEmergency) {
          setVitals(v => ({ ...v, pain_score: 9 }));
          localStorage.removeItem('voice_intent_emergency');
        }
      }
    }
    loadCatalog();
  }, []);

  const handleNext = async () => {
    if (step === 1 && (!patientName || !patientPhone)) return;
    if (step === 2 && !selectedDepId) return;
    if (submitting) return; // prevent double-click

    // Log step transitions
    logSessionEvent({
      session_id: sessionId.current,
      event_type: 'navigate',
      page: '/kiosk',
      element: `step-${step}-next`,
      extra: { from_step: step, to_step: step === 4 ? 5 : step + 1 },
    });

    if (step === 4) {
      setSubmitting(true);
      try {
        const newTicket = await createTicket({
          department_id: selectedDepId!,
          doctor_id: selectedDocId || undefined,
          combo_package_ids: selectedCombos,
          vitals: vitals,
          patient: {
            national_id: "ID-" + Math.floor(Math.random() * 1000000),
            full_name: patientName,
            phone: patientPhone,
            age: 35,
            gender: "Unknown",
            insurance_member: false
          },
          payment_method: "EXPRESS_KIOSK"
        });
        setTicket(newTicket);
        logSessionEvent({
          session_id: sessionId.current,
          event_type: 'submit',
          page: '/kiosk',
          element: 'create-ticket',
          value: newTicket.token_number,
          extra: { ticket_id: newTicket.ticket_id, department: newTicket.department_name, patient: patientName },
        });
        setStep(5);
      } catch (err) {
        console.error(err);
      } finally {
        setSubmitting(false);
      }
      return;
    }
    // Instant transition for steps 1-3
    setStep(s => s + 1);
  };

  // Skip vitals — immediately proceed to ticket creation with current (default) vitals
  const handleSkipVitals = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const newTicket = await createTicket({
        department_id: selectedDepId!,
        doctor_id: selectedDocId || undefined,
        combo_package_ids: selectedCombos,
        vitals: { systolic_bp: 0, diastolic_bp: 0, heart_rate: 0, temperature_c: 0, pain_score: 0, symptoms: [] },
        patient: {
          national_id: "ID-" + Math.floor(Math.random() * 1000000),
          full_name: patientName,
          phone: patientPhone,
          age: 35,
          gender: "Unknown",
          insurance_member: false
        },
        payment_method: "EXPRESS_KIOSK"
      });
      setTicket(newTicket);
      setStep(5);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleBack = () => {
    if (step === 1) {
      router.push('/');
    } else {
      setStep(s => s - 1);
    }
  };

  const toggleCombo = (id: string) => {
    setSelectedCombos(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const handleIdentityChange = (field: 'name' | 'phone', val: string) => {
    if (field === 'name') setPatientName(val);
    else setPatientPhone(val);
    // Log input changes (debounce-free, fires on every change but non-blocking)
    logSessionEvent({
      session_id: sessionId.current,
      event_type: 'input',
      page: '/kiosk',
      element: `patient-${field}`,
      value: field === 'phone' ? '***' : val, // mask phone for privacy
    });
  };

  const getFilteredDoctors = () => {
    if (!selectedDepId) return [];
    return doctors.filter(d => d.department_id === selectedDepId);
  };

  const getBaseFee = () => {
    if (selectedDocId) {
      const doc = doctors.find(d => d.id === selectedDocId);
      return doc ? doc.consultation_fee : 35;
    }
    return 35;
  };

  if (loading && step === 1) {
    return (
      <main style={{
        position: 'relative', zIndex: 10, minHeight: '100vh',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
      }}>
        <div style={{
          width: 48, height: 48, border: '3px solid var(--border-color)',
          borderTopColor: '#D91636', borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <p style={{ fontFamily: "'Space Grotesk'", fontSize: 'clamp(16px, 1.7vw, 20px)', color: 'var(--text-secondary)', marginTop: 16 }}>Loading Kiosk System...</p>
      </main>
    );
  }

  return (
    <ErrorBoundary>
      <MediVERSENav currentModule="kiosk" />
      <main style={{
        position: 'relative', zIndex: 10, height: '100vh',
        display: 'flex', flexDirection: 'column', paddingTop: 80
      }}>

        <div
          ref={scrollRef}
          style={{ flex: 1, overflowY: 'auto', padding: '24px 32px', touchAction: 'pan-y pinch-zoom' }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div style={{
            maxWidth: 900, margin: '0 auto', paddingBottom: 40,
            transform: `scale(${scale})`, transformOrigin: 'top center',
            transition: pinchRef.current ? 'none' : 'transform 0.2s ease'
          }}>

            {/* Session ID — minimal pill, no banner text */}
            {sessionId.current && (
              <div style={{
                fontFamily: "'Space Grotesk', monospace", fontSize: 11,
                color: 'rgba(255,255,255,0.25)',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 20, padding: '3px 10px',
                letterSpacing: '.04em', marginBottom: 10, display: 'inline-block'
              }}>
                SESSION: {sessionId.current.slice(0, 8).toUpperCase()}
              </div>
            )}

            {/* Progress Steps */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 16, flexWrap: 'wrap', marginBottom: 40 }}>
              {[1, 2, 3, 4].map(s => (
                <div key={s} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 60 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: "'Space Grotesk'", fontSize: 'clamp(16px, 1.7vw, 20px)', fontWeight: 700,
                    background: step === s ? '#D91636' : step > s ? 'var(--bg-hover)' : 'var(--bg-card)',
                    color: step === s ? '#fff' : 'var(--text-primary)',
                    border: step === s ? '2px solid #D91636' : '1px solid var(--border-color)'
                  }}>
                    {step > s ? '\u2713' : s}
                  </div>
                  <span style={{
                    fontFamily: "'Space Grotesk'", fontSize: 'clamp(12px, 1.2vw, 16px)', marginTop: 6,
                    color: step >= s ? 'var(--text-primary)' : 'var(--text-secondary)',
                    letterSpacing: '.05em', textAlign: 'center'
                  }}>
                    {s === 1 ? 'Identity' : s === 2 ? 'Service' : s === 3 ? 'Doctor' : 'Vitals'}
                  </span>
                </div>
              ))}
            </div>

            {/* Step 1: Identity */}
            {step === 1 && (
              <div style={{ width: '100%' }}>
                <PatientIdentity name={patientName} phone={patientPhone} onChange={handleIdentityChange} />
              </div>
            )}

            {/* Step 2: Department */}
            {step === 2 && (
              <div>
                <div style={{ textAlign: 'center', marginBottom: 32 }}>
                  <h1 style={{ fontFamily: "'Bebas Neue'", fontSize: 40, color: 'var(--text-primary)', letterSpacing: '.06em' }}>SELECT A SERVICE</h1>
                  <p style={{ fontFamily: "'Space Grotesk'", fontSize: 'clamp(15px, 1.6vw, 19px)', color: 'var(--text-secondary)', marginTop: 8 }}>Choose the medical department you need today.</p>
                </div>
                <CategoryNav departments={departments} selectedId={selectedDepId} onSelect={setSelectedDepId} />
              </div>
            )}

            {/* Step 3: Doctor & Cart */}
            {step === 3 && (
              <div className="MediVERSE-responsive-grid">
                <div style={{ flex: '1 1 500px' }}>
                  <h2 style={{ fontFamily: "'Bebas Neue'", fontSize: 28, color: 'var(--text-primary)', letterSpacing: '.06em', marginBottom: 4 }}>SELECT A DOCTOR</h2>
                  <p style={{ fontFamily: "'Space Grotesk'", fontSize: 'clamp(14px, 1.4vw, 18px)', color: 'var(--text-secondary)', marginBottom: 20 }}>Or proceed with the next available specialist.</p>

                  <button
                    onClick={() => setSelectedDocId(null)}
                    style={{
                      width: '100%', padding: '14px 20px', textAlign: 'left',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      background: selectedDocId === null ? 'rgba(255,45,85,.08)' : 'var(--bg-card)',
                      border: `1px solid ${selectedDocId === null ? 'rgba(255,45,85,.3)' : 'var(--border-color)'}`,
                      color: 'var(--text-primary)', fontFamily: "'Space Grotesk'", fontSize: 'clamp(15px, 1.6vw, 19px)', fontWeight: 700,
                      cursor: 'pointer', marginBottom: 12
                    }}
                  >
                    <span>Next Available Duty Specialist</span>
                    <span style={{ fontSize: 'clamp(13px, 1.3vw, 17px)', color: 'var(--text-secondary)' }}>Wait: ~5m</span>
                  </button>

                  {getFilteredDoctors().map(doc => (
                    <DoctorCard key={doc.id} doctor={doc} isSelected={selectedDocId === doc.id} onSelect={setSelectedDocId} />
                  ))}
                </div>
                <div style={{ flex: '1 1 300px' }}>
                  <ComboCart combos={combos} selectedComboIds={selectedCombos} onToggleCombo={toggleCombo} baseFee={getBaseFee()} />
                </div>
              </div>
            )}

            {/* Step 4: Vitals */}
            {step === 4 && (
              <div style={{ maxWidth: 600, margin: '0 auto' }}>
                <div style={{ textAlign: 'center', marginBottom: 32 }}>
                  <h1 style={{ fontFamily: "'Bebas Neue'", fontSize: 40, color: 'var(--text-primary)', letterSpacing: '.06em' }}>EXPRESS TRIAGE</h1>
                  <p style={{ fontFamily: "'Space Grotesk'", fontSize: 'clamp(15px, 1.6vw, 19px)', color: 'var(--text-secondary)', marginTop: 8 }}>Help us prioritize your care by entering your current vitals.</p>
                </div>
                <VitalsPicker vitals={vitals} onChange={setVitals} />
              </div>
            )}
          </div>
        </div>

        {/* Bottom Nav */}
        {step < 5 && (
          <div style={{
            padding: '16px 32px', borderTop: '1px solid var(--border-color)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            background: 'var(--bg-main)', backdropFilter: 'blur(12px)',
            flexShrink: 0
          }}>
            <button onClick={handleBack} disabled={submitting} style={{
              padding: '12px 24px', background: 'none', border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
              fontFamily: "'Space Grotesk'", fontSize: 'clamp(14px, 1.4vw, 18px)', fontWeight: 700,
              letterSpacing: '.1em', textTransform: 'uppercase', cursor: submitting ? 'not-allowed' : 'pointer',
              opacity: submitting ? 0.4 : 1,
              transition: 'all 0.2s'
            }}
            onMouseEnter={e => { if (!submitting) { e.currentTarget.style.borderColor = '#D91636'; e.currentTarget.style.color = '#D91636'; }}}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
            >{step === 1 ? '<- HOME' : '<- BACK'}</button>

            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              {/* SKIP VITALS — only on step 4 */}
              {step === 4 && (
                <button
                  onClick={handleSkipVitals}
                  disabled={submitting}
                  style={{
                    padding: '14px 28px',
                    background: submitting ? 'rgba(255,255,255,0.03)' : 'transparent',
                    border: '1px solid rgba(255,255,255,0.2)',
                    color: submitting ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.5)',
                    fontFamily: "'Space Grotesk'", fontSize: 'clamp(13px, 1.3vw, 16px)', fontWeight: 700,
                    letterSpacing: '.08em', textTransform: 'uppercase',
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    transition: 'all 0.15s',
                    display: 'flex', alignItems: 'center', gap: 8,
                  }}
                >
                  {submitting ? (
                    <>
                      <span style={{
                        width: 14, height: 14, border: '2px solid rgba(255,255,255,0.2)',
                        borderTopColor: 'rgba(255,255,255,0.6)', borderRadius: '50%',
                        display: 'inline-block', animation: 'spin 0.8s linear infinite'
                      }} />
                      PROCESSING...
                    </>
                  ) : 'SKIP VITALS'}
                </button>
              )}

              <button
                onClick={handleNext}
                disabled={(step === 1 && (!patientName || !patientPhone)) || (step === 2 && !selectedDepId) || submitting}
                style={{
                  padding: '14px 40px', background: submitting ? 'rgba(180,10,35,0.7)' : '#D91636',
                  border: 'none',
                  color: '#fff', fontFamily: "'Space Grotesk'", fontSize: 'clamp(16px, 1.7vw, 20px)', fontWeight: 700,
                  letterSpacing: '.1em', textTransform: 'uppercase',
                  cursor: ((step === 1 && (!patientName || !patientPhone)) || (step === 2 && !selectedDepId) || submitting) ? 'not-allowed' : 'pointer',
                  opacity: ((step === 1 && (!patientName || !patientPhone)) || (step === 2 && !selectedDepId)) ? 0.4 : 1,
                  transition: 'all 0.15s',
                  display: 'flex', alignItems: 'center', gap: 10,
                  minWidth: 180, justifyContent: 'center',
                }}
              >
                {submitting ? (
                  <>
                    <span style={{
                      width: 18, height: 18, border: '2.5px solid rgba(255,255,255,0.3)',
                      borderTopColor: '#fff', borderRadius: '50%',
                      display: 'inline-block', animation: 'spin 0.8s linear infinite',
                      flexShrink: 0
                    }} />
                    GENERATING TICKET...
                  </>
                ) : (
                  step === 4 ? 'COMPLETE CHECK-IN' : 'CONTINUE ->'
                )}
              </button>
            </div>
          </div>
        )}

        {/* Ticket Modal */}
        {step === 5 && (
          <TicketModal ticket={ticket} onClose={() => {
            setStep(1); setPatientName(''); setPatientPhone(''); setSelectedDepId(null); setSelectedDocId(null);
            setSelectedCombos([]); setTicket(null);
          }} />
        )}
      </main>
    </ErrorBoundary>
  );
}

