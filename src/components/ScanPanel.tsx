import type { ScanProgress } from '../types';

const PHASE_LABELS: Record<ScanProgress['phase'], string> = {
  resolving: 'Resolving',
  'collecting-follows': 'Reading follows',
  'collecting-network': 'Mapping network',
  'checking-blocks': 'Checking blocks',
  done: 'Done',
  error: 'Error',
};

export function ScanPanel({ progress }: { progress: ScanProgress }) {
  const pct =
    progress.total && progress.total > 0
      ? Math.round(((progress.current ?? 0) / progress.total) * 100)
      : undefined;

  return (
    <div className="scan-panel">
      {progress.phase !== 'done' && progress.phase !== 'error' && <div className="scan-sweep" />}
      <div className="scan-phase">{PHASE_LABELS[progress.phase]}</div>
      <div className="scan-message">{progress.message}</div>
      {pct !== undefined && (
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${pct}%` }} />
        </div>
      )}
    </div>
  );
}
