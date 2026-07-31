import { ageMs } from "./format.js";
import { newId } from "./ids.js";
import type { Effort, StoreData } from "./types.js";

/**
 * Normalize an effort name for matching: lowercase, non-alnum → hyphens.
 * "Auth Rewrite" and "auth-rewrite" resolve to the same effort.
 */
export function slugifyEffortName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Levenshtein distance for near-duplicate warnings. */
export function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 0; i < a.length; i++) {
    let prev = i;
    for (let j = 0; j < b.length; j++) {
      const cur = row[j + 1]!;
      const cost = a[i] === b[j] ? 0 : 1;
      row[j + 1] = Math.min(row[j + 1]! + 1, row[j]! + 1, prev + cost);
      prev = cur;
    }
  }
  return row[b.length]!;
}

export function findNearDuplicateEffort(
  store: StoreData,
  name: string,
  maxDistance = 2,
): Effort | undefined {
  const slug = slugifyEffortName(name);
  if (!slug) return undefined;
  let best: Effort | undefined;
  let bestDist = Infinity;
  for (const e of store.efforts) {
    if (e.archived) continue;
    const other = slugifyEffortName(e.name);
    if (other === slug) continue;
    const d = editDistance(slug, other);
    if (d > 0 && d <= maxDistance && d < bestDist) {
      best = e;
      bestDist = d;
    }
  }
  return best;
}

export function findEffort(store: StoreData, nameOrId: string): Effort | undefined {
  const key = nameOrId.trim();
  if (!key) return undefined;
  const byId = store.efforts.find((e) => e.id === key);
  if (byId) return byId;
  const slug = slugifyEffortName(key);
  if (!slug) return undefined;
  return store.efforts.find((e) => slugifyEffortName(e.name) === slug);
}

export function startEffort(
  store: StoreData,
  name: string,
  now: Date = new Date(),
): { store: StoreData; effort: Effort; created: boolean; nearDuplicate?: Effort } {
  const slug = slugifyEffortName(name);
  if (!slug) {
    throw new Error("Effort name is required");
  }

  const existing = findEffort(store, slug);
  if (existing) {
    if (existing.archived) {
      const unarchived: Effort = { ...existing, archived: false };
      const next: StoreData = {
        ...store,
        efforts: store.efforts.map((e) => (e.id === existing.id ? unarchived : e)),
        activeEffortId: existing.id,
      };
      return { store: next, effort: unarchived, created: false };
    }
    const next: StoreData = {
      ...store,
      activeEffortId: existing.id,
    };
    return { store: next, effort: existing, created: false };
  }

  const nearDuplicate = findNearDuplicateEffort(store, slug);
  const effort: Effort = {
    id: newId("eff"),
    name: slug,
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

  return { store: next, effort, created: true, nearDuplicate };
}

export function renameEffort(
  store: StoreData,
  nameOrId: string,
  newName: string,
): { store: StoreData; effort: Effort } {
  const effort = findEffort(store, nameOrId);
  if (!effort) {
    throw new Error(`Effort not found: ${nameOrId}`);
  }
  const slug = slugifyEffortName(newName);
  if (!slug) {
    throw new Error("New effort name is required");
  }
  const clash = findEffort(store, slug);
  if (clash && clash.id !== effort.id) {
    throw new Error(`Effort name already in use: ${slug}`);
  }
  const updated: Effort = { ...effort, name: slug };
  const next: StoreData = {
    ...store,
    efforts: store.efforts.map((e) => (e.id === effort.id ? updated : e)),
  };
  return { store: next, effort: updated };
}

export function archiveEffort(
  store: StoreData,
  nameOrId: string,
  archived = true,
): { store: StoreData; effort: Effort } {
  const effort = findEffort(store, nameOrId);
  if (!effort) {
    throw new Error(`Effort not found: ${nameOrId}`);
  }
  const updated: Effort = { ...effort, archived };
  let next: StoreData = {
    ...store,
    efforts: store.efforts.map((e) => (e.id === effort.id ? updated : e)),
  };
  if (archived && next.activeEffortId === effort.id) {
    next = { ...next, activeEffortId: null };
  }
  return { store: next, effort: updated };
}

export function deleteEffort(
  store: StoreData,
  nameOrId: string,
): { store: StoreData; deleted: Effort } {
  const effort = findEffort(store, nameOrId);
  if (!effort) {
    throw new Error(`Effort not found: ${nameOrId}`);
  }
  const open = store.activeSessionId
    ? store.sessions.find((s) => s.id === store.activeSessionId)
    : undefined;
  if (open && open.effortId === effort.id) {
    throw new Error(
      `Cannot delete effort "${effort.name}" while a session is open on it. End the session first.`,
    );
  }
  const next: StoreData = {
    ...store,
    efforts: store.efforts.filter((e) => e.id !== effort.id),
    sessions: store.sessions.filter((s) => s.effortId !== effort.id),
    activeEffortId: store.activeEffortId === effort.id ? null : store.activeEffortId,
  };
  return { store: next, deleted: effort };
}

export function listEfforts(
  store: StoreData,
  opts: { includeArchived?: boolean } = {},
): Effort[] {
  const includeArchived = opts.includeArchived ?? false;
  return [...store.efforts]
    .filter((e) => includeArchived || !e.archived)
    .sort((a, b) => {
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
  let totalMs = effort.totalMs;
  const open =
    store.activeSessionId != null
      ? store.sessions.find((s) => s.id === store.activeSessionId)
      : undefined;
  if (open && open.effortId === effort.id) {
    const openAge = ageMs(open.startedAt, now);
    if (Number.isFinite(openAge)) {
      totalMs += openAge;
    }
  }

  return {
    effort,
    ageMs: Number.isFinite(age) ? age : null,
    totalMs,
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
