import type { CandidateResult } from '../types';

export function ResultCard({ result }: { result: CandidateResult }) {
  const { candidate, viaAccount, relationship, depth, hasBlockedYou } = result;
  const viaLabel =
    relationship === 'following'
      ? `followed by @${viaAccount.handle}`
      : `follows @${viaAccount.handle}`;

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
      </div>
      {hasBlockedYou && <span className="blocked-tag">Excommunicated</span>}
    </div>
  );
}
