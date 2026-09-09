"use client";
import { usePathname } from "next/navigation";
import dynamic from "next/dynamic";

const BurgerMenu = dynamic(() => import("@/components/patient/BurgerMenu"), { ssr: false });
const CustomCareButton = dynamic(() => import("@/components/patient/CustomCareButton"), { ssr: false });
const FloatingActionButton = dynamic(() => import("@/components/patient/FloatingActionButton"), { ssr: false });

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

      <main className="max-w-3xl mx-auto p-6 pb-28 pt-20 sm:pt-6 flex flex-col min-h-[100dvh]">
        {children}
      </main>
    </div>
  );
}
