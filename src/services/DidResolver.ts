/**
 * Resolves a DID to the PDS (Personal Data Server) URL that hosts that
 * account's repository. Block records live on the *blocker's* PDS, not
 * on the central AppView, so we need this to read them.
 */
export class DidResolver {
  private cache = new Map<string, string>();

  public async resolvePdsUrl(did: string): Promise<string> {
    const cached = this.cache.get(did);
    if (cached) return cached;

    let doc: any;
    if (did.startsWith('did:plc:')) {
      const res = await fetch(`https://plc.directory/${did}`);
      if (!res.ok) throw new Error(`Could not resolve DID document for ${did}`);
      doc = await res.json();
    } else if (did.startsWith('did:web:')) {
      const host = did.replace('did:web:', '');
      const res = await fetch(`https://${host}/.well-known/did.json`);
      if (!res.ok) throw new Error(`Could not resolve did:web document for ${did}`);
      doc = await res.json();
    } else {
      throw new Error(`Unsupported DID method: ${did}`);
    }

    const service = (doc.service ?? []).find(
      (s: any) => s.id === '#atproto_pds' || s.type === 'AtprotoPersonalDataServer'
    );
    if (!service?.serviceEndpoint) {
      throw new Error(`No PDS service endpoint found for ${did}`);
    }

    const url = service.serviceEndpoint as string;
    this.cache.set(did, url);
    return url;
  }
}
