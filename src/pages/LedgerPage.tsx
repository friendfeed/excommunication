import { useState, useCallback, useRef } from 'react';
import { BlockListFetcher } from '../services/BlockListFetcher';
import { LedgerPanel } from '../components/LedgerPanel';
import { BlockedAccountRow } from '../components/BlockedAccountRow';
import type { BlockedAccountEntry, LedgerProgress } from '../types';

type Status = 'idle' | 'loading' | 'done' | 'error';

export function LedgerPage() {
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
      setErrorMessage(err instanceof Error ? err.message : 'Something went wrong during the lookup.');
      setStatus('error');
    }
  }, [handle]);

  const isLoading = status === 'loading';

  return (
    <>
      <div className="eyebrow">Bluesky · The Ledger</div>
      <h1>See who they've cast out.</h1>
      <p className="subhead">
        Enter any handle. This reads that account's own public block list directly, so the count
        is exact, there's no network to walk here, an account's blocks are already a complete and
        public record.
      </p>

      <div className="search-row">
        <div className="at-input-wrap">
          <span className="at-symbol">@</span>
          <input
            type="text"
            placeholder="handle.bsky.social"
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !isLoading && runLookup()}
            disabled={isLoading}
          />
        </div>
        <button className="primary" onClick={runLookup} disabled={isLoading || !handle.trim()}>
          {isLoading ? 'Reading...' : 'Reveal'}
        </button>
      </div>
      <div className="hint">No login required, this only reads public data.</div>

      {errorMessage && <div className="error-box">{errorMessage}</div>}

      {progress && (status === 'loading' || status === 'done') && <LedgerPanel progress={progress} />}

      {status === 'done' && (
        <>
          <div className="results-summary">
            <span className="count">{entries.length}</span>
            <span className="label">
              {entries.length === 1 ? 'account' : 'accounts'} excommunicated by @{resolvedHandle}
            </span>
          </div>

          {entries.length === 0 ? (
            <div className="empty-state">This account hasn't cast anyone out.</div>
          ) : (
            entries.map((entry) => <BlockedAccountRow key={entry.actor.did} entry={entry} />)
          )}
        </>
      )}

      <div className="footnote">
        This reads the account's <code>app.bsky.graph.block</code> collection directly from its
        own PDS repo, which is public by design under the AT Protocol, so nothing here requires
        you to log in.
      </div>
    </>
  );
}
