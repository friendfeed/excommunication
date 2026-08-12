export type Lang = 'en' | 'fa';

export const LANGUAGES: { code: Lang; label: string; nativeLabel: string }[] = [
  { code: 'en', label: 'English', nativeLabel: 'English' },
  { code: 'fa', label: 'Persian', nativeLabel: 'فارسی' },
];

export const translations = {
  en: {
    meta: {
      title: 'The Excommunication Registry',
      description:
        "A quiet audit of your Bluesky network, to see who has blocked you without the courtesy of telling you.",
    },
    langSwitcher: {
      label: 'Language',
      switchTo: 'فارسی',
    },
    nav: {
      blockers: 'Silence Audit',
      ledger: 'The Ledger',
    },
    common: {
      noLogin: 'No login required, this only reads public data.',
      scanErrorFallback: 'Something went wrong during the scan.',
      lookupErrorFallback: 'Something went wrong during the lookup.',
    },
    blockers: {
      eyebrow: 'Bluesky · Silence Audit',
      h1: 'Find out who quietly excommunicated you.',
      subhead:
        "Enter your handle. This reads the public block records of accounts across your extended network, since anyone you follow directly can't have blocked you without also unfollowing you first. Choose how far the search should reach below.",
      networkReachTitle: 'Network reach',
      depth1: 'Depth 1 · direct circle',
      depth2: 'Depth 2 · circle of the circle',
      depth3: 'Depth 3 · the far congregation',
      followers: 'Followers',
      following: 'Following',
      depthHint:
        'Depth 2 and depth 3 unlock once the level above them has at least one relation selected. Wider reach finds more, but takes longer.',
      largeAccountsTitle: 'Large accounts',
      skipOver: 'Skip accounts over',
      skipEither: 'Either',
      skipHint:
        'Accounts past this size are still counted as candidates, but their own network isn\u2019t walked, since that\u2019s usually what makes a scan stall. "Either" skips on followers or following, whichever is hit first.',
      handlePlaceholder: 'yourhandle.bsky.social',
      scan: 'Scan',
      scanning: 'Scanning\u2026',
      accountSingular: 'account has',
      accountPlural: 'accounts have',
      excommunicatedYou: 'excommunicated you',
      outOfChecked: ', out of {{total}} checked',
      soFar: ' so far\u2026',
      emptyState: 'No excommunications found in the reach you selected.',
      via: {
        followedBy: 'followed by @{{handle}}',
        follows: 'follows @{{handle}}',
      },
      depthTag: 'depth {{n}}',
      blockedOn: 'Blocked you on {{date}}',
      blockedTag: 'Excommunicated',
      footnote:
        'This only sees accounts reachable through the depth and relations you selected above, it can\u2019t see every Bluesky account, since there\u2019s no public "who blocked me" index. Block records are read directly and publicly from each account\u2019s own PDS repo ({{code}}), so nothing here requires you to log in.',
    },
    ledger: {
      eyebrow: 'Bluesky · The Ledger',
      h1: "See who they've cast out.",
      subhead:
        "Enter any handle. This reads that account's own public block list directly, so the count is exact, there's no network to walk here, an account's blocks are already a complete and public record.",
      handlePlaceholder: 'handle.bsky.social',
      reveal: 'Reveal',
      reading: 'Reading\u2026',
      accountSingular: 'account',
      accountPlural: 'accounts',
      excommunicatedBy: 'excommunicated by @{{handle}}',
      emptyState: "This account hasn't cast anyone out.",
      castOutOn: 'Cast out on {{date}}',
      footnote:
        "This reads the account's {{code}} collection directly from its own PDS repo, which is public by design under the AT Protocol, so nothing here requires you to log in.",
    },
    scanPhases: {
      resolving: 'Resolving',
      'collecting-follows': 'Reading follows',
      'collecting-network': 'Mapping network',
      'checking-blocks': 'Checking blocks',
      done: 'Done',
      error: 'Error',
    },
    ledgerPhases: {
      resolving: 'Resolving',
      'reading-blocks': 'Reading block records',
      'resolving-profiles': 'Resolving accounts',
      done: 'Done',
      error: 'Error',
    },
  },
  fa: {
    meta: {
      title: 'دفتر طرد',
      description:
        'بررسی بی‌سروصدای شبکهٔ بلواسکای شما، برای دیدن اینکه چه کسانی بدون اطلاع، شما را مسدود کرده‌اند.',
    },
    langSwitcher: {
      label: 'زبان',
      switchTo: 'English',
    },
    nav: {
      blockers: 'ممیزی سکوت',
      ledger: 'دفتر',
    },
    common: {
      noLogin: 'نیازی به ورود نیست؛ این ابزار فقط داده‌های عمومی را می‌خواند.',
      scanErrorFallback: 'خطایی در حین پویش رخ داد.',
      lookupErrorFallback: 'خطایی در حین جست‌وجو رخ داد.',
    },
    blockers: {
      eyebrow: 'بلواسکای · ممیزی سکوت',
      h1: 'ببینید چه کسی بی‌صدا شما را طرد کرده است.',
      subhead:
        'نام کاربری خود را وارد کنید. این ابزار سوابق عمومی مسدودسازی را در سراسر شبکهٔ گسترده‌ترتان می‌خواند، چون کسی که مستقیم دنبال می‌کنید نمی‌تواند بدون لغوِ دنبال‌کردن، شما را مسدود کرده باشد. دامنهٔ جست‌وجو را در پایین انتخاب کنید.',
      networkReachTitle: 'دامنهٔ شبکه',
      depth1: 'عمق ۱ · حلقهٔ مستقیم',
      depth2: 'عمق ۲ · حلقهٔ حلقه',
      depth3: 'عمق ۳ · جماعت دور',
      followers: 'دنبال‌کنندگان',
      following: 'دنبال‌شده‌ها',
      depthHint:
        'عمق ۲ و عمق ۳ زمانی باز می‌شوند که سطح بالاتر آن‌ها دست‌کم یک رابطهٔ انتخاب‌شده داشته باشد. دامنهٔ گسترده‌تر نتایج بیشتری می‌یابد، اما زمان بیشتری می‌برد.',
      largeAccountsTitle: 'حساب‌های بزرگ',
      skipOver: 'رد کردن حساب‌های بیش از',
      skipEither: 'هرکدام',
      skipHint:
        'حساب‌های بزرگ‌تر از این اندازه همچنان به‌عنوان نامزد شمرده می‌شوند، اما شبکهٔ خودشان پیموده نمی‌شود، چون معمولاً همین باعث توقف اسکن می‌شود. گزینهٔ «هرکدام» با رسیدن به هریک از دو مقدار، آن حساب را رد می‌کند.',
      handlePlaceholder: 'yourhandle.bsky.social',
      scan: 'پویش',
      scanning: 'در حال پویش\u2026',
      accountSingular: 'حساب',
      accountPlural: 'حساب',
      excommunicatedYou: 'شما را طرد کرده\u200cاست',
      outOfChecked: '، از میان {{total}} حساب بررسی‌شده',
      soFar: ' تا اینجا\u2026',
      emptyState: 'در دامنه‌ای که انتخاب کردید، طردی یافت نشد.',
      via: {
        followedBy: 'دنبال‌شده توسط @{{handle}}',
        follows: 'دنبال‌کنندهٔ @{{handle}}',
      },
      depthTag: 'عمق {{n}}',
      blockedOn: 'شما را در {{date}} مسدود کرده',
      blockedTag: 'طردشده',
      footnote:
        'این ابزار فقط حساب‌هایی را می‌بیند که از طریق عمق و روابط انتخابی شما در بالا در دسترس‌اند؛ نمی‌تواند همهٔ حساب‌های بلواسکای را ببیند، چون نمایهٔ عمومیِ «چه کسی مرا مسدود کرده» وجود ندارد. سوابق مسدودسازی مستقیماً و به‌صورت عمومی از مخزن PDS هر حساب ({{code}}) خوانده می‌شود، پس هیچ‌چیز در این‌جا نیازمند ورود شما نیست.',
    },
    ledger: {
      eyebrow: 'بلواسکای · دفتر',
      h1: 'ببینید چه کسانی را طرد کرده است.',
      subhead:
        'هر نام کاربری‌ای را وارد کنید. این ابزار مستقیماً فهرست عمومی مسدودی‌های همان حساب را می‌خواند، پس شمار دقیق است؛ نیازی به پیمایش شبکه نیست، چون مسدودی‌های یک حساب از پیش سابقه‌ای کامل و عمومی است.',
      handlePlaceholder: 'handle.bsky.social',
      reveal: 'آشکارسازی',
      reading: 'در حال خواندن\u2026',
      accountSingular: 'حساب',
      accountPlural: 'حساب',
      excommunicatedBy: 'توسط @{{handle}} طرد شده‌است',
      emptyState: 'این حساب هنوز کسی را طرد نکرده است.',
      castOutOn: 'طردشده در {{date}}',
      footnote:
        'این ابزار مستقیماً مجموعهٔ {{code}} حساب را از مخزن PDS خودش می‌خواند که طبق طراحی پروتکل AT به‌صورت عمومی در دسترس است، پس هیچ‌چیز در این‌جا نیازمند ورود شما نیست.',
    },
    scanPhases: {
      resolving: 'در حال شناسایی',
      'collecting-follows': 'خواندن دنبال‌شده‌ها',
      'collecting-network': 'نگاشت شبکه',
      'checking-blocks': 'بررسی مسدودی‌ها',
      done: 'پایان',
      error: 'خطا',
    },
    ledgerPhases: {
      resolving: 'در حال شناسایی',
      'reading-blocks': 'خواندن سوابق مسدودی',
      'resolving-profiles': 'شناسایی حساب‌ها',
      done: 'پایان',
      error: 'خطا',
    },
  },
} as const;

/** Simple {{token}} interpolation. */
export function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => String(vars[key] ?? ''));
}
