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
  );
}
