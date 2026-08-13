import { BlueskyApi } from './BlueskyApi';
import { RepoRecordReader } from './RepoRecordReader';
import type { ActorProfile, TimelinePost } from '../types';

export interface FeedPageResult {
  replies: TimelinePost[];
  quotes: TimelinePost[];
  cursor?: string;
  exhausted: boolean;
}

export interface LikesPageResult {
  likes: TimelinePost[];
  cursor?: string;
  exhausted: boolean;
}

/**
 * Powers Focus mode: paginated access to a single account's replies, quotes,
 * and likes, fetched a page at a time so the page can offer a "load more"
 * control instead of pulling an account's entire history at once.
 */
export class FocusService {
  private readonly api = new BlueskyApi();
  private readonly repo = new RepoRecordReader();

  public async resolveProfile(handle: string): Promise<ActorProfile> {
    return this.api.getProfile(handle);
  }

  /**
   * Pulls one page of the account's own feed (posts_with_replies) and splits
   * it into replies and quote-posts. Original posts and reposts are skipped,
   * since Focus mode is specifically about interactions with others.
   */
  public async loadFeedPage(handle: string, pageSize: number, cursor?: string): Promise<FeedPageResult> {
    const { items, cursor: nextCursor } = await this.api.getAuthorFeed(handle, pageSize, cursor);

    const toPost = (item: (typeof items)[number]): TimelinePost => ({
      uri: item.uri,
      author: item.author,
      text: item.text,
      createdAt: item.createdAt,
      indexedAt: item.indexedAt,
      likeCount: item.likeCount,
      repostCount: item.repostCount,
      replyCount: item.replyCount,
      images: item.images,
      isReply: item.isReply,
      isQuote: item.isQuote,
    });

    const replies = items.filter((i) => i.isReply && !i.isRepost).map(toPost);
    const quotes = items.filter((i) => i.isQuote && !i.isRepost).map(toPost);

    return { replies, quotes, cursor: nextCursor, exhausted: !nextCursor };
  }

  /**
   * Pulls one page of the account's `app.bsky.feed.like` repo records
   * (public, same as blocks) and resolves each liked post's content.
   */
  public async loadLikesPage(did: string, pageSize: number, cursor?: string): Promise<LikesPageResult> {
    const page = await this.repo.listPage(did, 'app.bsky.feed.like', pageSize, cursor);
    const subjectUris = page.records.map((r) => r.subjectUri).filter((u): u is string => !!u);

    if (subjectUris.length === 0) {
      return { likes: [], cursor: page.cursor, exhausted: !page.cursor };
    }

    const resolved = await this.api.getPosts(subjectUris);

    const likes: TimelinePost[] = page.records
      .map((r): TimelinePost | null => {
        if (!r.subjectUri) return null;
        const post = resolved.get(r.subjectUri);
        if (!post) return null;
        return {
          uri: post.uri,
          author: post.author,
          text: post.text,
          createdAt: post.createdAt,
          indexedAt: r.createdAt ?? post.indexedAt,
          likeCount: post.likeCount,
          repostCount: post.repostCount,
          replyCount: post.replyCount,
          images: post.images,
        };
      })
      .filter((p): p is TimelinePost => p !== null);

    return { likes, cursor: page.cursor, exhausted: !page.cursor };
  }
}
