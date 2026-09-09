"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Users, FileClock, Settings, LogOut, Menu } from "lucide-react";

export default function DoctorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // If we are on the login page, don't show the sidebar
  if (pathname === "/doctor/login") {
    return <div className="min-h-screen bg-[var(--paper)] text-[var(--ink)] font-sans">{children}</div>;
  }

  const navItems = [
    { name: "Patient Queue", href: "/doctor", icon: Users },
    { name: "History", href: "/doctor/history", icon: FileClock },
    { name: "Settings", href: "/doctor/settings", icon: Settings },
  ];

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-paper via-[#f4e8e6] to-gold/20 text-[var(--ink)] font-sans antialiased relative">
      {/* Mobile Sidebar Toggle */}
      <button 
        className="md:hidden fixed top-4 right-4 z-50 p-2 bg-white/50 backdrop-blur-md rounded-lg shadow-sm border border-white/60"
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
      >
        <Menu className="w-6 h-6" />
      </button>

      {/* Sidebar */}
      <aside className={`
        fixed md:sticky top-0 left-0 z-40 w-64 h-screen glass-panel border-r-0 border-y-0 rounded-r-none flex flex-col transition-transform duration-300
        ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
      `}>
        <div className="p-6">
          <h1 className="font-serif text-2xl font-bold text-primary flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center text-sm">
              Dr.
            </span>
            MediVERSE
          </h1>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                  isActive 
                    ? "bg-primary/10 text-primary font-semibold" 
                    : "text-ink/70 hover:bg-ink/5 hover:text-ink"
                }`}
                onClick={() => setMobileMenuOpen(false)}
              >
                <item.icon className={`w-5 h-5 ${isActive ? "text-primary" : ""}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-ink/5">
          <button className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-ink/70 hover:bg-alert/10 hover:text-alert transition-colors">
            <LogOut className="w-5 h-5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-screen p-4 md:p-8 max-w-7xl mx-auto w-full relative">
        {children}
      </main>
      
      {/* Mobile Overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/20 z-30 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
    </div>
  );
}
