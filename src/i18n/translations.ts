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
      timeline: 'Timeline',
      focus: 'Focus',
    },
    common: {
      noLogin: 'No login required, this only reads public data.',
      scanErrorFallback: 'Something went wrong during the scan.',
      lookupErrorFallback: 'Something went wrong during the lookup.',
      timelineErrorFallback: 'Something went wrong while loading the timeline.',
      downloadJson: 'Download JSON',
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
    timeline: {
      eyebrow: 'Bluesky · Timeline',
      h1: 'Watch their feeds in one place.',
      subhead:
        "Add handles one at a time, or upload a JSON file you downloaded from the Silence Audit or Ledger tabs. This reads each account's public posts directly and merges them into a single feed, newest first, no login required.",
      addManually: 'Add accounts manually',
      handlePlaceholder: 'handle.bsky.social',
      add: 'Add',
      addHint: 'Type a handle and press Enter or Add. Repeat for as many accounts as you like.',
      uploadList: 'Upload JSON list',
      uploadHint: 'Accepts a file downloaded from this site, or any JSON array of handles.',
      load: 'Load timeline',
      loading: 'Loading\u2026',
      emptyState: 'No posts found for the accounts you added.',
      footnote:
        "This reads each account's public app.bsky.feed.getAuthorFeed output directly, merges the results by time, and shows nothing that isn't already public on Bluesky.",
      repostedBy: 'Reposted by @{{handle}}',
      focusHint: 'Tap an account to laser-focus on their recent interactions.',
    },
    focus: {
      eyebrow: 'Bluesky · Focus',
      h1: 'Laser-focus on one account.',
      subhead:
        "Enter a handle, or arrive here by tapping an account in the Timeline tab, to see their latest replies, quotes, and likes in one place. Choose how many to load per batch below, and load more whenever you like.",
      handlePlaceholder: 'handle.bsky.social',
      openButton: 'Focus',
      loadingProfile: 'Resolving account\u2026',
      pageSizeLabel: 'Items per load',
      loadMore: 'Load more',
      repliesTitle: 'Comments',
      quotesTitle: 'Quotes',
      likesTitle: 'Likes',
      replyTag: 'Reply',
      quoteTag: 'Quote',
      emptyReplies: 'No comments found yet.',
      emptyQuotes: 'No quote posts found yet.',
      emptyLikes: 'No likes found yet.',
      repliesUnavailable: "Couldn't read this account's comments.",
      quotesUnavailable: "Couldn't read this account's quote posts.",
      likesUnavailable: "This account's likes aren't readable, their PDS may restrict access to that record collection.",
      footnote:
        'Comments and quotes come from the account\u2019s own public feed. Likes are read directly from the {{code}} collection in the account\u2019s own PDS repo, the same public-by-design record type this site already uses for blocks.',
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
    timelinePhases: {
      resolving: 'Resolving',
      fetching: 'Fetching posts',
      done: 'Done',
      error: 'Error',
    },
  },
  fa: {
    meta: {
      title: 'رجیستری اکسکامیونیکیشن',
      description: 'یه آدیت بی‌سروصدا از نتورک بلواسکای‌ت، برای اینکه ببینی کدوم اکانت‌ها بدون خبر دادن بلاکت کردن.',
    },
    langSwitcher: {
      label: 'زبان',
      switchTo: 'English',
    },
    nav: {
      blockers: 'بلاک‌یاب',
      ledger: 'لجر',
      timeline: 'تایم‌لاین',
      focus: 'لیزر فوکوس',
    },
    common: {
      noLogin: 'نیازی به لاگین نیست؛ فقط دیتای پابلیک رو می‌خونه.',
      scanErrorFallback: 'یه ارور تو اسکن پیش اومد.',
      lookupErrorFallback: 'یه ارور تو لوکاپ پیش اومد.',
      timelineErrorFallback: 'یه ارور تو لود کردن تایم‌لاین پیش اومد.',
      downloadJson: 'دانلود JSON',
    },
    blockers: {
      eyebrow: 'بلواسکای · بلاک‌یاب',
      h1: 'ببین کدوم اکانت‌ها بی‌سروصدا بلاکت کردن.',
      subhead:
        'هندلت رو وارد کن. این ابزار بلاک‌رکوردهای پابلیک رو تو کل نتورک فالوئرها و فالوئینگ‌هات چک می‌کنه، چون کسی که مستقیم فالوش می‌کنی نمی‌تونه بدون آنفالو کردن، بلاکت کرده باشه. رنج اسکن رو پایین انتخاب کن.',
      networkReachTitle: 'رنج نتورک',
      depth1: 'دپث ۱ · حلقه‌ی مستقیم',
      depth2: 'دپث ۲ · یه لایه اون‌ورتر',
      depth3: 'دپث ۳ · دورترین لایه',
      followers: 'فالوئرها',
      following: 'فالوئینگ‌ها',
      depthHint:
        'دپث ۲ و دپث ۳ وقتی آنلاک می‌شن که لایه‌ی بالاترشون حداقل یه relation انتخاب‌شده داشته باشه. رنج بزرگ‌تر ریزالت بیشتری پیدا می‌کنه، ولی زمان بیشتری هم می‌بره.',
      largeAccountsTitle: 'اکانت‌های بزرگ',
      skipOver: 'اسکیپ اکانت‌های بالای',
      skipEither: 'هرکدوم',
      skipHint:
        'اکانت‌های بزرگ‌تر از این عدد هنوز به‌عنوان کاندیدیت حساب می‌شن، ولی نتورک خودشون فرچ نمی‌شه، چون معمولاً همین باعث گیر کردن اسکن می‌شه. آپشن «هرکدوم» با رسیدن به هرکدوم از این دو تا عدد، همون اکانت رو اسکیپ می‌کنه.',
      handlePlaceholder: 'yourhandle.bsky.social',
      scan: 'اسکن',
      scanning: 'در حال اسکن\u2026',
      accountSingular: 'اکانت',
      accountPlural: 'اکانت',
      excommunicatedYouOne: 'بلاکت کرده',
      excommunicatedYouMany: 'بلاکت کردن',
      outOfChecked: '، از {{total}} اکانت چک‌شده',
      soFar: ' تا الان\u2026',
      emptyState: 'تو رنجی که انتخاب کردی، هیچ بلاکی پیدا نشد.',
      via: {
        followedBy: 'فالو شده توسط @{{handle}}',
        follows: 'فالوئر @{{handle}}',
      },
      depthTag: 'دپث {{n}}',
      blockedOn: 'تو {{date}} بلاکت کرده',
      blockedTag: 'بلاک‌شده',
      footnote:
        'این ابزار فقط اکانت‌هایی رو می‌بینه که از طریق دپث و relation‌های انتخابی‌ت بالا در دسترسن؛ نمی‌تونه کل بلواسکای رو ببینه، چون هیچ ایندکس پابلیکی برای «کی من رو بلاک کرده» وجود نداره. بلاک‌رکوردها مستقیم و پابلیک از ریپوی PDS هر اکانت ({{code}}) خونده می‌شن، پس هیچ‌چی این‌جا نیاز به لاگین نداره.',
    },
    ledger: {
      eyebrow: 'بلواسکای · لجر',
      h1: 'ببین این اکانت کیا رو بلاک کرده.',
      subhead:
        'هر هندلی رو می‌تونی وارد کنی. این ابزار مستقیماً لیست بلاک‌های پابلیک همون اکانت رو می‌خونه، پس کانت دقیقه. نیازی به کراول کردن نتورک نیست، چون بلاک‌های یه اکانت خودش یه رکورد کامل و پابلیکه.',
      handlePlaceholder: 'handle.bsky.social',
      reveal: 'نمایش',
      reading: 'در حال خوندن\u2026',
      accountSingular: 'اکانت',
      accountPlural: 'اکانت',
      excommunicatedByOne: 'توسط @{{handle}} بلاک شده',
      excommunicatedByMany: 'توسط @{{handle}} بلاک شدن',
      emptyState: 'این اکانت هنوز کسی رو بلاک نکرده.',
      castOutOn: 'بلاک‌شده تو {{date}}',
      footnote:
        'این ابزار مستقیم کالکشن {{code}} اکانت رو از ریپوی PDS خودش می‌خونه که طبق طراحی AT Protocol پابلیکه، پس هیچ‌چی این‌جا نیاز به لاگین نداره.',
    },
    timeline: {
      eyebrow: 'بلواسکای · تایم‌لاین',
      h1: 'فید چند اکانت رو یه‌جا ببین.',
      subhead:
        'هندل‌ها رو یکی‌یکی اد کن یا یه فایل JSON که از تب بلاک‌یاب یا لجر دانلود کردی رو آپلود کن. این ابزار پست‌های پابلیک هر اکانت رو فچ می‌کنه و همه رو تو یه تایم‌لاین، از جدیدترین به قدیمی‌ترین، مرج می‌کنه؛ نیازی به لاگین نیست.',
      addManually: 'اد کردن دستی اکانت‌ها',
      handlePlaceholder: 'handle.bsky.social',
      add: 'اد کن',
      addHint: 'یه هندل بنویس و Enter یا اد کن رو بزن. برای هر تعداد اکانتی که می‌خوای تکرار کن.',
      uploadList: 'آپلود فایل JSON',
      uploadHint: 'فایلی که از همین سایت دانلود کردی یا هر آرایه‌ی JSON از هندل‌ها رو قبول می‌کنه.',
      load: 'لود تایم‌لاین',
      loading: 'در حال لود\u2026',
      emptyState: 'برای اکانت‌هایی که اد کردی هیچ پستی پیدا نشد.',
      footnote:
        'این ابزار مستقیم خروجی پابلیک app.bsky.feed.getAuthorFeed هر اکانت رو فچ می‌کنه، ریزالت‌ها رو بر اساس تایم مرج می‌کنه، و چیزی جز اونچه از قبل روی بلواسکای پابلیکه نشون نمی‌ده.',
      repostedBy: 'ریپست شده توسط @{{handle}}',
      focusHint: 'روی یه اکانت کلیک کن تا با لیزر فوکوس بری روی آخرین اینتراکشن‌هاش.',
    },
    focus: {
      eyebrow: 'بلواسکای · لیزر فوکوس',
      h1: 'لیزر فوکوس روی یه اکانت.',
      subhead:
        'یه هندل وارد کن، یا با کلیک روی یه اکانت تو تب تایم‌لاین به این‌جا بیا، تا آخرین کامنت‌ها، کوت‌ها و لایک‌هاش رو یه‌جا ببینی. تعداد آیتم‌های هر لود رو پایین ست کن و هر وقت خواستی لود بیشتر بزن.',
      handlePlaceholder: 'handle.bsky.social',
      openButton: 'لیزر فوکوس',
      loadingProfile: 'در حال شناسایی اکانت\u2026',
      pageSizeLabel: 'تعداد در هر لود',
      loadMore: 'لود بیشتر',
      repliesTitle: 'کامنت‌ها',
      quotesTitle: 'کوت‌ها',
      likesTitle: 'لایک‌ها',
      replyTag: 'کامنت',
      quoteTag: 'کوت',
      emptyReplies: 'هنوز کامنتی پیدا نشده.',
      emptyQuotes: 'هنوز کوتی پیدا نشده.',
      emptyLikes: 'هنوز لایکی پیدا نشده.',
      repliesUnavailable: 'کامنت‌های این اکانت فچ نشد.',
      quotesUnavailable: 'کوت‌های این اکانت فچ نشد.',
      likesUnavailable: 'لایک‌های این اکانت قابل‌فچ نیست، شاید PDS این اکانت اکسس به این کالکشن رو محدود کرده.',
      footnote:
        'کامنت‌ها و کوت‌ها از فید پابلیک خود اکانت میان. لایک‌ها مستقیم از کالکشن {{code}} تو ریپوی PDS خود اکانت خونده می‌شن؛ همون نوع رکورد پابلیکی که این سایت از قبل برای بلاک‌ها استفاده می‌کنه.',
    },
    scanPhases: {
      resolving: 'در حال شناسایی',
      'collecting-follows': 'در حال خوندن فالوئینگ‌ها',
      'collecting-network': 'در حال مپ کردن نتورک',
      'checking-blocks': 'در حال چک کردن بلاک‌ها',
      done: 'انجام شد',
      error: 'ارور',
    },
    ledgerPhases: {
      resolving: 'در حال شناسایی',
      'reading-blocks': 'در حال خوندن بلاک‌رکوردها',
      'resolving-profiles': 'در حال شناسایی اکانت‌ها',
      done: 'انجام شد',
      error: 'ارور',
    },
    timelinePhases: {
      resolving: 'در حال شناسایی',
      fetching: 'در حال فچ کردن پست‌ها',
      done: 'انجام شد',
      error: 'ارور',
    },
  },
} as const;

/** Simple {{token}} interpolation. */
export function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => String(vars[key] ?? ''));
}
