export interface ActorProfile {
  did: string;
  handle: string;
  displayName?: string;
  avatar?: string;
  followersCount?: number;
  followsCount?: number;
}

export interface BlockRecord {
  uri: string;
  subjectDid: string; // the DID this record blocks
  createdAt: string;
}

/** Which relations to walk at a given depth level. */
export interface LevelOptions {
  followers: boolean;
  following: boolean;
}

/** Which count(s) a large-account skip should be judged against. */
export type SkipMetric = 'followers' | 'following' | 'both';

/**
 * Large accounts (celebrities, brands, etc.) can have hundreds of thousands of
 * followers/follows, and walking their full list is what makes a scan stall.
 * When enabled, accounts whose counts exceed `maxCount` (per `metric`) are kept
 * as candidates but are not expanded further.
 */
export interface SkipLargeAccountsOptions {
  enabled: boolean;
  metric: SkipMetric;
  maxCount: number;
}

/** Depth 1, 2, and 3 relation choices, each independently selectable. */
export interface NetworkOptions {
  depth1: LevelOptions;
  depth2: LevelOptions;
  depth3: LevelOptions;
  skipLargeAccounts: SkipLargeAccountsOptions;
}

export type Relation = 'followers' | 'following';

export interface CandidateResult {
  candidate: ActorProfile;
  /** Which relation led to this candidate at its shallowest discovered depth. */
  relationship: Relation;
  /** How many hops away from the target this candidate was found (1, 2, or 3). */
  depth: 1 | 2 | 3;
  viaAccount: ActorProfile; // the account that led to this candidate
  hasBlockedYou: boolean;
  /** When the block record was created, if `hasBlockedYou` is true. */
  blockDate?: string;
  checked: boolean;
  error?: string;
}

export interface ScanProgress {
  phase: 'resolving' | 'collecting-follows' | 'collecting-network' | 'checking-blocks' | 'done' | 'error';
  message: string;
  current?: number;
  total?: number;
  /** Live snapshot of all candidates discovered so far, updated as each block check completes. */
  results?: CandidateResult[];
}

export type ProgressCallback = (progress: ScanProgress) => void;

/** Which page of the site is currently shown. */
export type Page = 'blockers' | 'ledger';

/** One account found in another account's block list. */
export interface BlockedAccountEntry {
  actor: ActorProfile;
  /** When the block record was created, if known. */
  blockedAt?: string;
}

export interface LedgerProgress {
  phase: 'resolving' | 'reading-blocks' | 'resolving-profiles' | 'done' | 'error';
  message: string;
  current?: number;
  total?: number;
  /** Present once the lookup finishes. */
  entries?: BlockedAccountEntry[];
}

export type LedgerProgressCallback = (progress: LedgerProgress) => void;
