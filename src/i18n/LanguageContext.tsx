import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { translations, interpolate, type Lang } from './translations';

const STORAGE_KEY = 'excomm-lang';
const RTL_LANGS: Lang[] = ['fa'];

function detectInitialLang(): Lang {
  if (typeof window === 'undefined') return 'en';
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === 'en' || stored === 'fa') return stored;
  // Respect the browser's language as a first guess, but default stays English
  // per spec — this only pre-selects Farsi for a visitor whose browser is
  // already set to Persian, it never overrides an explicit stored choice.
  const nav = window.navigator.language?.toLowerCase() ?? '';
  return nav.startsWith('fa') ? 'fa' : 'en';
}

type Dict = (typeof translations)[Lang];

interface LanguageContextValue {
  lang: Lang;
  dir: 'ltr' | 'rtl';
  dict: Dict;
  setLang: (lang: Lang) => void;
  toggleLang: () => void;
  t: (path: string, vars?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

function getPath(dict: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object' && key in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, dict);
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(detectInitialLang);

  const dir: 'ltr' | 'rtl' = RTL_LANGS.includes(lang) ? 'rtl' : 'ltr';
  const dict = translations[lang];

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
    document.title = dict.meta.title;
    const descriptionTag = document.querySelector('meta[name="description"]');
    if (descriptionTag) descriptionTag.setAttribute('content', dict.meta.description);
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute('content', dict.meta.title);
    const ogDescription = document.querySelector('meta[property="og:description"]');
    if (ogDescription) ogDescription.setAttribute('content', dict.meta.description);
    window.localStorage.setItem(STORAGE_KEY, lang);
  }, [lang, dir, dict]);

  const setLang = (next: Lang) => setLangState(next);
  const toggleLang = () => setLangState((prev) => (prev === 'en' ? 'fa' : 'en'));

  const t = useMemo(
    () => (path: string, vars?: Record<string, string | number>) => {
      const value = getPath(dict, path);
      if (typeof value !== 'string') return path;
      return interpolate(value, vars);
    },
    [dict]
  );

  const value = useMemo(
    () => ({ lang, dir, dict, setLang, toggleLang, t }),
    [lang, dir, dict, t]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within a LanguageProvider');
  return ctx;
}
