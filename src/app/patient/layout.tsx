"use client";
import { usePathname } from "next/navigation";
import BurgerMenu from "@/components/patient/BurgerMenu";
import CustomCareButton from "@/components/patient/CustomCareButton";
import FloatingActionButton from "@/components/patient/FloatingActionButton";

export default function PatientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // Determine contextual label for the FAB based on current screen
  const getFabAction = () => {
    if (pathname.includes("/upload")) return { label: "Add Document", show: true };
    if (pathname.includes("/intake")) return { label: "Add Complaint", show: true };
    return { label: "Add", show: false }; // hide on screens where it's not relevant
  };

  const isGlassScreen = pathname === "/patient" || pathname === "/patient/consent";
  const bgClass = isGlassScreen
    ? "min-h-screen bg-gradient-to-br from-paper via-paper to-gold/20 text-[var(--ink)] font-sans antialiased relative"
    : "min-h-screen bg-surface text-[var(--ink)] font-sans antialiased relative";
  const fab = getFabAction();

  return (
    <div className={bgClass}>
      {/* Persistent UI overlays — all patient screens */}
      <BurgerMenu />
      <CustomCareButton />
      {fab.show && (
        <FloatingActionButton
          label={fab.label}
          onClick={() => {
            // Contextual action — in a real app this dispatches to the relevant form
            console.log(`FAB clicked: ${fab.label}`);
          }}
        />
      )}

      <main className="max-w-3xl mx-auto p-6 flex flex-col min-h-screen">
        {children}
      </main>
    </div>
  );
}
