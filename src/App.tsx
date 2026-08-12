import { useState, useEffect, useCallback } from 'react';
import { BlockersPage } from './pages/BlockersPage';
import { LedgerPage } from './pages/LedgerPage';
import type { Page } from './types';

function pageFromHash(): Page {
  return window.location.hash === '#/ledger' ? 'ledger' : 'blockers';
}

export function App() {
  const [page, setPage] = useState<Page>(pageFromHash());

  useEffect(() => {
    const onHashChange = () => setPage(pageFromHash());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const navigate = useCallback((next: Page) => {
    window.location.hash = next === 'ledger' ? '#/ledger' : '#/blockers';
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
        <span className="app-bar-title">
          {page === 'blockers' ? 'Silence Audit' : 'The Ledger'}
        </span>
      </div>

      <div className="app">
        <nav className="site-nav">
          <button
            type="button"
            className={`site-nav-tab ${page === 'blockers' ? 'active' : ''}`}
            onClick={() => navigate('blockers')}
          >
            Silence Audit
          </button>
          <button
            type="button"
            className={`site-nav-tab ${page === 'ledger' ? 'active' : ''}`}
            onClick={() => navigate('ledger')}
          >
            The Ledger
          </button>
        </nav>

        {page === 'blockers' ? <BlockersPage /> : <LedgerPage />}
      </div>
    </div>
  );
}
