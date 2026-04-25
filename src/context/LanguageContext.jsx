import React, { createContext, useContext, useEffect, useState } from "react";

const LanguageContext = createContext();
const STORAGE_KEY = "lang";
const DEFAULT_LANG = "en";

function readStoredLang() {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === "ar" || v === "en" ? v : DEFAULT_LANG;
  } catch {
    return DEFAULT_LANG;
  }
}

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(readStoredLang);

  // Keep <html dir> + <html lang> in sync, and persist to localStorage on every change.
  useEffect(() => {
    document.documentElement.dir  = lang === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = lang;
    try { localStorage.setItem(STORAGE_KEY, lang); } catch {}
  }, [lang]);

  // Cross-tab sync: if user changes language in another tab, mirror it here.
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === STORAGE_KEY && (e.newValue === "ar" || e.newValue === "en")) {
        setLangState(e.newValue);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const setLang = (next) => {
    if (next !== "ar" && next !== "en") return;
    setLangState(next);
  };

  const toggle = () => setLang(lang === "ar" ? "en" : "ar");

  return (
    <LanguageContext.Provider value={{ lang, setLang, toggle }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLang = () => useContext(LanguageContext);
