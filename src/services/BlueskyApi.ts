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
