import { ageMs } from "./format.js";
import { newId } from "./ids.js";
import { findEffort } from "./effort.js";
import type { Effort, Session, StoreData } from "./types.js";

function getEffortOrThrow(store: StoreData, effortId: string): Effort {
  const effort = store.efforts.find((e) => e.id === effortId);
  if (!effort) {
    throw new Error(`Effort not found: ${effortId}`);
  }
  return effort;
}

export function getActiveSession(store: StoreData): Session | null {
  if (!store.activeSessionId) return null;
  return store.sessions.find((s) => s.id === store.activeSessionId) ?? null;
}

export function sessionStatus(
  store: StoreData,
  now: Date = new Date(),
): {
  session: Session | null;
  effort: Effort | null;
  ageMs: number | null;
} {
  const session = getActiveSession(store);
  if (!session) {
    return { session: null, effort: null, ageMs: null };
  }
  const effort = store.efforts.find((e) => e.id === session.effortId) ?? null;
  const age = ageMs(session.startedAt, now);
  return {
    session,
    effort,
    ageMs: Number.isFinite(age) ? age : null,
  };
}

export function startSession(
  store: StoreData,
  effortNameOrId?: string,
  now: Date = new Date(),
  opts: { force?: boolean } = {},
): { store: StoreData; session: Session; effort: Effort; forcedEnd?: Session } {
  let working = store;
  let forcedEnd: Session | undefined;

  if (working.activeSessionId) {
    if (!opts.force) {
      throw new Error(
        "A session is already open. End it with `wallclock session end` first, or use `wallclock session start --force`.",
      );
    }
    const ended = endSession(working, now);
    working = ended.store;
    forcedEnd = ended.session;
  }

  let effortId = working.activeEffortId;
  if (effortNameOrId) {
    const found = findEffort(working, effortNameOrId);
    if (!found) {
      throw new Error(`Effort not found: ${effortNameOrId}`);
    }
    effortId = found.id;
  }

  if (!effortId) {
    throw new Error("No active effort. Start one with `wallclock effort start <name>`.");
  }

  const effort = getEffortOrThrow(working, effortId);
  const session: Session = {
    id: newId("ses"),
    effortId: effort.id,
    startedAt: now.toISOString(),
    endedAt: null,
  };

  const updatedEffort: Effort = {
    ...effort,
    sessionCount: effort.sessionCount + 1,
    lastActivityAt: now.toISOString(),
  };

  const next: StoreData = {
    ...working,
    efforts: working.efforts.map((e) => (e.id === effort.id ? updatedEffort : e)),
    sessions: [...working.sessions, session],
    activeSessionId: session.id,
    activeEffortId: effort.id,
  };

  return { store: next, session, effort: updatedEffort, forcedEnd };
}

export function endSession(
  store: StoreData,
  now: Date = new Date(),
): { store: StoreData; session: Session; effort: Effort; durationMs: number } {
  const session = getActiveSession(store);
  if (!session) {
    throw new Error("No open session.");
  }

  const duration = ageMs(session.startedAt, now);
  if (!Number.isFinite(duration)) {
    throw new Error("Open session has an invalid start time.");
  }

  const effort = getEffortOrThrow(store, session.effortId);
  const closed: Session = {
    ...session,
    endedAt: now.toISOString(),
  };
  const updatedEffort: Effort = {
    ...effort,
    totalMs: effort.totalMs + duration,
    lastActivityAt: now.toISOString(),
  };

  const next: StoreData = {
    ...store,
    sessions: store.sessions.map((s) => (s.id === session.id ? closed : s)),
    efforts: store.efforts.map((e) => (e.id === effort.id ? updatedEffort : e)),
    activeSessionId: null,
  };

  return { store: next, session: closed, effort: updatedEffort, durationMs: duration };
}

export interface TimelineOptions {
  limit?: number;
  effortName?: string;
  now?: Date;
}

export function timeline(
  store: StoreData,
  limitOrOpts: number | TimelineOptions = 20,
  nowArg: Date = new Date(),
): Array<{
  kind: "session";
  id: string;
  effortName: string;
  startedAt: string;
  endedAt: string | null;
  durationMs: number | null;
}> {
  const opts: TimelineOptions =
    typeof limitOrOpts === "number"
      ? { limit: limitOrOpts, now: nowArg }
      : limitOrOpts;
  const limit = opts.limit ?? 20;
  const now = opts.now ?? nowArg;
  const filterEffort = opts.effortName
    ? findEffort(store, opts.effortName)
    : undefined;
  if (opts.effortName && !filterEffort) {
    throw new Error(`Effort not found: ${opts.effortName}`);
  }

  const effortName = (id: string) =>
    store.efforts.find((e) => e.id === id)?.name ?? "unknown";

  return [...store.sessions]
    .filter((s) => (filterEffort ? s.effortId === filterEffort.id : true))
    .sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt))
    .slice(0, limit)
    .map((s) => {
      const start = Date.parse(s.startedAt);
      let durationMs: number | null = null;
      if (s.endedAt) {
        const end = Date.parse(s.endedAt);
        if (Number.isFinite(end) && Number.isFinite(start)) {
          durationMs = Math.max(0, end - start);
        }
      } else if (Number.isFinite(start)) {
        // Open rows always show live age relative to `now`.
        durationMs = Math.max(0, now.getTime() - start);
      }
      return {
        kind: "session" as const,
        id: s.id,
        effortName: effortName(s.effortId),
        startedAt: s.startedAt,
        endedAt: s.endedAt,
        durationMs,
      };
    });
}
