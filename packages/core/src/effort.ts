import { ageMs } from "./format.js";
import { newId } from "./ids.js";
import type { Effort, StoreData } from "./types.js";

function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

export function findEffort(store: StoreData, nameOrId: string): Effort | undefined {
  const key = nameOrId.trim();
  const byId = store.efforts.find((e) => e.id === key);
  if (byId) return byId;
  const norm = normalizeName(key);
  return store.efforts.find((e) => normalizeName(e.name) === norm);
}

export function startEffort(
  store: StoreData,
  name: string,
  now: Date = new Date(),
): { store: StoreData; effort: Effort; created: boolean } {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error("Effort name is required");
  }

  const existing = findEffort(store, trimmed);
  if (existing) {
    const next: StoreData = {
      ...store,
      activeEffortId: existing.id,
    };
    return { store: next, effort: existing, created: false };
  }

  const effort: Effort = {
    id: newId("eff"),
    name: trimmed,
    startedAt: now.toISOString(),
    totalMs: 0,
    sessionCount: 0,
    lastActivityAt: null,
  };

  const next: StoreData = {
    ...store,
    efforts: [...store.efforts, effort],
    activeEffortId: effort.id,
  };

  return { store: next, effort, created: true };
}

export function listEfforts(store: StoreData): Effort[] {
  return [...store.efforts].sort((a, b) => {
    const aTime = Date.parse(a.lastActivityAt ?? a.startedAt);
    const bTime = Date.parse(b.lastActivityAt ?? b.startedAt);
    return bTime - aTime;
  });
}

export function effortStatus(
  store: StoreData,
  nameOrId?: string,
  now: Date = new Date(),
): {
  effort: Effort | null;
  ageMs: number | null;
  totalMs: number;
  isActive: boolean;
} {
  const effort = nameOrId
    ? findEffort(store, nameOrId) ?? null
    : store.activeEffortId
      ? store.efforts.find((e) => e.id === store.activeEffortId) ?? null
      : null;

  if (!effort) {
    return { effort: null, ageMs: null, totalMs: 0, isActive: false };
  }

  const age = ageMs(effort.startedAt, now);
  return {
    effort,
    ageMs: Number.isFinite(age) ? age : null,
    totalMs: effort.totalMs,
    isActive: store.activeEffortId === effort.id,
  };
}

export function logManualDuration(
  store: StoreData,
  nameOrId: string,
  durationMs: number,
  now: Date = new Date(),
): { store: StoreData; effort: Effort } {
  if (!Number.isFinite(durationMs) || durationMs <= 0) {
    throw new Error("Duration must be a positive number of milliseconds");
  }

  const effort = findEffort(store, nameOrId);
  if (!effort) {
    throw new Error(`Effort not found: ${nameOrId}`);
  }

  const updated: Effort = {
    ...effort,
    totalMs: effort.totalMs + durationMs,
    lastActivityAt: now.toISOString(),
  };

  const next: StoreData = {
    ...store,
    efforts: store.efforts.map((e) => (e.id === effort.id ? updated : e)),
    activeEffortId: effort.id,
  };

  return { store: next, effort: updated };
}
