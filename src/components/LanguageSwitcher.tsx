import { useLanguage } from '../i18n/LanguageContext';

/**
 * A single toggle button, matching the app-bar's quiet, textual style
 * (same treatment as the site-nav tabs: small, uppercase-tracked English /
 * untracked Farsi label). It always shows the *other* language's name,
 * which is the pattern most Farsi/English sites use — the label itself is
 * the destination, not the current state.
 */
export function LanguageSwitcher() {
  const { lang, toggleLang, dict } = useLanguage();

  return (
    <button
      type="button"
      className="lang-switch"
      onClick={toggleLang}
      lang={lang === 'en' ? 'fa' : 'en'}
      dir={lang === 'en' ? 'rtl' : 'ltr'}
      aria-label={`${dict.langSwitcher.label}: ${dict.langSwitcher.switchTo}`}
    >
      {dict.langSwitcher.switchTo}
    </button>
  );
}
