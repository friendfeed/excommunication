import { DidResolver } from './DidResolver';

export interface RepoRecordPage {
  records: { uri: string; subjectUri?: string; createdAt?: string }[];
  cursor?: string;
}

/**
 * Reads one page at a time from a given collection in an account's own PDS
 * repo (e.g. app.bsky.feed.like). Repo records are public by design under
 * the AT Protocol, the same property BlockRecordReader relies on for blocks.
 */
export class RepoRecordReader {
  private resolver = new DidResolver();

  public async listPage(did: string, collection: string, limit: number, cursor?: string): Promise<RepoRecordPage> {
    const pds = await this.resolver.resolvePdsUrl(did);
    const url = new URL(`${pds}/xrpc/com.atproto.repo.listRecords`);
    url.searchParams.set('repo', did);
    url.searchParams.set('collection', collection);
    url.searchParams.set('limit', String(limit));
    if (cursor) url.searchParams.set('cursor', cursor);

    const res = await fetch(url.toString());
    if (!res.ok) {
      throw new Error(`Could not read "${collection}" records for this account (HTTP ${res.status}).`);
    }
    const data = await res.json();
    const raw = (data.records ?? []) as any[];

    const records = raw.map((r) => ({
      uri: r.uri,
      subjectUri: r.value?.subject?.uri,
      createdAt: r.value?.createdAt,
    }));

    return { records, cursor: data.cursor };
  }
}
