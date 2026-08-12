import { DidResolver } from './DidResolver';
import type { BlockRecord } from '../types';

/**
 * Reads app.bsky.graph.block records from an account's own PDS repo.
 * These records are public by design (AT Protocol repos are public),
 * so no authentication is required to read them.
 */
export class BlockRecordReader {
  private resolver = new DidResolver();

  /** Returns true if `blockerDid`'s repo contains a block record targeting `targetDid`. */
  public async hasBlocked(blockerDid: string, targetDid: string): Promise<boolean> {
    return (await this.findBlockDate(blockerDid, targetDid)) !== null;
  }

  /**
   * Returns the `createdAt` timestamp of the block record `blockerDid` holds against
   * `targetDid`, or `null` if no such record exists (or the repo can't be reached).
   */
  public async findBlockDate(blockerDid: string, targetDid: string): Promise<string | null> {
    const pds = await this.resolver.resolvePdsUrl(blockerDid);
    let cursor: string | undefined;

    do {
      const url = new URL(`${pds}/xrpc/com.atproto.repo.listRecords`);
      url.searchParams.set('repo', blockerDid);
      url.searchParams.set('collection', 'app.bsky.graph.block');
      url.searchParams.set('limit', '100');
      if (cursor) url.searchParams.set('cursor', cursor);

      const res = await fetch(url.toString());
      if (!res.ok) {
        // No block collection, private/unreachable PDS, etc. Treat as "not found".
        return null;
      }
      const data = await res.json();
      const records = (data.records ?? []) as any[];

      for (const r of records) {
        const record = this.toBlockRecord(r);
        if (record.subjectDid === targetDid) return record.createdAt ?? null;
      }

      cursor = data.cursor;
    } while (cursor);

    return null;
  }

  /**
   * Returns every block record held in `did`'s own repo. Unlike `hasBlocked`,
   * this doesn't stop at a match, it reads the whole collection, since the
   * point here is the full list (and count) of who this account has blocked.
   */
  public async listAllBlocks(did: string, onPage?: (count: number) => void): Promise<BlockRecord[]> {
    const pds = await this.resolver.resolvePdsUrl(did);
    const records: BlockRecord[] = [];
    let cursor: string | undefined;

    do {
      const url = new URL(`${pds}/xrpc/com.atproto.repo.listRecords`);
      url.searchParams.set('repo', did);
      url.searchParams.set('collection', 'app.bsky.graph.block');
      url.searchParams.set('limit', '100');
      if (cursor) url.searchParams.set('cursor', cursor);

      const res = await fetch(url.toString());
      if (!res.ok) {
        if (records.length === 0) {
          throw new Error(`Could not read block records for this account (HTTP ${res.status}).`);
        }
        break;
      }
      const data = await res.json();
      const page = (data.records ?? []) as any[];
      for (const r of page) records.push(this.toBlockRecord(r));
      cursor = data.cursor;
      onPage?.(records.length);
    } while (cursor);

    return records;
  }

  private toBlockRecord(raw: any): BlockRecord {
    return {
      uri: raw.uri,
      subjectDid: raw.value?.subject,
      createdAt: raw.value?.createdAt,
    };
  }
}
