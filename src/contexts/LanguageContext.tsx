import React, { createContext, useContext, useState, useEffect } from 'react';
import { SupportedLanguage, TranslationKey, getTranslations, supportedLanguages } from '@/locales';

interface LanguageContextType {
  currentLanguage: SupportedLanguage;
  setLanguage: (language: SupportedLanguage) => void;
  t: (key: TranslationKey) => string;
  isRTL: boolean;
  supportedLanguages: typeof supportedLanguages;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

interface LanguageProviderProps {
  children: React.ReactNode;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  // Get initial language from localStorage or default to English
  const getInitialLanguage = (): SupportedLanguage => {
    const stored = localStorage.getItem('preferred-language');
    if (stored && (stored === 'en' || stored === 'ar')) {
      return stored as SupportedLanguage;
    }
    return 'en';
  };

  const [currentLanguage, setCurrentLanguage] = useState<SupportedLanguage>(getInitialLanguage);

  // Update localStorage when language changes
  useEffect(() => {
    localStorage.setItem('preferred-language', currentLanguage);

    // Update document direction for RTL languages
    document.documentElement.dir = currentLanguage === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = currentLanguage;
  }, [currentLanguage]);

  const setLanguage = (language: SupportedLanguage) => {
    setCurrentLanguage(language);
  };

  const t = (key: TranslationKey): string => {
    const translations = getTranslations(currentLanguage);
    return translations[key] || key;
  };

  const isRTL = currentLanguage === 'ar';

  const value: LanguageContextType = {
    currentLanguage,
    setLanguage,
    t,
    isRTL,
    supportedLanguages
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};