'use client';

import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';

export type Locale = 'en' | 'ta' | 'kn' | 'hi' | 'te';

const localeNames: Record<Locale, string> = {
   en: 'English',
  ta: 'தமிழ்',
  kn: 'ಕನ್ನಡ',
  hi: 'हिन्दी',
  te: 'తెలుగు',
};

interface LanguageContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  messages: Record<string, any>;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const messageLoaders: Record<Locale, () => Promise<Record<string, any>>> = {
  en: () => import('../../messages/en.json').then((mod) => mod.default),
  ta: () => import('../../messages/ta.json').then((mod) => mod.default),
  kn: () => import('../../messages/kn.json').then((mod) => mod.default),
  hi: () => import('../../messages/hi.json').then((mod) => mod.default),
  te: () => import('../../messages/te.json').then((mod) => mod.default),
};

const messageCache: Partial<Record<Locale, Record<string, any>>> = {};

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('en');
  const [messages, setMessages] = useState<Record<string, any> | null>(null);

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    if (typeof window !== 'undefined') {
      localStorage.setItem('edunext-locale', newLocale);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('edunext-locale') as Locale | null;
      if (saved && (saved === 'en' || saved === 'ta' || saved === 'kn' || saved === 'hi' || saved === 'te')) {
        setLocaleState(saved);
      }
    }
  }, []);

  useEffect(() => {
    let active = true;
    const cached = messageCache[locale];
    if (cached) {
      setMessages(cached);
      return;
    }

    messageLoaders[locale]().then((loaded) => {
      messageCache[locale] = loaded;
      if (active) {
        setMessages(loaded);
      }
    });

    return () => {
      active = false;
    };
  }, [locale]);

  const value = useMemo<LanguageContextType | null>(() => {
    if (!messages) return null;
    return { locale, setLocale, messages };
  }, [locale, messages]);

  if (!value) {
    return null;
  }

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
}

export function getLocaleNames() {
  return localeNames;
}
