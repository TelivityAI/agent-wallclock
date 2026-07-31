export interface Effort {
  id: string;
  name: string;
  startedAt: string;
  totalMs: number;
  sessionCount: number;
  lastActivityAt: string | null;
}

export interface Session {
  id: string;
  effortId: string;
  startedAt: string;
  endedAt: string | null;
}

export interface StoreData {
  version: 1;
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
  activeEffort: Effort | null;
  activeSession: Session | null;
  sessionAgeMs: number | null;
  effortAgeMs: number | null;
  effortTotalMs: number | null;
}
