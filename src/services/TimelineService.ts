import { BlueskyApi } from './BlueskyApi';
import { asyncPool } from './AsyncPool';
import type { TimelinePost, TimelineProgressCallback } from '../types';

/**
 * Builds a single combined timeline out of several accounts' individual public
 * feeds, similar in spirit to a Bluesky home feed but scoped only to the
 * handles the person entered or uploaded.
 */
export class TimelineService {
  private readonly api = new BlueskyApi();

  public async buildTimeline(
    handles: string[],
    onProgress: TimelineProgressCallback,
    postsPerAccount = 15
  ): Promise<TimelinePost[]> {
    const cleaned = Array.from(new Set(handles.map((h) => h.trim().replace(/^@/, '')).filter(Boolean)));

    if (cleaned.length === 0) {
      onProgress({ phase: 'done', message: 'No accounts to load.', posts: [] });
      return [];
    }

    onProgress({
      phase: 'fetching',
      message: `Fetching posts from ${cleaned.length} account${cleaned.length === 1 ? '' : 's'}...`,
      current: 0,
      total: cleaned.length,
    });

    let done = 0;
    const perAccount = await asyncPool(cleaned, 5, async (handle) => {
      try {
        const { items } = await this.api.getAuthorFeed(handle, postsPerAccount);
        done += 1;
        onProgress({
          phase: 'fetching',
          message: `Fetched @${handle} (${done}/${cleaned.length})...`,
          current: done,
          total: cleaned.length,
        });
        return items;
      } catch {
        done += 1;
        onProgress({
          phase: 'fetching',
          message: `Could not read @${handle}'s feed, skipping (${done}/${cleaned.length})...`,
          current: done,
          total: cleaned.length,
        });
        return [];
      }
    });

    const merged: TimelinePost[] = perAccount.flat();
    merged.sort((a, b) => (b.indexedAt ?? '').localeCompare(a.indexedAt ?? ''));

    onProgress({ phase: 'done', message: 'Done.', current: cleaned.length, total: cleaned.length, posts: merged });
    return merged;
  }
}
