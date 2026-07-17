import { createContext } from 'react';
import { translations, type TranslationKey } from '../locales/translations';

export interface I18nValue {
  language: 'en' | 'he';
  direction: 'ltr' | 'rtl';
  t: (key: TranslationKey) => string;
}

export const I18nContext = createContext<I18nValue>({
  language: 'en',
  direction: 'ltr',
  t: (key) => translations.en[key],
});
