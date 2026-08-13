import type { KeyboardEvent } from 'react';
import type { TimelinePost } from '../types';
import { useLanguage } from '../i18n/LanguageContext';

function timeAgo(iso: string, lang: 'en' | 'fa'): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const diffMs = Date.now() - then;
  const minutes = Math.max(0, Math.floor(diffMs / 60000));
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  const unit = (n: number, en: string, fa: string) => (lang === 'fa' ? `${n}${fa}` : `${n}${en}`);

  if (days > 0) return unit(days, 'd', 'ر');
  if (hours > 0) return unit(hours, 'h', 'س');
  if (minutes > 0) return unit(minutes, 'm', 'د');
  return lang === 'fa' ? 'همین الان' : 'now';
}

interface FeedPostCardProps {
  post: TimelinePost;
  /** When provided, clicking the author's name/handle/avatar calls this instead of doing nothing. */
  onAuthorClick?: (handle: string) => void;
}

export function FeedPostCard({ post, onAuthorClick }: FeedPostCardProps) {
  const { lang, dict } = useLanguage();
  const { author, text, indexedAt, images, isRepost, repostBy, isReply, isQuote } = post;

  const authorProps = onAuthorClick
    ? {
        role: 'button' as const,
        tabIndex: 0,
        onClick: () => onAuthorClick(author.handle),
        onKeyDown: (e: KeyboardEvent) => {
          if (e.key === 'Enter' || e.key === ' ') onAuthorClick(author.handle);
        },
      }
    : {};

  return (
    <div className="feed-post">
      {isRepost && repostBy && (
        <div className="feed-post-repost-tag">
          {dict.timeline.repostedBy.replace('{{handle}}', repostBy.handle)}
        </div>
      )}
      <div className="feed-post-row">
        {author.avatar ? (
          <img
            className={`avatar avatar-sm ${onAuthorClick ? 'clickable' : ''}`}
            src={author.avatar}
            alt=""
            {...authorProps}
          />
        ) : (
          <div className={`avatar avatar-sm ${onAuthorClick ? 'clickable' : ''}`} {...authorProps} />
        )}
        <div className="feed-post-body">
          <div className="feed-post-header">
            <span className={`feed-post-name ${onAuthorClick ? 'clickable' : ''}`} {...authorProps}>
              {author.displayName || author.handle}
            </span>
            <span
              className={`feed-post-handle ${onAuthorClick ? 'clickable' : ''}`}
              dir="ltr"
              {...authorProps}
            >
              @{author.handle}
            </span>
            <span className="feed-post-dot">·</span>
            <span className="feed-post-time">{timeAgo(indexedAt, lang)}</span>
            {isReply && <span className="feed-post-kind-tag">{dict.focus.replyTag}</span>}
            {isQuote && <span className="feed-post-kind-tag">{dict.focus.quoteTag}</span>}
          </div>
          {text && <div className="feed-post-text">{text}</div>}
          {images && images.length > 0 && (
            <div className={`feed-post-images feed-post-images-${Math.min(images.length, 4)}`}>
              {images.slice(0, 4).map((img, i) => (
                <img key={i} src={img.thumb} alt={img.alt ?? ''} className="feed-post-image" />
              ))}
            </div>
          )}
          <div className="feed-post-stats">
            {post.replyCount !== undefined && <span>💬 {post.replyCount}</span>}
            {post.repostCount !== undefined && <span>🔁 {post.repostCount}</span>}
            {post.likeCount !== undefined && <span>♥ {post.likeCount}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
