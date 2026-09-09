"use client";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { useTranslation } from "@/lib/i18n/useTranslation";

const Navigation = dynamic(() => import("@/components/patient/Navigation"), { ssr: false });
const CustomCareButton = dynamic(() => import("@/components/patient/CustomCareButton"), { ssr: false });
const FloatingActionButton = dynamic(() => import("@/components/patient/FloatingActionButton"), { ssr: false });

export default function PatientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [isKiosk, setIsKiosk] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    setIsKiosk(localStorage.getItem("mediverse_kiosk_mode") === "true");
  }, []);

  const getFabAction = () => {
    if (pathname.includes("/upload")) return { label: t("fab.add_doc") || "Add Document", show: true };
    if (pathname.includes("/intake")) return { label: t("fab.add_complaint") || "Add Complaint", show: true };
    return { label: t("fab.add") || "Add", show: false };
  };

  const isGlassScreen = pathname === "/patient/consent";
  const bgClass = isGlassScreen
    ? "min-h-screen bg-gradient-to-br from-paper via-paper to-gold/20 text-[var(--ink)] font-sans antialiased relative"
    : "min-h-screen bg-surface text-[var(--ink)] font-sans antialiased relative";
  
  const fab = getFabAction();

  // The Welcome page is fully self-contained and shouldn't be boxed in by the navigation layout.
  if (pathname === "/patient") {
    return <>{children}</>;
  }

  // Padding adjusts based on navigation mode:
  // Kiosk: Top-bar (pt-24)
  // Laptop: Left-sidebar (lg:pl-80)
  // Tablet: Left-icon-rail (md:pl-32)
  // Phone: Bottom-burger (pb-32)
  const mainPadding = isKiosk
    ? "pt-32 p-8 max-w-5xl"
    : "pb-32 md:pb-8 pt-8 md:pl-32 lg:pl-80 max-w-4xl";

  return (
    <div className={bgClass}>
      <Navigation />
      {!isKiosk && <CustomCareButton />}
      {!isKiosk && fab.show && (
        <FloatingActionButton
          label={fab.label}
          onClick={() => {
            console.log(`FAB clicked: ${fab.label}`);
          }}
        />
      )}

      <main className={`mx-auto flex flex-col min-h-[100dvh] ${mainPadding}`}>
        {children}
      </main>
    </div>
  );
}
