import type { LedgerProgress } from '../types';
import { useLanguage } from '../i18n/LanguageContext';
import { formatPercent } from '../i18n/format';

export function LedgerPanel({ progress }: { progress: LedgerProgress }) {
  const { lang, dict } = useLanguage();
  const pct =
    progress.total && progress.total > 0
      ? Math.round(((progress.current ?? 0) / progress.total) * 100)
      : undefined;

  return (
    <div className="scan-panel">
      {progress.phase !== 'done' && progress.phase !== 'error' && <div className="scan-sweep" />}
      <div className="scan-phase">{dict.ledgerPhases[progress.phase]}</div>
      <div className="scan-message">{progress.message}</div>
      {pct !== undefined && (
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${pct}%` }} aria-label={formatPercent(pct, lang)} />
        </div>
      )}
    </div>
  );
}
