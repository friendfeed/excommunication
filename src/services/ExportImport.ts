import type { ExportedAccount, ExportedAccountList } from '../types';

/** Triggers a browser download of `data` as a pretty-printed JSON file. */
export function downloadJson(filename: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Builds the portable list shape and immediately downloads it. */
export function exportAccountList(
  source: ExportedAccountList['source'],
  target: string,
  accounts: ExportedAccount[]
): void {
  const payload: ExportedAccountList = {
    source,
    target,
    generatedAt: new Date().toISOString(),
    accounts,
  };
  const safeTarget = target.replace(/[^a-zA-Z0-9_.-]/g, '-');
  downloadJson(`${source}-${safeTarget || 'export'}.json`, payload);
}

/**
 * Reads a raw string of JSON (from an uploaded file) and pulls out a flat,
 * de-duplicated list of handles from whatever reasonable shape it's in:
 *  - the app's own export format: { accounts: [{ handle }] }
 *  - a bare array of account objects: [{ handle }]
 *  - a bare array of strings: ["a.bsky.social", "b.bsky.social"]
 *  - a newline/comma separated plain-text-ish string inside a JSON string
 */
export function parseHandlesFromJson(raw: string): string[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('That file is not valid JSON.');
  }

  const handles: string[] = [];

  const pushMaybeHandle = (value: unknown) => {
    if (typeof value === 'string' && value.trim()) {
      handles.push(value.trim().replace(/^@/, ''));
    } else if (value && typeof value === 'object') {
      const obj = value as Record<string, unknown>;
      const candidate =
        (typeof obj.handle === 'string' && obj.handle) ||
        (typeof obj.actor === 'object' && obj.actor && typeof (obj.actor as any).handle === 'string'
          ? (obj.actor as any).handle
          : undefined) ||
        (typeof obj.candidate === 'object' && obj.candidate && typeof (obj.candidate as any).handle === 'string'
          ? (obj.candidate as any).handle
          : undefined);
      if (candidate) handles.push(String(candidate).trim().replace(/^@/, ''));
    }
  };

  if (Array.isArray(parsed)) {
    parsed.forEach(pushMaybeHandle);
  } else if (parsed && typeof parsed === 'object') {
    const obj = parsed as Record<string, unknown>;
    if (Array.isArray(obj.accounts)) obj.accounts.forEach(pushMaybeHandle);
    else if (Array.isArray(obj.handles)) obj.handles.forEach(pushMaybeHandle);
    else if (Array.isArray(obj.entries)) obj.entries.forEach(pushMaybeHandle);
    else if (Array.isArray(obj.results)) obj.results.forEach(pushMaybeHandle);
  }

  if (handles.length === 0) {
    throw new Error('No handles could be found in that file.');
  }

  return Array.from(new Set(handles));
}
