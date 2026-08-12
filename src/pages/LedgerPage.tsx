import { useState, useCallback, useRef } from 'react';
import { BlockListFetcher } from '../services/BlockListFetcher';
import { LedgerPanel } from '../components/LedgerPanel';
import { BlockedAccountRow } from '../components/BlockedAccountRow';
import { useLanguage } from '../i18n/LanguageContext';
import { formatNumber, localizeErrorMessage } from '../i18n/format';
import type { BlockedAccountEntry, LedgerProgress } from '../types';

type Status = 'idle' | 'loading' | 'done' | 'error';

export function LedgerPage() {
  const { lang, dict, t } = useLanguage();
  const [handle, setHandle] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [progress, setProgress] = useState<LedgerProgress | null>(null);
  const [entries, setEntries] = useState<BlockedAccountEntry[]>([]);
  const [resolvedHandle, setResolvedHandle] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fetcherRef = useRef(new BlockListFetcher());

  const runLookup = useCallback(async () => {
    const cleaned = handle.trim().replace(/^@/, '');
    if (!cleaned) return;

    setStatus('loading');
    setErrorMessage(null);
    setEntries([]);
    setResolvedHandle(cleaned);

    try {
      const result = await fetcherRef.current.fetchBlockedByAccount(cleaned, (p) => setProgress(p));
      setEntries(result);
      setStatus('done');
    } catch (err) {
      const raw = err instanceof Error ? err.message : dict.common.lookupErrorFallback;
      setErrorMessage(localizeErrorMessage(raw, lang));
      setStatus('error');
    }
  }, [handle, lang, dict]);

  const isLoading = status === 'loading';

  return (
    <>
      <div className="eyebrow">{dict.ledger.eyebrow}</div>
      <h1>{dict.ledger.h1}</h1>
      <p className="subhead">{dict.ledger.subhead}</p>

      <div className="search-row">
        <div className="at-input-wrap" dir="ltr">
          <span className="at-symbol">@</span>
          <input
            type="text"
            placeholder={dict.ledger.handlePlaceholder}
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !isLoading && runLookup()}
            disabled={isLoading}
          />
        </div>
        <button className="primary" onClick={runLookup} disabled={isLoading || !handle.trim()}>
          {isLoading ? dict.ledger.reading : dict.ledger.reveal}
        </button>
      </div>
      <div className="hint">{dict.common.noLogin}</div>

      {errorMessage && <div className="error-box">{errorMessage}</div>}

      {progress && (status === 'loading' || status === 'done') && <LedgerPanel progress={progress} />}

      {status === 'done' && (
        <>
          <div className="results-summary">
            <span className="count">{formatNumber(entries.length, lang)}</span>
            <span className="label">
              {entries.length === 1 ? dict.ledger.accountSingular : dict.ledger.accountPlural}{' '}
              {t('ledger.excommunicatedBy', { handle: resolvedHandle })}
            </span>
          </div>

          {entries.length === 0 ? (
            <div className="empty-state">{dict.ledger.emptyState}</div>
          ) : (
            entries.map((entry) => <BlockedAccountRow key={entry.actor.did} entry={entry} />)
          )}
        </>
      )}

      <div className="footnote">
        {dict.ledger.footnote.split('{{code}}')[0]}
        <code dir="ltr">app.bsky.graph.block</code>
        {dict.ledger.footnote.split('{{code}}')[1]}
      </div>
    </>
  );
}
