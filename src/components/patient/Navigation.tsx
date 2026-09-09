"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, Home, Info, HelpCircle, ShieldAlert } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "@/lib/i18n/useTranslation";

export default function Navigation() {
  const [isOpen, setIsOpen] = useState(false);
  const [isKiosk, setIsKiosk] = useState(false);
  const pathname = usePathname();
  const { t } = useTranslation();

  useEffect(() => {
    setIsKiosk(localStorage.getItem("mediverse_kiosk_mode") === "true");
  }, []);

  const NAV_ITEMS = [
    { name: t("menu.home"), href: "/patient", icon: Home },
    { name: t("menu.about"), href: "/patient/about", icon: Info },
    { name: t("menu.help"), href: "/patient/help", icon: HelpCircle },
    { name: t("menu.privacy"), href: "/patient/privacy-policy", icon: ShieldAlert },
  ];

  if (isKiosk) {
    return (
      <nav className="fixed top-0 inset-x-0 bg-surface border-b border-ink/5 p-4 z-50 flex items-center justify-between shadow-sm">
        <h2 className="font-serif text-2xl font-bold text-primary ml-4">MediVERSE</h2>
        <div className="flex items-center gap-4 pr-4">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 px-5 py-3 rounded-2xl transition-colors text-lg font-bold ${
                  isActive
                    ? "bg-primary text-paper shadow-md"
                    : "bg-ink/5 text-ink hover:bg-ink/10"
                }`}
              >
                <item.icon className="w-6 h-6" />
                {item.name}
              </Link>
            );
          })}
        </div>
      </nav>
    );
  }

  return (
    <>
      {/* Phone: Floating Burger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="md:hidden fixed bottom-6 left-6 z-50 min-w-[72px] min-h-[72px] bg-primary text-paper rounded-[1.75rem] shadow-xl flex flex-col items-center justify-center gap-1 hover:brightness-110 transition-all active:scale-95"
        aria-label="Toggle menu"
      >
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.3 }}
        >
          {isOpen ? <X className="w-8 h-8" /> : <Menu className="w-8 h-8" />}
        </motion.div>
      </button>

      {/* Tablet: Slim Icon Rail */}
      <nav className="hidden md:flex lg:hidden fixed inset-y-0 left-0 w-24 bg-surface border-r border-ink/5 flex-col items-center py-8 z-40 gap-6 shadow-sm">
        <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary font-serif font-bold text-xl mb-4">
          M
        </div>
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`p-4 rounded-2xl transition-all ${
                isActive
                  ? "bg-primary text-paper shadow-md"
                  : "text-ink/60 hover:bg-ink/5 hover:text-ink"
              }`}
              title={item.name}
            >
              <item.icon className="w-7 h-7" />
            </Link>
          );
        })}
      </nav>

      {/* Laptop/Desktop: Full Sidebar */}
      <nav className="hidden lg:flex fixed inset-y-0 left-0 w-72 bg-surface border-r border-ink/5 flex-col py-8 z-40 shadow-sm">
        <h2 className="font-serif text-2xl font-bold text-primary px-8 mb-10">MediVERSE</h2>
        <div className="flex-1 px-4 space-y-2">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-4 px-6 py-4 rounded-2xl transition-all text-lg font-medium ${
                  isActive
                    ? "bg-primary/10 text-primary font-bold shadow-sm"
                    : "text-ink/70 hover:bg-ink/5 hover:text-ink"
                }`}
              >
                <item.icon className="w-6 h-6" />
                {item.name}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Phone: Drawer Overlay */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="md:hidden fixed inset-0 bg-ink/20 backdrop-blur-sm z-[45]"
              onClick={() => setIsOpen(false)}
            />
            <motion.aside
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 26, stiffness: 200 }}
              className="md:hidden fixed inset-x-0 bottom-0 bg-surface rounded-t-[2.5rem] shadow-2xl z-[48] flex flex-col pt-6 pb-28 px-6"
            >
              <div className="w-12 h-1.5 bg-ink/10 rounded-full mx-auto mb-8" />
              <div className="space-y-3">
                {NAV_ITEMS.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsOpen(false)}
                      className={`flex items-center gap-4 px-6 py-4 rounded-2xl transition-colors text-xl ${
                        isActive
                          ? "bg-primary/10 text-primary font-bold"
                          : "text-ink hover:bg-ink/5"
                      }`}
                    >
                      <item.icon className={`w-6 h-6 ${isActive ? "text-primary" : "text-ink/60"}`} />
                      {item.name}
                    </Link>
                  );
                })}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
