import type { Lang } from './translations';

/** Locale tag used for Intl APIs per language. fa-IR gives Persian digits, ٬-style grouping, and the Persian (Jalali) calendar for dates. */
function localeTag(lang: Lang): string {
  return lang === 'fa' ? 'fa-IR' : 'en-US';
}

/** Formats an integer/count using the target locale's digits and grouping. */
export function formatNumber(value: number, lang: Lang): string {
  return new Intl.NumberFormat(localeTag(lang)).format(value);
}

/** Formats a percentage (0-100) using the target locale's digits. */
export function formatPercent(value: number, lang: Lang): string {
  return `${formatNumber(value, lang)}%`;
}

/**
 * Formats a short date. In Farsi this renders on the Persian (Jalali) calendar
 * with Persian digits and month names, which is what Farsi-speaking users expect
 * for dates, rather than a literal transliteration of the Gregorian date.
 */
export function formatShortDate(iso: string | undefined, lang: Lang): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(localeTag(lang), { year: 'numeric', month: 'short', day: 'numeric' });
}

/** Renders the large-number slider scale ("100" / "20k") in each locale's own idiom. */
export function formatScaleLabel(value: number, lang: Lang): string {
  if (lang === 'fa') {
    if (value >= 1000) return `${formatNumber(value / 1000, lang)}هزار`;
    return formatNumber(value, lang);
  }
  if (value >= 1000) return `${value / 1000}k`;
  return String(value);
}

/**
 * Service-layer errors are thrown in English (they're implementation detail
 * strings, not translation keys). This maps the known shapes to natural Farsi
 * so the person never sees English inside an otherwise Farsi interface, and
 * otherwise falls back to the original message untouched.
 */
export function localizeErrorMessage(message: string, lang: Lang): string {
  if (lang !== 'fa') return message;

  const rules: [RegExp, (m: RegExpMatchArray) => string][] = [
    [
      /^Could not resolve "(.+)" \(HTTP (\d+)\)\. Check the handle is correct\.$/,
      (m) => `شناسایی «${m[1]}» فیل شد (HTTP ${formatNumber(Number(m[2]), 'fa')}). درست بودن هندل رو چک کن.`,
    ],
    [
      /^Could not read block records for this account \(HTTP (\d+)\)\.$/,
      (m) => `خوندن بلاک‌رکوردهای این اکانت فیل شد (HTTP ${formatNumber(Number(m[1]), 'fa')}).`,
    ],
    [
      /^Could not resolve DID document for (.+)$/,
      (m) => `شناسایی DID document برای ${m[1]} فیل شد.`,
    ],
    [
      /^Could not resolve did:web document for (.+)$/,
      (m) => `شناسایی did:web document برای ${m[1]} فیل شد.`,
    ],
    [/^Unsupported DID method: (.+)$/, (m) => `این متد DID پشتیبانی نمی‌شه: ${m[1]}`],
    [/^No PDS service endpoint found for (.+)$/, (m) => `هیچ PDS endpoint‌ای برای ${m[1]} پیدا نشد.`],
    [
      /^Could not read the feed for "(.+)" \(HTTP (\d+)\)\.$/,
      (m) => `فچ کردن فید «${m[1]}» فیل شد (HTTP ${formatNumber(Number(m[2]), 'fa')}).`,
    ],
    [
      /^Could not read "(.+)" records for this account \(HTTP (\d+)\)\.$/,
      (m) => `خوندن کالکشن «${m[1]}» این اکانت فیل شد (HTTP ${formatNumber(Number(m[2]), 'fa')}).`,
    ],
  ];

  for (const [pattern, build] of rules) {
    const match = message.match(pattern);
    if (match) return build(match);
  }
  return message;
}
