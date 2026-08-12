import type { BlockedAccountEntry } from '../types';

function formatDate(iso?: string): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export function BlockedAccountRow({ entry }: { entry: BlockedAccountEntry }) {
  const { actor, blockedAt } = entry;
  const blockedOn = formatDate(blockedAt);

  return (
    <div className="result-card">
      {actor.avatar ? <img className="avatar" src={actor.avatar} alt="" /> : <div className="avatar" />}
      <div className="result-info">
        <div className="result-handle">@{actor.handle}</div>
        {blockedOn && <div className="result-block-date">Cast out on {blockedOn}</div>}
      </div>
    </div>
  );
}
