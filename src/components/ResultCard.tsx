import type { CandidateResult } from '../types';

function formatBlockDate(iso?: string): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export function ResultCard({ result }: { result: CandidateResult }) {
  const { candidate, viaAccount, relationship, depth, hasBlockedYou, blockDate } = result;
  const viaLabel =
    relationship === 'following'
      ? `followed by @${viaAccount.handle}`
      : `follows @${viaAccount.handle}`;
  const blockedOn = formatBlockDate(blockDate);

  return (
    <div className={`result-card ${hasBlockedYou ? 'blocked' : ''}`}>
      {candidate.avatar ? (
        <img className="avatar" src={candidate.avatar} alt="" />
      ) : (
        <div className="avatar" />
      )}
      <div className="result-info">
        <div className="result-handle">@{candidate.handle}</div>
        <div className="result-via">
          {viaLabel} <span className="depth-tag">depth {depth}</span>
        </div>
        {blockedOn && <div className="result-block-date">Blocked you on {blockedOn}</div>}
      </div>
      {hasBlockedYou && <span className="blocked-tag">Excommunicated</span>}
    </div>
  );
}
