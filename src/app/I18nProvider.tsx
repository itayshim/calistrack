import type { ReactNode } from 'react';
import { translations } from '../locales/translations';
import { useAppStore } from '../store/useAppStore';
import { I18nContext } from './i18nContext';

export function I18nProvider({ children }: { children: ReactNode }) {
  const language = useAppStore((state) => state.settings.language ?? 'en');
  return (
    <I18nContext.Provider
      value={{
        language,
        direction: language === 'he' ? 'rtl' : 'ltr',
        t: (key) => translations[language][key] ?? translations.en[key],
      }}
    >
      {children}
    </I18nContext.Provider>
  );
}
