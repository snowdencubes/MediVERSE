export default function PatientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[var(--paper)] text-[var(--ink)] font-sans antialiased">
      {/* A simple header could go here, or we keep it clean for touch kiosks */}
      <main className="max-w-3xl mx-auto p-6 flex flex-col min-h-screen">
        {children}
      </main>
    </div>
  );
}
