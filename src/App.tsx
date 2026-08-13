import { useState, useEffect, useCallback } from 'react';
import { BlockersPage } from './pages/BlockersPage';
import { LedgerPage } from './pages/LedgerPage';
import { TimelinePage } from './pages/TimelinePage';
import { FocusPage } from './pages/FocusPage';
import { LanguageSwitcher } from './components/LanguageSwitcher';
import { useLanguage } from './i18n/LanguageContext';
import type { Page } from './types';

function pageFromHash(): Page {
  if (window.location.hash === '#/ledger') return 'ledger';
  if (window.location.hash === '#/timeline') return 'timeline';
  if (window.location.hash.startsWith('#/focus')) return 'focus';
  return 'blockers';
}

/** Pulls the optional `@handle` out of a `#/focus/handle.bsky.social` hash. */
function focusHandleFromHash(): string {
  const hash = window.location.hash;
  const prefix = '#/focus/';
  if (!hash.startsWith(prefix)) return '';
  try {
    return decodeURIComponent(hash.slice(prefix.length));
  } catch {
    return hash.slice(prefix.length);
  }
}

function titleFor(page: Page, dict: ReturnType<typeof useLanguage>['dict']): string {
  if (page === 'ledger') return dict.nav.ledger;
  if (page === 'timeline') return dict.nav.timeline;
  if (page === 'focus') return dict.nav.focus;
  return dict.nav.blockers;
}

export function App() {
  const { dict } = useLanguage();
  const [page, setPage] = useState<Page>(pageFromHash());
  const [focusHandle, setFocusHandle] = useState<string>(focusHandleFromHash());

  useEffect(() => {
    const onHashChange = () => {
      setPage(pageFromHash());
      setFocusHandle(focusHandleFromHash());
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const navigate = useCallback((next: Page) => {
    if (next === 'ledger') window.location.hash = '#/ledger';
    else if (next === 'timeline') window.location.hash = '#/timeline';
    else if (next === 'focus') window.location.hash = '#/focus';
    else window.location.hash = '#/blockers';
  }, []);

  /** Used by other pages (e.g. clicking an author in the Timeline feed) to jump straight into Focus mode on a specific handle. */
  const openFocus = useCallback((handle: string) => {
    window.location.hash = `#/focus/${encodeURIComponent(handle)}`;
  }, []);

  return (
    <div className="app-shell">
      <div className="app-bar">
        <svg className="app-bar-mark" viewBox="0 0 64 64" aria-hidden="true">
          <path
            d="M 41.8 20.6 A 15 15 0 1 1 22.2 20.6"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.6"
            strokeLinecap="round"
          />
          <circle cx="32" cy="17.5" r="3.1" fill="#e6e3da" opacity="0.92" />
        </svg>
        <span className="app-bar-title">{titleFor(page, dict)}</span>
        <LanguageSwitcher />
      </div>

      <div className="app">
        <nav className="site-nav">
          <button
            type="button"
            className={`site-nav-tab ${page === 'blockers' ? 'active' : ''}`}
            onClick={() => navigate('blockers')}
          >
            {dict.nav.blockers}
          </button>
          <button
            type="button"
            className={`site-nav-tab ${page === 'ledger' ? 'active' : ''}`}
            onClick={() => navigate('ledger')}
          >
            {dict.nav.ledger}
          </button>
          <button
            type="button"
            className={`site-nav-tab ${page === 'timeline' ? 'active' : ''}`}
            onClick={() => navigate('timeline')}
          >
            {dict.nav.timeline}
          </button>
          <button
            type="button"
            className={`site-nav-tab ${page === 'focus' ? 'active' : ''}`}
            onClick={() => navigate('focus')}
          >
            {dict.nav.focus}
          </button>
        </nav>

        {page === 'blockers' && <BlockersPage />}
        {page === 'ledger' && <LedgerPage />}
        {page === 'timeline' && <TimelinePage onFocusAuthor={openFocus} />}
        {page === 'focus' && <FocusPage initialHandle={focusHandle} />}
      </div>
    </div>
  );
}
