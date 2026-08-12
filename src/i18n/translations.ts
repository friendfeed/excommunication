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
      excommunicatedYouOne: 'excommunicated you',
      excommunicatedYouMany: 'excommunicated you',
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
      excommunicatedByOne: 'excommunicated by @{{handle}}',
      excommunicatedByMany: 'excommunicated by @{{handle}}',
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
      title: 'رجیستری بلاک',
      description:
        'یه بررسی بی‌سروصدا از نتوورک بلواسکای‌تان، برای اینکه ببینید چه کسانی بدون خبر دادن، شما را بلاک کرده‌اند.',
    },
    langSwitcher: {
      label: 'زبان',
      switchTo: 'English',
    },
    nav: {
      blockers: 'بلاک‌یاب',
      ledger: 'دفتر',
    },
    common: {
      noLogin: 'نیازی به لاگین نیست؛ این ابزار فقط اطلاعات عمومی را می‌خواند.',
      scanErrorFallback: 'خطایی در حین اسکن رخ داد.',
      lookupErrorFallback: 'خطایی در حین جست‌وجو رخ داد.',
    },
    blockers: {
      eyebrow: 'بلواسکای · بلاک‌یاب',
      h1: 'ببینید چه کسانی بی‌صدا شما را بلاک کرده‌اند.',
      subhead:
        'نام کاربری خود را وارد کنید. این ابزار سوابق عمومی بلاک‌ها را در سراسر نتوورک فالوئرها و فالوئینگ‌هایتان می‌خواند، چون کسی که مستقیم دنبال می‌کنید نمی‌تواند بدون لغو دنبال‌کردن، شما را بلاک کرده باشد. دامنه‌ی جست‌وجو را در پایین انتخاب کنید.',
      networkReachTitle: 'دامنه‌ی نتوورک',
      depth1: 'عمق ۱ · حلقه‌ی مستقیم',
      depth2: 'عمق ۲ · حلقه‌ی حلقه',
      depth3: 'عمق ۳ · دورترین حلقه',
      followers: 'فالوئرها',
      following: 'فالوئینگ‌ها',
      depthHint:
        'عمق ۲ و عمق ۳ زمانی باز می‌شوند که سطح بالاترشان حداقل یک رابطه‌ی انتخاب‌شده داشته باشد. دامنه‌ی بزرگ‌تر نتیجه‌ی بیشتری پیدا می‌کند، ولی زمان بیشتری هم می‌برد.',
      largeAccountsTitle: 'اکانت‌های بزرگ',
      skipOver: 'رد کردن اکانت‌های بیشتر از',
      skipEither: 'هرکدام',
      skipHint:
        'اکانت‌های بزرگ‌تر از این اندازه هنوز به‌عنوان کاندیدا حساب می‌شوند، اما نتوورک خودشان بررسی نمی‌شود، چون معمولاً همین باعث گیر کردن اسکن می‌شود. گزینه‌ی «هرکدام» با رسیدن به هرکدام از این دو عدد، همان اکانت را رد می‌کند.',
      handlePlaceholder: 'yourhandle.bsky.social',
      scan: 'اسکن',
      scanning: 'در حال اسکن\u2026',
      accountSingular: 'اکانت',
      accountPlural: 'اکانت',
      excommunicatedYouOne: 'شما را بلاک کرده است',
      excommunicatedYouMany: 'شما را بلاک کرده‌اند',
      outOfChecked: '، از میان {{total}} اکانت بررسی‌شده',
      soFar: ' تا الان\u2026',
      emptyState: 'در دامنه‌ای که انتخاب کردید، بلاکی پیدا نشد.',
      via: {
        followedBy: 'فالو شده توسط @{{handle}}',
        follows: 'فالوئر @{{handle}}',
      },
      depthTag: 'عمق {{n}}',
      blockedOn: 'شما را در {{date}} بلاک کرده',
      blockedTag: 'بلاک‌شده',
      footnote:
        'این ابزار فقط اکانت‌هایی را می‌بیند که از طریق عمق و روابط انتخابی شما در بالا در دسترس هستند؛ نمی‌تواند همه‌ی اکانت‌های بلواسکای را ببیند، چون نمایه‌ی عمومیِ «چه کسی من را بلاک کرده» وجود ندارد. سوابق بلاک، مستقیم و به‌صورت عمومی از مخزن PDS هر اکانت ({{code}}) خوانده می‌شود، پس هیچ‌چیز در این‌جا نیاز به لاگین شما ندارد.',
    },
    ledger: {
      eyebrow: 'بلواسکای · دفتر',
      h1: 'ببینید این اکانت چه کسانی را بلاک کرده است.',
      subhead:
        'می‌توانید هر نام کاربری‌ای را وارد کنید. این ابزار مستقیماً فهرست عمومی بلاک‌های همان اکانت را می‌خواند، پس شمارش دقیق است. نیازی به پیمایش نتوورک نیست، چون بلاک‌های یک اکانت از قبل یک سابقه‌ی کامل و عمومی هستند.',
      handlePlaceholder: 'handle.bsky.social',
      reveal: 'نمایش',
      reading: 'در حال خواندن\u2026',
      accountSingular: 'اکانت',
      accountPlural: 'اکانت',
      excommunicatedByOne: 'توسط @{{handle}} بلاک شده است',
      excommunicatedByMany: 'توسط @{{handle}} بلاک شده‌اند',
      emptyState: 'این اکانت هنوز کسی را بلاک نکرده است.',
      castOutOn: 'بلاک‌شده در {{date}}',
      footnote:
        'این ابزار مستقیماً مجموعه‌ی {{code}} اکانت را از مخزن PDS خودش می‌خواند که طبق طراحی پروتکل AT به‌صورت عمومی در دسترس است، پس هیچ‌چیز در این‌جا نیاز به لاگین شما ندارد.',
    },
    scanPhases: {
      resolving: 'در حال شناسایی',
      'collecting-follows': 'خواندن فالوئینگ‌ها',
      'collecting-network': 'نگاشت نتوورک',
      'checking-blocks': 'بررسی بلاک‌ها',
      done: 'پایان',
      error: 'خطا',
    },
    ledgerPhases: {
      resolving: 'در حال شناسایی',
      'reading-blocks': 'خواندن سوابق بلاک',
      'resolving-profiles': 'شناسایی اکانت‌ها',
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
