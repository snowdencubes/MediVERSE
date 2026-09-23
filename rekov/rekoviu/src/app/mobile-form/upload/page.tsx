'use client';

import React, { useState, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4040/api/v1';

const DOC_TYPES = [
  { id: 'prescription', label: '💊 Previous Prescription', icon: '💊' },
  { id: 'insurance', label: '🏥 Insurance Card / Policy', icon: '🏥' },
  { id: 'id_proof', label: '🪪 Government ID (Aadhaar, PAN)', icon: '🪪' },
  { id: 'lab_report', label: '🧪 Lab Report / Test Results', icon: '🧪' },
  { id: 'xray', label: '🩻 X-Ray / Scan / MRI', icon: '🩻' },
  { id: 'other', label: '📄 Other Document', icon: '📄' },
];

interface UploadedDoc {
  name: string;
  url: string;
  type: string;
  icon: string;
}

function UploadContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams?.get('session');
  const fileRef = useRef<HTMLInputElement>(null);

  const [selectedType, setSelectedType] = useState('prescription');
  const [uploads, setUploads] = useState<UploadedDoc[]>([]);
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const uploadFile = async (file: File) => {
    if (!sessionId) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('doc_type', selectedType);
      const res = await fetch(`${API_URL}/sessions/${sessionId}/upload`, {
        method: 'POST',
        body: fd,
      });
      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      const docType = DOC_TYPES.find(d => d.id === selectedType);
      setUploads(prev => [...prev, {
        name: data.name,
        url: data.url,
        type: selectedType,
        icon: docType?.icon || '📄',
      }]);
    } catch (e) {
      alert('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) uploadFile(file);
  };

  if (done) {
    return (
      <div style={{
        minHeight: '100vh', background: '#0a0a0f', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center'
      }}>
        <div style={{ fontSize: 72, marginBottom: 20 }}>✅</div>
        <h1 style={{ fontFamily: "'Bebas Neue'", fontSize: 40, color: '#30d158', letterSpacing: '.06em', marginBottom: 8 }}>
          ALL DONE!
        </h1>
        <p style={{ fontFamily: "'Space Grotesk'", color: '#888', fontSize: 16, maxWidth: 300, lineHeight: 1.6, marginBottom: 24 }}>
          Your registration is complete. Please proceed to the waiting area. The kiosk has your details ready.
        </p>
        {uploads.length > 0 && (
          <div style={{
            background: 'rgba(48,209,88,0.08)', border: '1px solid rgba(48,209,88,0.3)',
            borderRadius: 12, padding: '12px 20px', marginBottom: 24
          }}>
            <p style={{ fontFamily: "'Space Grotesk'", color: '#30d158', fontSize: 13, fontWeight: 700 }}>
              {uploads.length} document{uploads.length > 1 ? 's' : ''} uploaded successfully
            </p>
          </div>
        )}
        <p style={{ fontFamily: "'Space Grotesk'", color: '#555', fontSize: 12 }}>
          You may close this tab.
        </p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', color: '#fff', overflowY: 'auto' }}>

      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        padding: '28px 24px 20px',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: 36, marginBottom: 8 }}>📁</div>
        <h1 style={{ fontFamily: "'Bebas Neue'", fontSize: 28, letterSpacing: '.08em', margin: '0 0 4px', color: '#fff' }}>
          UPLOAD DOCUMENTS
        </h1>
        <p style={{ fontFamily: "'Space Grotesk'", fontSize: 12, color: '#888', margin: 0 }}>
          Optional — Upload previous records to help your doctor
        </p>
      </div>

      <div style={{ padding: '24px 20px', maxWidth: 480, margin: '0 auto' }}>

        {/* Document Type Selector */}
        <div style={{ marginBottom: 20 }}>
          <p style={{ fontFamily: "'Space Grotesk'", fontSize: 12, color: '#999', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 12 }}>
            Document Type
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {DOC_TYPES.map(t => (
              <button
                key={t.id}
                onClick={() => setSelectedType(t.id)}
                style={{
                  padding: '10px 12px', border: `1px solid ${selectedType === t.id ? '#D91636' : 'rgba(255,255,255,0.1)'}`,
                  background: selectedType === t.id ? 'rgba(217,22,54,0.1)' : 'rgba(255,255,255,0.03)',
                  borderRadius: 10, color: selectedType === t.id ? '#D91636' : '#aaa',
                  fontFamily: "'Space Grotesk'", fontSize: 12, fontWeight: 700, cursor: 'pointer',
                  textAlign: 'left', transition: 'all 0.15s',
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Drop Zone */}
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => !uploading && fileRef.current?.click()}
          style={{
            border: `2px dashed ${dragOver ? '#D91636' : uploading ? '#30d158' : 'rgba(255,255,255,0.15)'}`,
            borderRadius: 16, padding: '36px 20px', textAlign: 'center',
            background: dragOver ? 'rgba(217,22,54,0.06)' : 'rgba(255,255,255,0.02)',
            cursor: uploading ? 'wait' : 'pointer',
            transition: 'all 0.2s', marginBottom: 20,
          }}
        >
          <input
            ref={fileRef}
            type="file"
            accept="image/*,application/pdf,.pdf,.jpg,.jpeg,.png,.heic"
            onChange={handleFileChange}
            style={{ display: 'none' }}
            capture="environment"
          />
          {uploading ? (
            <>
              <div style={{ fontSize: 36, marginBottom: 8 }}>⏳</div>
              <p style={{ fontFamily: "'Space Grotesk'", color: '#30d158', fontWeight: 700, fontSize: 15 }}>
                Uploading…
              </p>
            </>
          ) : (
            <>
              <div style={{ fontSize: 40, marginBottom: 10 }}>📷</div>
              <p style={{ fontFamily: "'Space Grotesk'", color: '#ccc', fontWeight: 700, fontSize: 15, marginBottom: 4 }}>
                Tap to take photo or choose file
              </p>
              <p style={{ fontFamily: "'Space Grotesk'", color: '#555', fontSize: 12 }}>
                JPG, PNG, PDF, HEIC supported
              </p>
            </>
          )}
        </div>

        {/* Uploaded List */}
        {uploads.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <p style={{ fontFamily: "'Space Grotesk'", fontSize: 12, color: '#999', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 10 }}>
              Uploaded ({uploads.length})
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {uploads.map((doc, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
                  background: 'rgba(48,209,88,0.06)', border: '1px solid rgba(48,209,88,0.2)',
                  borderRadius: 10,
                }}>
                  <span style={{ fontSize: 22, flexShrink: 0 }}>{doc.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: "'Space Grotesk'", fontSize: 13, color: '#fff', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {doc.name}
                    </div>
                    <div style={{ fontFamily: "'Space Grotesk'", fontSize: 11, color: '#888', textTransform: 'uppercase' }}>
                      {doc.type}
                    </div>
                  </div>
                  <span style={{ color: '#30d158', fontSize: 18 }}>✓</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button
            onClick={() => setDone(true)}
            style={{
              padding: '16px', background: '#30d158', color: '#000',
              border: 'none', borderRadius: 14,
              fontFamily: "'Space Grotesk'", fontSize: 16, fontWeight: 700,
              cursor: 'pointer', letterSpacing: '.03em',
              boxShadow: '0 6px 20px rgba(48,209,88,0.3)',
            }}
          >
            {uploads.length > 0 ? `DONE — ${uploads.length} document${uploads.length > 1 ? 's' : ''} uploaded` : 'SKIP & FINISH'}
          </button>

          <p style={{ fontFamily: "'Space Grotesk'", fontSize: 11, color: '#555', textAlign: 'center', lineHeight: 1.5 }}>
            Documents are securely stored and will only be shared with your assigned doctor.
          </p>
        </div>

      </div>
    </div>
  );
}

export default function UploadPage() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#0a0a0f' }}>
        <span style={{ color: '#666', fontFamily: "'Space Grotesk'" }}>Loading…</span>
      </div>
    }>
      <UploadContent />
    </Suspense>
  );
}
