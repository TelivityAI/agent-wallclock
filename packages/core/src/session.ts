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

export function startSession(
  store: StoreData,
  effortNameOrId?: string,
  now: Date = new Date(),
): { store: StoreData; session: Session; effort: Effort } {
  if (store.activeSessionId) {
    throw new Error("A session is already open. End it with `wallclock session end` first.");
  }

  let effortId = store.activeEffortId;
  if (effortNameOrId) {
    const found = findEffort(store, effortNameOrId);
    if (!found) {
      throw new Error(`Effort not found: ${effortNameOrId}`);
    }
    effortId = found.id;
  }

  if (!effortId) {
    throw new Error("No active effort. Start one with `wallclock effort start <name>`.");
  }

  const effort = getEffortOrThrow(store, effortId);
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
    ...store,
    efforts: store.efforts.map((e) => (e.id === effort.id ? updatedEffort : e)),
    sessions: [...store.sessions, session],
    activeSessionId: session.id,
    activeEffortId: effort.id,
  };

  return { store: next, session, effort: updatedEffort };
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

export function timeline(
  store: StoreData,
  limit = 20,
  now: Date = new Date(),
): Array<{
  kind: "session";
  id: string;
  effortName: string;
  startedAt: string;
  endedAt: string | null;
  durationMs: number | null;
}> {
  const effortName = (id: string) =>
    store.efforts.find((e) => e.id === id)?.name ?? "unknown";

  return [...store.sessions]
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
