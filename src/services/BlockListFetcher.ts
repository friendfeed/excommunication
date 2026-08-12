import { BlueskyApi } from './BlueskyApi';
import { BlockRecordReader } from './BlockRecordReader';
import type { BlockedAccountEntry, LedgerProgressCallback } from '../types';

/**
 * Reverse of BlockScanner: instead of asking "who has blocked this account",
 * this asks "who has this account blocked". It's a much cheaper lookup,
 * since it only ever reads one account's own repo, no network traversal
 * needed, the account's block list is already the complete answer.
 */
export class BlockListFetcher {
  private readonly api = new BlueskyApi();
  private readonly blockReader = new BlockRecordReader();

  public async fetchBlockedByAccount(
    handle: string,
    onProgress: LedgerProgressCallback
  ): Promise<BlockedAccountEntry[]> {
    onProgress({ phase: 'resolving', message: `Resolving @${handle}...` });
    const actor = await this.api.getProfile(handle);

    onProgress({ phase: 'reading-blocks', message: `Reading @${actor.handle}'s block records...` });
    const records = await this.blockReader.listAllBlocks(actor.did, (n) =>
      onProgress({ phase: 'reading-blocks', message: `Found ${n} block records so far...` })
    );

    if (records.length === 0) {
      onProgress({ phase: 'done', message: 'No block records found.', entries: [] });
      return [];
    }

    onProgress({
      phase: 'resolving-profiles',
      message: `Resolving ${records.length} blocked accounts...`,
      current: 0,
      total: records.length,
    });

    const dids = records.map((r) => r.subjectDid).filter(Boolean);
    const profileMap = await this.api.getProfiles(dids);

    const entries: BlockedAccountEntry[] = records
      .filter((r) => r.subjectDid)
      .map((r) => ({
        actor: profileMap.get(r.subjectDid) ?? { did: r.subjectDid, handle: r.subjectDid },
        blockedAt: r.createdAt,
      }))
      .sort((a, b) => (b.blockedAt ?? '').localeCompare(a.blockedAt ?? ''));

    onProgress({ phase: 'done', message: 'Done.', current: entries.length, total: entries.length, entries });
    return entries;
  }
}
