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

/** Local-hour circadian band (fixed boundaries; opt-in via prefs). */
export type CircadianBand = "night" | "morning" | "afternoon" | "evening";

export type DayKind = "weekday" | "weekend";

export interface CircadianContext {
  band: CircadianBand;
  dayKind: DayKind;
  localHour: number;
  toneHint: string;
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
  /** Present only when circadian prefs are enabled; otherwise null. */
  circadian: CircadianContext | null;
}

export interface BriefingOptions {
  staleAfterMs?: number;
  openSessionWarnAfterMs?: number;
  openSessionSoftCapMs?: number;
  nowDate?: Date;
  /** Override store directory for prefs load (same as AGENT_WALLCLOCK_HOME). */
  storeDir?: string;
  /** Override circadian toggle (tests); when omitted, load from config.json. */
  circadianEnabled?: boolean;
}
