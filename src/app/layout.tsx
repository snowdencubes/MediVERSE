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
  title: {
    template: "%s | MediVERSE",
    default: "MediVERSE - AYUSH OPD Case-Taking",
  },
  description: "Modern patient case-taking software for Ministry of Ayush. Care starts with being heard in your own language.",
  keywords: ["AYUSH", "OPD", "Patient Case-Taking", "Healthcare", "India", "MediVERSE"],
  authors: [{ name: "Team CureX" }],
  creator: "Team CureX",
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: "https://mediverse.vercel.app", // Adjust this if the real domain is known
    title: "MediVERSE - AYUSH Care, Made Simple",
    description: "Modern patient case-taking software for Ministry of Ayush. Care starts with being heard in your own language.",
    siteName: "MediVERSE",
  },
  twitter: {
    card: "summary_large_image",
    title: "MediVERSE - AYUSH Care, Made Simple",
    description: "Modern patient case-taking software for Ministry of Ayush.",
    creator: "@teamcurex",
  },
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
