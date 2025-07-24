import { en } from './en';
import { ar } from './ar';

export const languages = {
  en,
  ar
} as const;

export type SupportedLanguage = keyof typeof languages;
export type TranslationKey = keyof typeof en;

export const getTranslations = (language: SupportedLanguage) => {
  return languages[language] || languages.en;
};

export const supportedLanguages = [
  { code: 'en' as const, name: 'English', nativeName: 'English' },
  { code: 'ar' as const, name: 'Arabic', nativeName: 'العربية' }
];

export { en, ar };