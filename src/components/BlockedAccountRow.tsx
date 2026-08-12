import type { BlockedAccountEntry } from '../types';
import { useLanguage } from '../i18n/LanguageContext';
import { formatShortDate } from '../i18n/format';

export function BlockedAccountRow({ entry }: { entry: BlockedAccountEntry }) {
  const { lang, t } = useLanguage();
  const { actor, blockedAt } = entry;
  const blockedOn = formatShortDate(blockedAt, lang);

  return (
    <div className="result-card">
      {actor.avatar ? <img className="avatar" src={actor.avatar} alt="" /> : <div className="avatar" />}
      <div className="result-info">
        <div className="result-handle" dir="ltr">
          @{actor.handle}
        </div>
        {blockedOn && <div className="result-block-date">{t('ledger.castOutOn', { date: blockedOn })}</div>}
      </div>
    </div>
  );
}
