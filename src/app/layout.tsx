import type { Metadata } from "next";
import { Inter, Fraunces } from "next/font/google";
import "./globals.css";

const inter = Inter({ 
  subsets: ["latin"],
  variable: "--font-inter", 
});

const fraunces = Fraunces({ 
  subsets: ["latin"],
  variable: "--font-fraunces",
});

export const metadata: Metadata = {
  title: "AyuLipi - AYUSH OPD Case-Taking",
  description: "Patient Case-Taking Software for Ministry of Ayush",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${fraunces.variable} font-sans antialiased min-h-screen bg-[var(--paper)] text-[var(--ink)]`}>
        {children}
      </body>
    </html>
  );
}
