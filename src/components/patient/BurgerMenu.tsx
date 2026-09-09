"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, Home, FileText, Shield, Settings, HelpCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const NAV_ITEMS = [
  { name: "Home", href: "/patient", icon: Home },
  { name: "My Documents", href: "/patient/upload", icon: FileText },
  { name: "Insurance", href: "/patient/insurance", icon: Shield },
  { name: "Settings", href: "/patient/settings", icon: Settings },
  { name: "Help", href: "/patient/help", icon: HelpCircle },
];

export default function BurgerMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  return (
    <>
      {/* Trigger — fixed bottom-left, z-50 so it sits above content but below modals */}
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
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-ink/20 backdrop-blur-sm z-[60]"
              onClick={() => setIsOpen(false)}
            />

            {/* Drawer */}
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 26, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-72 bg-surface border-r border-ink/5 shadow-2xl z-[70] flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-ink/5">
                <h2 className="font-serif text-xl font-bold text-primary">MediVERSE</h2>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 rounded-lg text-ink/50 hover:bg-ink/5 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Nav items */}
              <nav className="flex-1 py-4 px-3 space-y-1">
                {NAV_ITEMS.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.name}
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

              {/* Footer */}
              <div className="p-4 border-t border-ink/5 text-center text-xs text-ink/40">
                MediVERSE v0.1 — Team CureX
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
