import { useState, useCallback, useRef } from 'react';
import { BlockScanner, DEFAULT_NETWORK_OPTIONS } from '../services/BlockScanner';
import { ScanPanel } from '../components/ScanPanel';
import { ResultCard } from '../components/ResultCard';
import { useLanguage } from '../i18n/LanguageContext';
import { formatNumber, formatScaleLabel, localizeErrorMessage } from '../i18n/format';
import type { CandidateResult, NetworkOptions, ScanProgress, SkipMetric } from '../types';

type Status = 'idle' | 'scanning' | 'done' | 'error';
type DepthKey = 'depth1' | 'depth2' | 'depth3';

export function BlockersPage() {
  const { lang, dict, t } = useLanguage();
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

  const SKIP_METRIC_LABELS: Record<SkipMetric, string> = {
    followers: dict.blockers.followers,
    following: dict.blockers.following,
    both: dict.blockers.skipEither,
  };

  const DEPTH_LABELS: Record<DepthKey, string> = {
    depth1: dict.blockers.depth1,
    depth2: dict.blockers.depth2,
    depth3: dict.blockers.depth3,
  };

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
      const raw = err instanceof Error ? err.message : dict.common.scanErrorFallback;
      setErrorMessage(localizeErrorMessage(raw, lang));
      setStatus('error');
    }
  }, [handle, networkOptions, lang, dict]);

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
      <div className="eyebrow">{dict.blockers.eyebrow}</div>
      <h1>{dict.blockers.h1}</h1>
      <p className="subhead">{dict.blockers.subhead}</p>

      <div className="options-panel">
        <div className="options-title">{dict.blockers.networkReachTitle}</div>
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
                    {dict.blockers.followers}
                  </label>
                  <label className="check">
                    <input
                      type="checkbox"
                      disabled={disabled || isScanning}
                      checked={networkOptions[depthKey].following}
                      onChange={() => toggleOption(depthKey, 'following')}
                    />
                    {dict.blockers.following}
                  </label>
                </div>
              </div>
            );
          })}
        </div>
        <div className="options-hint">{dict.blockers.depthHint}</div>
      </div>

      <div className="options-panel">
        <div className="options-title">{dict.blockers.largeAccountsTitle}</div>
        <div className="skip-row">
          <label className="check">
            <input
              type="checkbox"
              disabled={isScanning}
              checked={networkOptions.skipLargeAccounts.enabled}
              onChange={toggleSkipEnabled}
            />
            {dict.blockers.skipOver}
          </label>
          <input
            type="text"
            inputMode="numeric"
            dir="ltr"
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
          dir="ltr"
        >
          <div
            className="skip-slider-bubble"
            style={{ left: `${skipSliderPct}%` }}
          >
            {formatNumber(networkOptions.skipLargeAccounts.maxCount, lang)}
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
            <span>{formatScaleLabel(100, lang)}</span>
            <span>{formatScaleLabel(20000, lang)}</span>
          </div>
        </div>
        <div className="options-hint">{dict.blockers.skipHint}</div>
      </div>

      <div className="search-row">
        <div className="at-input-wrap" dir="ltr">
          <span className="at-symbol">@</span>
          <input
            type="text"
            placeholder={dict.blockers.handlePlaceholder}
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !isScanning && runScan()}
            disabled={isScanning}
          />
        </div>
        <button className="primary" onClick={runScan} disabled={isScanning || !handle.trim() || !hasAnyOption}>
          {isScanning ? dict.blockers.scanning : dict.blockers.scan}
        </button>
      </div>
      <div className="hint">{dict.common.noLogin}</div>

      {errorMessage && <div className="error-box">{errorMessage}</div>}

      {progress && (status === 'scanning' || status === 'done') && <ScanPanel progress={progress} />}

      {(status === 'done' || (isScanning && results.length > 0)) && (
        <>
          <div className="results-summary">
            <span className="count">{formatNumber(blockedResults.length, lang)}</span>
            <span className="label">
              {blockedResults.length === 1 ? dict.blockers.accountSingular : dict.blockers.accountPlural}{' '}
              {blockedResults.length === 1 ? dict.blockers.excommunicatedYouOne : dict.blockers.excommunicatedYouMany}
              {status === 'done'
                ? t('blockers.outOfChecked', { total: formatNumber(results.length, lang) })
                : dict.blockers.soFar}
            </span>
          </div>

          {blockedResults.length === 0 ? (
            status === 'done' && <div className="empty-state">{dict.blockers.emptyState}</div>
          ) : (
            blockedResults.map((r) => <ResultCard key={r.candidate.did} result={r} />)
          )}
        </>
      )}

      <div className="footnote">
        {dict.blockers.footnote.split('{{code}}')[0]}
        <code dir="ltr">app.bsky.graph.block</code>
        {dict.blockers.footnote.split('{{code}}')[1]}
      </div>
    </>
  );
}
