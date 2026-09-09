import type { Metadata } from "next";
import { Albert_Sans, Fraunces } from "next/font/google";
import "./globals.css";

const albert = Albert_Sans({ 
  subsets: ["latin"],
  variable: "--font-albert", 
});

const fraunces = Fraunces({ 
  subsets: ["latin"],
  variable: "--font-fraunces",
});

export const metadata: Metadata = {
  title: "MediVERSE - AYUSH OPD Case-Taking",
  description: "Patient Case-Taking Software for Ministry of Ayush",
};

import { TranslationProvider } from "@/lib/i18n/useTranslation";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${albert.variable} ${fraunces.variable} font-sans antialiased min-h-screen bg-[var(--paper)] text-[var(--ink)]`}>
        <TranslationProvider>
          {children}
        </TranslationProvider>
      </body>
    </html>
  );
}
