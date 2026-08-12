import { BlueskyApi } from './BlueskyApi';
import { BlockRecordReader } from './BlockRecordReader';
import { asyncPool } from './AsyncPool';
import type { ActorProfile, CandidateResult, NetworkOptions, ProgressCallback, Relation } from '../types';

export const DEFAULT_NETWORK_OPTIONS: NetworkOptions = {
  depth1: { followers: true, following: true },
  depth2: { followers: false, following: false },
  depth3: { followers: false, following: false },
  skipLargeAccounts: { enabled: true, metric: 'both', maxCount: 200 },
};

/**
 * Orchestrates the full scan:
 *  1. Resolve the target handle.
 *  2. Fetch everyone the target follows (excluded as candidates, since a
 *     block would normally break the follow).
 *  3. Walk outward from those root accounts, depth by depth, pulling
 *     followers and/or following at each level according to `options`.
 *  4. De-duplicate candidates and check each one's public block records
 *     for the target's DID.
 */
export class BlockScanner {
  private readonly api = new BlueskyApi();
  private readonly blockReader = new BlockRecordReader();

  public async scan(
    handle: string,
    options: NetworkOptions,
    onProgress: ProgressCallback
  ): Promise<CandidateResult[]> {
    onProgress({ phase: 'resolving', message: `Resolving @${handle}...` });
    const target = await this.api.getProfile(handle);

    onProgress({ phase: 'collecting-follows', message: `Fetching accounts @${target.handle} follows...` });
    const follows = await this.api.getAllFollows(target.did, (n) =>
      onProgress({ phase: 'collecting-follows', message: `Found ${n} follows so far...` })
    );

    if (follows.length === 0) {
      onProgress({ phase: 'done', message: 'No follows found, nothing to scan.' });
      return [];
    }

    const candidateMap = new Map<string, CandidateResult>();
    const visited = new Set<string>(follows.map((f) => f.did));
    visited.add(target.did);

    const levels: Array<{ depth: 1 | 2 | 3; opts: { followers: boolean; following: boolean } }> = [
      { depth: 1, opts: options.depth1 },
      { depth: 2, opts: options.depth2 },
      { depth: 3, opts: options.depth3 },
    ];

    let frontier: ActorProfile[] = follows;

    for (const level of levels) {
      const relations: Relation[] = [];
      if (level.opts.followers) relations.push('followers');
      if (level.opts.following) relations.push('following');
      if (relations.length === 0 || frontier.length === 0) break;

      if (options.skipLargeAccounts.enabled) {
        onProgress({
          phase: 'collecting-network',
          message: `Depth ${level.depth}: checking account sizes...`,
        });
        await this.annotateCounts(frontier);
      }

      const nextFrontier: ActorProfile[] = [];
      let processed = 0;

      for (const account of frontier) {
        processed++;

        if (this.shouldSkipExpansion(account, options.skipLargeAccounts)) {
          onProgress({
            phase: 'collecting-network',
            message: `Depth ${level.depth}: skipping @${account.handle} (large account)...`,
            current: processed,
            total: frontier.length,
          });
          continue;
        }

        onProgress({
          phase: 'collecting-network',
          message: `Depth ${level.depth}: expanding via @${account.handle}...`,
          current: processed,
          total: frontier.length,
        });

        const lists = await Promise.all(
          relations.map((rel) =>
            this.safeList(() =>
              rel === 'followers' ? this.api.getAllFollowers(account.did) : this.api.getAllFollows(account.did)
            )
          )
        );

        relations.forEach((rel, i) => {
          for (const found of lists[i]) {
            if (visited.has(found.did)) continue;
            if (!candidateMap.has(found.did)) {
              candidateMap.set(found.did, {
                candidate: found,
                relationship: rel,
                depth: level.depth,
                viaAccount: account,
                hasBlockedYou: false,
                checked: false,
              });
              nextFrontier.push(found);
            }
          }
        });
      }

      for (const acc of nextFrontier) visited.add(acc.did);
      frontier = nextFrontier;
    }

    const candidates = Array.from(candidateMap.values());
    onProgress({
      phase: 'checking-blocks',
      message: `Checking ${candidates.length} accounts for blocks...`,
      current: 0,
      total: candidates.length,
    });

    let checked = 0;
    await asyncPool(candidates, 8, async (result) => {
      try {
        result.hasBlockedYou = await this.blockReader.hasBlocked(result.candidate.did, target.did);
        result.checked = true;
      } catch (err) {
        result.checked = false;
        result.error = err instanceof Error ? err.message : 'Unknown error';
      } finally {
        checked++;
        onProgress({
          phase: 'checking-blocks',
          message: `Checked ${checked} of ${candidates.length}...`,
          current: checked,
          total: candidates.length,
        });
      }
    });

    onProgress({ phase: 'done', message: 'Scan complete.' });
    return candidates;
  }

  private async safeList(fn: () => Promise<ActorProfile[]>): Promise<ActorProfile[]> {
    try {
      return await fn();
    } catch {
      return [];
    }
  }

  /** Fetches and attaches followersCount/followsCount to each account in place. */
  private async annotateCounts(accounts: ActorProfile[]): Promise<void> {
    const counts = await this.api.getProfileCounts(accounts.map((a) => a.did));
    for (const account of accounts) {
      const c = counts.get(account.did);
      if (c) {
        account.followersCount = c.followersCount;
        account.followsCount = c.followsCount;
      }
    }
  }

  /**
   * Large accounts are still kept as discovered candidates, they just don't
   * get walked further, since fetching their full follower/following list is
   * what makes a scan stall for a long time.
   */
  private shouldSkipExpansion(account: ActorProfile, opts: NetworkOptions['skipLargeAccounts']): boolean {
    if (!opts.enabled) return false;
    const followers = account.followersCount ?? 0;
    const following = account.followsCount ?? 0;

    if (opts.metric === 'followers') return followers > opts.maxCount;
    if (opts.metric === 'following') return following > opts.maxCount;
    return followers > opts.maxCount || following > opts.maxCount;
  }
}
