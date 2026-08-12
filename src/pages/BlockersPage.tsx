import { useState, useCallback, useRef } from 'react';
import { BlockScanner, DEFAULT_NETWORK_OPTIONS } from '../services/BlockScanner';
import { ScanPanel } from '../components/ScanPanel';
import { ResultCard } from '../components/ResultCard';
import type { CandidateResult, NetworkOptions, ScanProgress, SkipMetric } from '../types';

type Status = 'idle' | 'scanning' | 'done' | 'error';
type DepthKey = 'depth1' | 'depth2' | 'depth3';

const SKIP_METRIC_LABELS: Record<SkipMetric, string> = {
  followers: 'Followers',
  following: 'Following',
  both: 'Either',
};

const DEPTH_LABELS: Record<DepthKey, string> = {
  depth1: 'Depth 1 · direct circle',
  depth2: 'Depth 2 · circle of the circle',
  depth3: 'Depth 3 · the far congregation',
};

export function BlockersPage() {
  const [handle, setHandle] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [progress, setProgress] = useState<ScanProgress | null>(null);
  const [results, setResults] = useState<CandidateResult[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [networkOptions, setNetworkOptions] = useState<NetworkOptions>(DEFAULT_NETWORK_OPTIONS);
  const [skipCountInput, setSkipCountInput] = useState(
    String(DEFAULT_NETWORK_OPTIONS.skipLargeAccounts.maxCount)
  );
  const scannerRef = useRef(new BlockScanner());

  const toggleOption = useCallback((depth: DepthKey, key: 'followers' | 'following') => {
    setNetworkOptions((prev) => ({
      ...prev,
      [depth]: { ...prev[depth], [key]: !prev[depth][key] },
    }));
  }, []);

  const toggleSkipEnabled = useCallback(() => {
    setNetworkOptions((prev) => ({
      ...prev,
      skipLargeAccounts: { ...prev.skipLargeAccounts, enabled: !prev.skipLargeAccounts.enabled },
    }));
  }, []);

  const setSkipMetric = useCallback((metric: SkipMetric) => {
    setNetworkOptions((prev) => ({
      ...prev,
      skipLargeAccounts: { ...prev.skipLargeAccounts, metric },
    }));
  }, []);

  const setSkipMaxCount = useCallback((value: number) => {
    const clean = Number.isFinite(value) && value > 0 ? value : 0;
    setNetworkOptions((prev) => ({
      ...prev,
      skipLargeAccounts: { ...prev.skipLargeAccounts, maxCount: clean },
    }));
    setSkipCountInput(String(clean));
  }, []);

  // The skip-count number field is backed by its own string state so the user can
  // freely clear it and type a new value without a stale leading "0" sticking around
  // (a plain `value={someNumber}` controlled input re-inserts "0" before new digits
  // whenever the field is momentarily empty).
  const handleSkipCountInputChange = useCallback((raw: string) => {
    const digitsOnly = raw.replace(/[^0-9]/g, '');
    const normalized = digitsOnly.replace(/^0+(?=\d)/, '');
    setSkipCountInput(normalized);
    if (normalized !== '') {
      setNetworkOptions((prev) => ({
        ...prev,
        skipLargeAccounts: { ...prev.skipLargeAccounts, maxCount: parseInt(normalized, 10) },
      }));
    }
  }, []);

  const handleSkipCountInputBlur = useCallback(() => {
    if (skipCountInput === '') {
      setSkipCountInput('0');
      setNetworkOptions((prev) => ({
        ...prev,
        skipLargeAccounts: { ...prev.skipLargeAccounts, maxCount: 0 },
      }));
    }
  }, [skipCountInput]);

  const depth1Active = networkOptions.depth1.followers || networkOptions.depth1.following;
  const skipSliderMin = 100;
  const skipSliderMax = 20000;
  const skipSliderPct = Math.min(
    100,
    Math.max(
      0,
      ((networkOptions.skipLargeAccounts.maxCount - skipSliderMin) / (skipSliderMax - skipSliderMin)) * 100
    )
  );
  const depth2Active = networkOptions.depth2.followers || networkOptions.depth2.following;

  const runScan = useCallback(async () => {
    const cleaned = handle.trim().replace(/^@/, '');
    if (!cleaned) return;

    setStatus('scanning');
    setErrorMessage(null);
    setResults([]);

    try {
      const scanResults = await scannerRef.current.scan(cleaned, networkOptions, (p) => {
        setProgress(p);
        // Blocks get checked in parallel as the scan goes, so stream each snapshot
        // straight into state instead of waiting for the whole scan to finish.
        if (p.results) setResults([...p.results]);
      });
      setResults(scanResults);
      setStatus('done');
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Something went wrong during the scan.');
      setStatus('error');
    }
  }, [handle, networkOptions]);

  const blockedResults = results.filter((r) => r.hasBlockedYou);
  const isScanning = status === 'scanning';
  const hasAnyOption =
    depth1Active ||
    networkOptions.depth2.followers ||
    networkOptions.depth2.following ||
    networkOptions.depth3.followers ||
    networkOptions.depth3.following;

  return (
    <>
      <div className="eyebrow">Bluesky · Silence Audit</div>
      <h1>Find out who quietly excommunicated you.</h1>
      <p className="subhead">
        Enter your handle. This reads the public block records of accounts across your extended
        network, since anyone you follow directly can't have blocked you without also unfollowing
        you first. Choose how far the search should reach below.
      </p>

      <div className="options-panel">
        <div className="options-title">Network reach</div>
        <div className="options-grid">
          {(['depth1', 'depth2', 'depth3'] as DepthKey[]).map((depthKey) => {
            const disabled =
              (depthKey === 'depth2' && !depth1Active) || (depthKey === 'depth3' && !depth2Active);
            return (
              <div className={`depth-row ${disabled ? 'disabled' : ''}`} key={depthKey}>
                <div className="depth-label">{DEPTH_LABELS[depthKey]}</div>
                <div className="depth-checks">
                  <label className="check">
                    <input
                      type="checkbox"
                      disabled={disabled || isScanning}
                      checked={networkOptions[depthKey].followers}
                      onChange={() => toggleOption(depthKey, 'followers')}
                    />
                    Followers
                  </label>
                  <label className="check">
                    <input
                      type="checkbox"
                      disabled={disabled || isScanning}
                      checked={networkOptions[depthKey].following}
                      onChange={() => toggleOption(depthKey, 'following')}
                    />
                    Following
                  </label>
                </div>
              </div>
            );
          })}
        </div>
        <div className="options-hint">
          Depth 2 and depth 3 unlock once the level above them has at least one relation selected.
          Wider reach finds more, but takes longer.
        </div>
      </div>

      <div className="options-panel">
        <div className="options-title">Large accounts</div>
        <div className="skip-row">
          <label className="check">
            <input
              type="checkbox"
              disabled={isScanning}
              checked={networkOptions.skipLargeAccounts.enabled}
              onChange={toggleSkipEnabled}
            />
            Skip accounts over
          </label>
          <input
            type="text"
            inputMode="numeric"
            className="skip-count"
            disabled={isScanning || !networkOptions.skipLargeAccounts.enabled}
            value={skipCountInput}
            onChange={(e) => handleSkipCountInputChange(e.target.value)}
            onBlur={handleSkipCountInputBlur}
          />
          <div className="skip-metric-group">
            {(['followers', 'following', 'both'] as SkipMetric[]).map((metric) => (
              <button
                key={metric}
                type="button"
                className={`skip-metric ${networkOptions.skipLargeAccounts.metric === metric ? 'active' : ''}`}
                disabled={isScanning || !networkOptions.skipLargeAccounts.enabled}
                onClick={() => setSkipMetric(metric)}
              >
                {SKIP_METRIC_LABELS[metric]}
              </button>
            ))}
          </div>
        </div>
        <div
          className={`skip-slider-wrap ${!networkOptions.skipLargeAccounts.enabled ? 'disabled' : ''}`}
        >
          <div
            className="skip-slider-bubble"
            style={{ left: `${skipSliderPct}%` }}
          >
            {networkOptions.skipLargeAccounts.maxCount.toLocaleString()}
          </div>
          <input
            type="range"
            className="skip-slider"
            min={100}
            max={20000}
            step={100}
            disabled={isScanning || !networkOptions.skipLargeAccounts.enabled}
            value={networkOptions.skipLargeAccounts.maxCount}
            style={{ ['--fill' as string]: `${skipSliderPct}%` }}
            onChange={(e) => setSkipMaxCount(parseInt(e.target.value, 10))}
          />
          <div className="skip-slider-scale">
            <span>100</span>
            <span>20k</span>
          </div>
        </div>
        <div className="options-hint">
          Accounts past this size are still counted as candidates, but their own network isn't
          walked, since that's usually what makes a scan stall. "Either" skips on followers or
          following, whichever is hit first.
        </div>
      </div>

      <div className="search-row">
        <div className="at-input-wrap">
          <span className="at-symbol">@</span>
          <input
            type="text"
            placeholder="yourhandle.bsky.social"
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !isScanning && runScan()}
            disabled={isScanning}
          />
        </div>
        <button className="primary" onClick={runScan} disabled={isScanning || !handle.trim() || !hasAnyOption}>
          {isScanning ? 'Scanning...' : 'Scan'}
        </button>
      </div>
      <div className="hint">No login required, this only reads public data.</div>

      {errorMessage && <div className="error-box">{errorMessage}</div>}

      {progress && (status === 'scanning' || status === 'done') && <ScanPanel progress={progress} />}

      {(status === 'done' || (isScanning && results.length > 0)) && (
        <>
          <div className="results-summary">
            <span className="count">{blockedResults.length}</span>
            <span className="label">
              {blockedResults.length === 1 ? 'account has' : 'accounts have'} excommunicated you
              {status === 'done' ? `, out of ${results.length} checked` : ' so far...'}
            </span>
          </div>

          {blockedResults.length === 0 ? (
            status === 'done' && (
              <div className="empty-state">No excommunications found in the reach you selected.</div>
            )
          ) : (
            blockedResults.map((r) => <ResultCard key={r.candidate.did} result={r} />)
          )}
        </>
      )}

      <div className="footnote">
        This only sees accounts reachable through the depth and relations you selected above, it
        can't see every Bluesky account, since there's no public "who blocked me" index. Block
        records are read directly and publicly from each account's own PDS repo (
        <code>app.bsky.graph.block</code>), so nothing here requires you to log in.
      </div>
    </>
  );
}
