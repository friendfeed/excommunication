import { useCallback, useEffect, useRef, useState } from 'react';
import { FocusService } from '../services/FocusService';
import { FeedPostCard } from '../components/FeedPostCard';
import { useLanguage } from '../i18n/LanguageContext';
import { localizeErrorMessage } from '../i18n/format';
import type { ActorProfile, FocusSectionState, TimelinePost } from '../types';

const PAGE_SIZES = [10, 25, 50];

function emptySection(): FocusSectionState {
  return { items: [], loading: false, exhausted: false };
}

export function FocusPage({ initialHandle }: { initialHandle: string }) {
  const { lang, dict } = useLanguage();
  const [handleInput, setHandleInput] = useState(initialHandle);
  const [pageSize, setPageSize] = useState(25);
  const [profile, setProfile] = useState<ActorProfile | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  const [replies, setReplies] = useState<FocusSectionState>(emptySection());
  const [quotes, setQuotes] = useState<FocusSectionState>(emptySection());
  const [likes, setLikes] = useState<FocusSectionState>(emptySection());

  const serviceRef = useRef(new FocusService());
  const feedCursorRef = useRef<string | undefined>(undefined);
  const likesCursorRef = useRef<string | undefined>(undefined);

  const loadFeedPage = useCallback(
    async (handle: string, size: number) => {
      setReplies((prev) => ({ ...prev, loading: true }));
      setQuotes((prev) => ({ ...prev, loading: true }));
      try {
        const page = await serviceRef.current.loadFeedPage(handle, size, feedCursorRef.current);
        feedCursorRef.current = page.cursor;
        setReplies((prev) => ({
          items: [...prev.items, ...page.replies],
          loading: false,
          exhausted: page.exhausted,
          cursor: page.cursor,
        }));
        setQuotes((prev) => ({
          items: [...prev.items, ...page.quotes],
          loading: false,
          exhausted: page.exhausted,
          cursor: page.cursor,
        }));
      } catch {
        setReplies((prev) => ({ ...prev, loading: false, unavailable: prev.items.length === 0 }));
        setQuotes((prev) => ({ ...prev, loading: false, unavailable: prev.items.length === 0 }));
      }
    },
    []
  );

  const loadLikesPage = useCallback(async (did: string, size: number) => {
    setLikes((prev) => ({ ...prev, loading: true }));
    try {
      const page = await serviceRef.current.loadLikesPage(did, size, likesCursorRef.current);
      likesCursorRef.current = page.cursor;
      setLikes((prev) => ({
        items: [...prev.items, ...page.likes],
        loading: false,
        exhausted: page.exhausted,
        cursor: page.cursor,
      }));
    } catch {
      setLikes((prev) => ({ ...prev, loading: false, unavailable: prev.items.length === 0, exhausted: true }));
    }
  }, []);

  const startFocus = useCallback(
    async (handle: string) => {
      const cleaned = handle.trim().replace(/^@/, '');
      if (!cleaned) return;

      setProfile(null);
      setProfileError(null);
      setLoadingProfile(true);
      feedCursorRef.current = undefined;
      likesCursorRef.current = undefined;
      setReplies(emptySection());
      setQuotes(emptySection());
      setLikes(emptySection());

      try {
        const p = await serviceRef.current.resolveProfile(cleaned);
        setProfile(p);
        setLoadingProfile(false);
        await Promise.all([loadFeedPage(p.handle, pageSize), loadLikesPage(p.did, pageSize)]);
      } catch (err) {
        const raw = err instanceof Error ? err.message : dict.common.timelineErrorFallback;
        setProfileError(localizeErrorMessage(raw, lang));
        setLoadingProfile(false);
      }
    },
    [pageSize, loadFeedPage, loadLikesPage, lang, dict]
  );

  useEffect(() => {
    if (initialHandle) startFocus(initialHandle);
    // Only re-run when navigated to a new handle from elsewhere in the app.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialHandle]);

  const renderSection = (
    title: string,
    section: FocusSectionState,
    unavailableText: string,
    emptyText: string,
    onLoadMore: () => void
  ) => (
    <div className="focus-section">
      <div className="focus-section-title">{title}</div>
      {section.unavailable && section.items.length === 0 ? (
        <div className="empty-state focus-empty">{unavailableText}</div>
      ) : section.items.length === 0 && !section.loading ? (
        <div className="empty-state focus-empty">{emptyText}</div>
      ) : (
        <div className="feed-list">
          {section.items.map((post: TimelinePost, i) => (
            <FeedPostCard key={`${post.uri}-${i}`} post={post} />
          ))}
        </div>
      )}
      {!section.exhausted && !section.unavailable && (
        <button
          type="button"
          className="secondary focus-load-more"
          onClick={onLoadMore}
          disabled={section.loading}
        >
          {section.loading ? dict.timeline.loading : dict.focus.loadMore}
        </button>
      )}
    </div>
  );

  return (
    <>
      <div className="eyebrow">{dict.focus.eyebrow}</div>
      <h1>{dict.focus.h1}</h1>
      <p className="subhead">{dict.focus.subhead}</p>

      <div className="search-row">
        <div className="at-input-wrap" dir="ltr">
          <span className="at-symbol">@</span>
          <input
            type="text"
            placeholder={dict.focus.handlePlaceholder}
            value={handleInput}
            onChange={(e) => setHandleInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && startFocus(handleInput)}
          />
        </div>
        <button type="button" className="primary" onClick={() => startFocus(handleInput)} disabled={!handleInput.trim()}>
          {dict.focus.openButton}
        </button>
      </div>

      <div className="focus-pagesize-row">
        <span className="options-hint" style={{ margin: 0 }}>
          {dict.focus.pageSizeLabel}
        </span>
        <div className="skip-metric-group">
          {PAGE_SIZES.map((size) => (
            <button
              key={size}
              type="button"
              className={`skip-metric ${pageSize === size ? 'active' : ''}`}
              onClick={() => setPageSize(size)}
            >
              {size}
            </button>
          ))}
        </div>
      </div>

      <div className="hint">{dict.common.noLogin}</div>

      {profileError && <div className="error-box">{profileError}</div>}

      {loadingProfile && <div className="scan-panel"><div className="scan-sweep" /><div className="scan-message">{dict.focus.loadingProfile}</div></div>}

      {profile && (
        <div className="focus-profile-header">
          {profile.avatar ? <img className="avatar avatar-lg" src={profile.avatar} alt="" /> : <div className="avatar avatar-lg" />}
          <div>
            <div className="focus-profile-name">{profile.displayName || profile.handle}</div>
            <div className="focus-profile-handle" dir="ltr">@{profile.handle}</div>
          </div>
        </div>
      )}

      {profile && (
        <>
          {renderSection(dict.focus.repliesTitle, replies, dict.focus.repliesUnavailable, dict.focus.emptyReplies, () =>
            loadFeedPage(profile.handle, pageSize)
          )}
          {renderSection(dict.focus.quotesTitle, quotes, dict.focus.quotesUnavailable, dict.focus.emptyQuotes, () =>
            loadFeedPage(profile.handle, pageSize)
          )}
          {renderSection(dict.focus.likesTitle, likes, dict.focus.likesUnavailable, dict.focus.emptyLikes, () =>
            loadLikesPage(profile.did, pageSize)
          )}
        </>
      )}

      <div className="footnote">
        {dict.focus.footnote.split('{{code}}')[0]}
        <code dir="ltr">app.bsky.feed.like</code>
        {dict.focus.footnote.split('{{code}}')[1]}
      </div>
    </>
  );
}
