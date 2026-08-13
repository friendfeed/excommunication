import type { ActorProfile } from '../types';

/**
 * Thin client around Bluesky's public, unauthenticated AppView API.
 * No login/session is required for any of these endpoints because they
 * only ever return public data (profiles, follows, followers).
 */
export class BlueskyApi {
  private static readonly BASE = 'https://public.api.bsky.app/xrpc';

  public async getProfile(actor: string): Promise<ActorProfile> {
    const url = `${BlueskyApi.BASE}/app.bsky.actor.getProfile?actor=${encodeURIComponent(actor)}`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Could not resolve "${actor}" (HTTP ${res.status}). Check the handle is correct.`);
    }
    const data = await res.json();
    return {
      did: data.did,
      handle: data.handle,
      displayName: data.displayName,
      avatar: data.avatar,
    };
  }

  /**
   * Batch-fetches follower/follows counts for up to 25 DIDs at a time (the
   * max `app.bsky.actor.getProfiles` accepts). Used to decide, before
   * walking an account's network, whether it's large enough to skip.
   */
  public async getProfileCounts(dids: string[]): Promise<Map<string, { followersCount: number; followsCount: number }>> {
    const out = new Map<string, { followersCount: number; followsCount: number }>();
    const chunkSize = 25;

    for (let i = 0; i < dids.length; i += chunkSize) {
      const chunk = dids.slice(i, i + chunkSize);
      const url = new URL(`${BlueskyApi.BASE}/app.bsky.actor.getProfiles`);
      for (const did of chunk) url.searchParams.append('actors', did);

      try {
        const res = await fetch(url.toString());
        if (!res.ok) continue;
        const data = await res.json();
        const profiles = (data.profiles ?? []) as any[];
        for (const p of profiles) {
          out.set(p.did, {
            followersCount: p.followersCount ?? 0,
            followsCount: p.followsCount ?? 0,
          });
        }
      } catch {
        // A failed chunk just means those accounts won't get skipped; safe to continue.
      }
    }

    return out;
  }

  /**
   * Batch-resolves up to 25 DIDs at a time into full profiles (handle,
   * display name, avatar). Used to turn the bare DIDs found in block
   * records into something displayable.
   */
  public async getProfiles(dids: string[]): Promise<Map<string, ActorProfile>> {
    const out = new Map<string, ActorProfile>();
    const chunkSize = 25;

    for (let i = 0; i < dids.length; i += chunkSize) {
      const chunk = dids.slice(i, i + chunkSize);
      const url = new URL(`${BlueskyApi.BASE}/app.bsky.actor.getProfiles`);
      for (const did of chunk) url.searchParams.append('actors', did);

      try {
        const res = await fetch(url.toString());
        if (!res.ok) continue;
        const data = await res.json();
        const profiles = (data.profiles ?? []) as any[];
        for (const p of profiles) {
          out.set(p.did, { did: p.did, handle: p.handle, displayName: p.displayName, avatar: p.avatar });
        }
      } catch {
        // A failed chunk just means those DIDs stay unresolved; the caller falls back to the raw DID.
      }
    }

    return out;
  }

  /**
   * Fetches a single page of an account's public feed (their own posts and
   * reposts), newest first. Used to build the cross-account timeline view.
   */
  public async getAuthorFeed(
    actor: string,
    limit = 20,
    cursor?: string
  ): Promise<{
    items: {
      uri: string;
      author: { did: string; handle: string; displayName?: string; avatar?: string };
      text: string;
      createdAt: string;
      indexedAt: string;
      likeCount?: number;
      repostCount?: number;
      replyCount?: number;
      images?: { thumb: string; alt?: string }[];
      isRepost?: boolean;
      isReply?: boolean;
      isQuote?: boolean;
      repostBy?: { did: string; handle: string; displayName?: string; avatar?: string };
    }[];
    cursor?: string;
  }> {
    const url = new URL(`${BlueskyApi.BASE}/app.bsky.feed.getAuthorFeed`);
    url.searchParams.set('actor', actor);
    url.searchParams.set('limit', String(limit));
    url.searchParams.set('filter', 'posts_with_replies');
    if (cursor) url.searchParams.set('cursor', cursor);

    const res = await fetch(url.toString());
    if (!res.ok) {
      throw new Error(`Could not read the feed for "${actor}" (HTTP ${res.status}).`);
    }
    const data = await res.json();
    const rawItems = (data.feed ?? []) as any[];

    const items = rawItems
      .filter((item) => item?.post)
      .map((item) => {
        const post = item.post;
        const record = post.record ?? {};
        const images =
          (post.embed?.images ?? post.embed?.media?.images ?? [])?.map((img: any) => ({
            thumb: img.thumb,
            alt: img.alt,
          })) ?? undefined;
        const reason = item.reason;
        const isRepost = reason?.$type === 'app.bsky.feed.defs#reasonRepost';
        const embedType = post.embed?.$type ?? record.embed?.$type ?? '';
        const isQuote =
          embedType === 'app.bsky.embed.record#view' || embedType === 'app.bsky.embed.recordWithMedia#view';
        const isReply = !!record.reply;

        return {
          uri: post.uri,
          author: {
            did: post.author?.did,
            handle: post.author?.handle,
            displayName: post.author?.displayName,
            avatar: post.author?.avatar,
          },
          text: record.text ?? '',
          createdAt: record.createdAt ?? post.indexedAt,
          indexedAt: post.indexedAt,
          likeCount: post.likeCount,
          repostCount: post.repostCount,
          replyCount: post.replyCount,
          images: images && images.length > 0 ? images : undefined,
          isRepost,
          isReply,
          isQuote,
          repostBy: isRepost
            ? {
                did: reason?.by?.did,
                handle: reason?.by?.handle,
                displayName: reason?.by?.displayName,
                avatar: reason?.by?.avatar,
              }
            : undefined,
        };
      });

    return { items, cursor: data.cursor };
  }

  /** Batch-resolves up to 25 post URIs at a time into full post views. Used to display liked posts. */
  public async getPosts(uris: string[]): Promise<
    Map<
      string,
      {
        uri: string;
        author: { did: string; handle: string; displayName?: string; avatar?: string };
        text: string;
        createdAt: string;
        indexedAt: string;
        likeCount?: number;
        repostCount?: number;
        replyCount?: number;
        images?: { thumb: string; alt?: string }[];
      }
    >
  > {
    const out = new Map<string, any>();
    const chunkSize = 25;

    for (let i = 0; i < uris.length; i += chunkSize) {
      const chunk = uris.slice(i, i + chunkSize);
      const url = new URL(`${BlueskyApi.BASE}/app.bsky.feed.getPosts`);
      for (const uri of chunk) url.searchParams.append('uris', uri);

      try {
        const res = await fetch(url.toString());
        if (!res.ok) continue;
        const data = await res.json();
        const posts = (data.posts ?? []) as any[];
        for (const post of posts) {
          const record = post.record ?? {};
          const images =
            (post.embed?.images ?? post.embed?.media?.images ?? [])?.map((img: any) => ({
              thumb: img.thumb,
              alt: img.alt,
            })) ?? undefined;
          out.set(post.uri, {
            uri: post.uri,
            author: {
              did: post.author?.did,
              handle: post.author?.handle,
              displayName: post.author?.displayName,
              avatar: post.author?.avatar,
            },
            text: record.text ?? '',
            createdAt: record.createdAt ?? post.indexedAt,
            indexedAt: post.indexedAt,
            likeCount: post.likeCount,
            repostCount: post.repostCount,
            replyCount: post.replyCount,
            images: images && images.length > 0 ? images : undefined,
          });
        }
      } catch {
        // A failed chunk just means those posts stay unresolved.
      }
    }

    return out;
  }

  /** Returns every account `actor` follows. */
  public async getAllFollows(actor: string, onPage?: (count: number) => void): Promise<ActorProfile[]> {
    return this.paginate(actor, 'app.bsky.graph.getFollows', 'follows', onPage);
  }

  /** Returns every account that follows `actor`. */
  public async getAllFollowers(actor: string, onPage?: (count: number) => void): Promise<ActorProfile[]> {
    return this.paginate(actor, 'app.bsky.graph.getFollowers', 'followers', onPage);
  }

  private async paginate(
    actor: string,
    method: string,
    key: 'follows' | 'followers',
    onPage?: (count: number) => void
  ): Promise<ActorProfile[]> {
    const results: ActorProfile[] = [];
    let cursor: string | undefined;

    do {
      const url = new URL(`${BlueskyApi.BASE}/${method}`);
      url.searchParams.set('actor', actor);
      url.searchParams.set('limit', '100');
      if (cursor) url.searchParams.set('cursor', cursor);

      const res = await fetch(url.toString());
      if (!res.ok) {
        // A single failed page shouldn't kill the whole scan; stop paginating for this actor.
        break;
      }
      const data = await res.json();
      const page = (data[key] ?? []) as any[];
      for (const p of page) {
        results.push({ did: p.did, handle: p.handle, displayName: p.displayName, avatar: p.avatar });
      }
      cursor = data.cursor;
      onPage?.(results.length);
    } while (cursor);

    return results;
  }
}
