"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, Home, Info, HelpCircle, ShieldAlert } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "@/lib/i18n/useTranslation";

export default function BurgerMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const { t } = useTranslation();

  const NAV_ITEMS = [
    { name: t("menu.home"), href: "/patient", icon: Home },
    { name: t("menu.about"), href: "/patient/about", icon: Info },
    { name: t("menu.help"), href: "/patient/help", icon: HelpCircle },
    { name: t("menu.privacy"), href: "/patient/privacy-policy", icon: ShieldAlert },
  ];

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 left-6 z-50 min-w-[72px] min-h-[72px] p-2 bg-primary text-paper rounded-2xl shadow-lg flex flex-col items-center justify-center gap-1 hover:bg-primary-dark transition-colors active:scale-95"
        aria-label="Open menu"
      >
        <Menu className="w-7 h-7" />
        <span className="text-xs font-bold tracking-wide">Menu</span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-ink/20 backdrop-blur-sm z-[60]"
              onClick={() => setIsOpen(false)}
            />

            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 26, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-72 bg-surface border-r border-ink/5 shadow-2xl z-[70] flex flex-col"
            >
              <div className="flex items-center justify-between p-6 border-b border-ink/5">
                <h2 className="font-serif text-xl font-bold text-primary">MediVERSE</h2>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 rounded-lg text-ink/50 hover:bg-ink/5 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="flex-1 py-4 px-3 space-y-1">
                {NAV_ITEMS.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3.5 rounded-xl transition-colors text-lg ${
                        isActive
                          ? "bg-primary/10 text-primary font-semibold"
                          : "text-ink/70 hover:bg-ink/5 hover:text-ink"
                      }`}
                    >
                      <item.icon className={`w-5 h-5 ${isActive ? "text-primary" : ""}`} />
                      {item.name}
                    </Link>
                  );
                })}
              </nav>

              {/* Footer is empty to remove build/version metadata from primary view */}
              <div className="p-4 border-t border-ink/5 text-center text-xs text-ink/40">
                &copy; {new Date().getFullYear()} MediVERSE
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
