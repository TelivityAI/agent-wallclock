export interface Effort {
  id: string;
  name: string;
  startedAt: string;
  totalMs: number;
  sessionCount: number;
  lastActivityAt: string | null;
  /** Soft-hidden from default list views; retained in store. */
  archived?: boolean;
}

export interface Session {
  id: string;
  effortId: string;
  startedAt: string;
  endedAt: string | null;
}

/**
 * Store schema version 1 (current on-disk format).
 * Version 2 migration path is prepared for archived flags and future fields;
 * loaders accept v1 and normalize to the in-memory shape.
 */
export type StoreVersion = 1 | 2;

export interface StoreData {
  version: StoreVersion;
  efforts: Effort[];
  sessions: Session[];
  activeSessionId: string | null;
  activeEffortId: string | null;
}

export interface NowInfo {
  iso: string;
  localDate: string;
  localTime: string;
  timezone: string;
  timezoneOffset: string;
  weekday: string;
  epochMs: number;
}

export interface BriefingInput {
  now: NowInfo;
  generatedAt: string;
  staleAfterMs: number;
  activeEffort: Effort | null;
  activeSession: Session | null;
  sessionAgeMs: number | null;
  effortAgeMs: number | null;
  effortTotalMs: number | null;
  openSessionWarn: boolean;
  openSessionCapNote: boolean;
}

export interface BriefingOptions {
  staleAfterMs?: number;
  openSessionWarnAfterMs?: number;
  openSessionSoftCapMs?: number;
  nowDate?: Date;
}
