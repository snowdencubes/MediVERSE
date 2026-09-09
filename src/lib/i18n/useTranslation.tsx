"use client";
import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { SupportedLang, TRANSLATIONS, LANGUAGES } from "./translations";

interface TranslationContextType {
  lang: SupportedLang;
  setLang: (lang: SupportedLang) => void;
  t: (key: string) => string;
}

const TranslationContext = createContext<TranslationContextType | undefined>(undefined);

export function TranslationProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<SupportedLang>("en");

  // Load from localStorage if available
  useEffect(() => {
    const saved = localStorage.getItem("mediverse_lang") as SupportedLang;
    if (saved && TRANSLATIONS[saved]) setLang(saved);
  }, []);

  const changeLang = (newLang: SupportedLang) => {
    setLang(newLang);
    localStorage.setItem("mediverse_lang", newLang);
  };

  const t = (key: string) => {
    const translation = TRANSLATIONS[lang]?.[key] || TRANSLATIONS["en"][key] || key;
    return translation;
  };

  return (
    <TranslationContext.Provider value={{ lang, setLang: changeLang, t }}>
      {children}
    </TranslationContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(TranslationContext);
  if (!context) {
    throw new Error("useTranslation must be used within a TranslationProvider");
  }
  return context;
}
