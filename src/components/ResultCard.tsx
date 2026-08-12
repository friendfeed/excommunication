import type { CandidateResult } from '../types';
import { useLanguage } from '../i18n/LanguageContext';
import { formatNumber, formatShortDate } from '../i18n/format';

export function ResultCard({ result }: { result: CandidateResult }) {
  const { lang, t } = useLanguage();
  const { candidate, viaAccount, relationship, depth, hasBlockedYou, blockDate } = result;
  const viaLabel =
    relationship === 'following'
      ? t('blockers.via.followedBy', { handle: viaAccount.handle })
      : t('blockers.via.follows', { handle: viaAccount.handle });
  const blockedOn = formatShortDate(blockDate, lang);

  return (
    <div className={`result-card ${hasBlockedYou ? 'blocked' : ''}`}>
      {candidate.avatar ? (
        <img className="avatar" src={candidate.avatar} alt="" />
      ) : (
        <div className="avatar" />
      )}
      <div className="result-info">
        <div className="result-handle" dir="ltr">
          @{candidate.handle}
        </div>
        <div className="result-via">
          {viaLabel} <span className="depth-tag">{t('blockers.depthTag', { n: formatNumber(depth, lang) })}</span>
        </div>
        {blockedOn && <div className="result-block-date">{t('blockers.blockedOn', { date: blockedOn })}</div>}
      </div>
      {hasBlockedYou && <span className="blocked-tag">{t('blockers.blockedTag')}</span>}
    </div>
  );
}
