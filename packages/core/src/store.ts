import {
  chmodSync,
  closeSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import type { Effort, StoreData, StoreVersion } from "./types.js";

export const STORE_DIRNAME = ".agent-wallclock";
export const STORE_FILENAME = "store.json";
export const STORE_LOCK_FILENAME = "store.lock";
export const CURRENT_STORE_VERSION: StoreVersion = 1;
export const TARGET_STORE_VERSION: StoreVersion = 2;

const DIR_MODE = 0o700;
const FILE_MODE = 0o600;

export class StoreLockError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StoreLockError";
  }
}

export class StoreCorruptError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StoreCorruptError";
  }
}

export function emptyStore(): StoreData {
  return {
    version: 1,
    efforts: [],
    sessions: [],
    activeSessionId: null,
    activeEffortId: null,
  };
}

export function getDefaultStoreDir(home: string = homedir()): string {
  return join(home, STORE_DIRNAME);
}

export function getStoreFilePath(storeDir: string = getDefaultStoreDir()): string {
  return join(storeDir, STORE_FILENAME);
}

export function getStoreLockPath(storeDir: string = getDefaultStoreDir()): string {
  return join(storeDir, STORE_LOCK_FILENAME);
}

export function ensureStoreDir(storeDir: string = getDefaultStoreDir()): string {
  mkdirSync(storeDir, { recursive: true, mode: DIR_MODE });
  try {
    chmodSync(storeDir, DIR_MODE);
  } catch {
    // Best-effort on platforms that ignore mode bits.
  }
  return storeDir;
}

function isProcessAlive(pid: number): boolean {
  if (!Number.isFinite(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function sleepSync(ms: number): void {
  const waitUntil = Date.now() + ms;
  while (Date.now() < waitUntil) {
    // brief spin
  }
}

export interface LockOptions {
  /** Max wait for lock acquisition (ms). Default 2000. */
  timeoutMs?: number;
  /** If true, throw StoreLockError instead of proceeding unlocked. Default false for compat. */
  strict?: boolean;
}

/**
 * Best-effort exclusive lock around store mutations.
 * Stale locks (dead pid) are cleared. On timeout:
 * - strict=false (default): warn to stderr and proceed (last-write-wins fallback)
 * - strict=true: throw StoreLockError
 */
export function withStoreLock<T>(
  storeDir: string,
  fn: () => T,
  opts: LockOptions = {},
): T {
  ensureStoreDir(storeDir);
  const lockPath = getStoreLockPath(storeDir);
  const timeoutMs = opts.timeoutMs ?? 2000;
  const deadline = Date.now() + timeoutMs;
  let fd: number | null = null;
  let acquired = false;
  let waitMs = 25;

  while (!acquired && Date.now() < deadline) {
    try {
      fd = openSync(lockPath, "wx");
      writeFileSync(fd, `${process.pid}\n`, { encoding: "utf8" });
      acquired = true;
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code !== "EEXIST") {
        // Locking unsupported or unexpected — proceed unlocked.
        break;
      }
      try {
        const raw = readFileSync(lockPath, "utf8").trim();
        const pid = Number(raw);
        if (!isProcessAlive(pid)) {
          unlinkSync(lockPath);
          continue;
        }
      } catch {
        try {
          unlinkSync(lockPath);
        } catch {
          // ignore
        }
        continue;
      }
      sleepSync(waitMs);
      waitMs = Math.min(waitMs * 2, 200);
    }
  }

  if (!acquired && opts.strict) {
    throw new StoreLockError(
      `Could not acquire store lock at ${lockPath} within ${timeoutMs}ms. Another wallclock process may be writing. Retry shortly.`,
    );
  }

  if (!acquired) {
    console.error(
      `warning: store lock busy at ${lockPath}; proceeding without exclusive lock (last-write-wins). Set AGENT_WALLCLOCK_LOCK_STRICT=1 to fail instead.`,
    );
  }

  try {
    return fn();
  } finally {
    if (fd != null) {
      try {
        closeSync(fd);
      } catch {
        // ignore
      }
      try {
        unlinkSync(lockPath);
      } catch {
        // ignore
      }
    }
  }
}

/**
 * Normalize on-disk store to in-memory shape.
 * v1 → keep as v1; v2 fields (archived) already optional on Effort.
 * Future writers may bump version to 2 after ensuring all readers understand it.
 */
export function migrateStore(raw: StoreData): StoreData {
  const version = raw.version === 2 ? 2 : 1;
  const efforts: Effort[] = (raw.efforts ?? []).map((e) => ({
    id: e.id,
    name: e.name,
    startedAt: e.startedAt,
    totalMs: e.totalMs ?? 0,
    sessionCount: e.sessionCount ?? 0,
    lastActivityAt: e.lastActivityAt ?? null,
    ...(e.archived ? { archived: true } : {}),
  }));
  return {
    version,
    efforts,
    sessions: raw.sessions ?? [],
    activeSessionId: raw.activeSessionId ?? null,
    activeEffortId: raw.activeEffortId ?? null,
  };
}

/** Documented migration path: bump in-memory version when archived flags appear. */
export function ensureStoreV2(store: StoreData): StoreData {
  const needsV2 = store.efforts.some((e) => e.archived === true) || store.version === 2;
  if (!needsV2) return store;
  return { ...store, version: 2 };
}

export function loadStore(
  storeDir: string = getDefaultStoreDir(),
  opts: { repair?: boolean } = {},
): StoreData {
  const file = getStoreFilePath(storeDir);
  if (!existsSync(file)) {
    return emptyStore();
  }

  let raw: string;
  try {
    raw = readFileSync(file, "utf8");
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(
      `Could not read Agent Wallclock store at ${file}: ${message}`,
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    if (opts.repair) {
      return quarantineAndReset(storeDir, file, "corrupt JSON");
    }
    throw new StoreCorruptError(
      `Corrupt Agent Wallclock store at ${file}. Fix the JSON, delete the file, or run \`wallclock doctor --repair\`, then \`wallclock init\`.`,
    );
  }

  if (
    typeof parsed !== "object" ||
    parsed === null ||
    !((parsed as StoreData).version === 1 || (parsed as StoreData).version === 2) ||
    !Array.isArray((parsed as StoreData).efforts) ||
    !Array.isArray((parsed as StoreData).sessions)
  ) {
    if (opts.repair) {
      return quarantineAndReset(storeDir, file, "invalid schema");
    }
    throw new StoreCorruptError(
      `Invalid Agent Wallclock store at ${file} (expected version 1 or 2 with efforts/sessions arrays). Fix, delete, or run \`wallclock doctor --repair\`.`,
    );
  }

  return migrateStore(parsed as StoreData);
}

function quarantineAndReset(
  storeDir: string,
  file: string,
  reason: string,
): StoreData {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const quarantine = join(storeDir, `store.corrupt.${stamp}.json`);
  try {
    renameSync(file, quarantine);
  } catch {
    try {
      copyFileSync(file, quarantine);
      unlinkSync(file);
    } catch {
      // ignore
    }
  }
  console.error(
    `warning: quarantined bad store (${reason}) to ${quarantine}; starting empty store`,
  );
  const data = emptyStore();
  saveStore(data, storeDir);
  return data;
}

export function saveStore(
  data: StoreData,
  storeDir: string = getDefaultStoreDir(),
  opts: { retries?: number } = {},
): void {
  ensureStoreDir(storeDir);
  const file = getStoreFilePath(storeDir);
  const tmp = `${file}.tmp`;
  const retries = opts.retries ?? 3;
  const payload = `${JSON.stringify(ensureStoreV2(data), null, 2)}\n`;

  let lastErr: unknown;
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      writeFileSync(tmp, payload, {
        encoding: "utf8",
        mode: FILE_MODE,
      });
      renameSync(tmp, file);
      try {
        chmodSync(file, FILE_MODE);
      } catch {
        // Best-effort.
      }
      return;
    } catch (err) {
      lastErr = err;
      sleepSync(25 * (attempt + 1));
    }
  }
  const message = lastErr instanceof Error ? lastErr.message : String(lastErr);
  throw new Error(`Failed to save Agent Wallclock store at ${file}: ${message}`);
}

/**
 * Load → mutate → save under a best-effort store lock.
 */
export function updateStore(
  storeDir: string,
  updater: (store: StoreData) => StoreData,
): StoreData {
  const strict = process.env.AGENT_WALLCLOCK_LOCK_STRICT === "1";
  return withStoreLock(
    storeDir,
    () => {
      const next = updater(loadStore(storeDir));
      saveStore(next, storeDir);
      return next;
    },
    { strict },
  );
}

export function initStore(storeDir: string = getDefaultStoreDir()): StoreData {
  return withStoreLock(storeDir, () => {
    ensureStoreDir(storeDir);
    const file = getStoreFilePath(storeDir);
    if (existsSync(file)) {
      return loadStore(storeDir);
    }
    const data = emptyStore();
    saveStore(data, storeDir);
    return data;
  });
}

export function backupStore(
  storeDir: string = getDefaultStoreDir(),
  destPath?: string,
): string {
  ensureStoreDir(storeDir);
  const file = getStoreFilePath(storeDir);
  if (!existsSync(file)) {
    const data = emptyStore();
    saveStore(data, storeDir);
  }
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const uniq = `${stamp}-${process.hrtime.bigint().toString(36)}`;
  const dest = destPath ?? join(storeDir, `store.backup.${uniq}.json`);
  copyFileSync(getStoreFilePath(storeDir), dest);
  try {
    chmodSync(dest, FILE_MODE);
  } catch {
    // ignore
  }
  return dest;
}

export function restoreStore(
  backupPath: string,
  storeDir: string = getDefaultStoreDir(),
): StoreData {
  if (!existsSync(backupPath)) {
    throw new Error(`Backup not found: ${backupPath}`);
  }
  ensureStoreDir(storeDir);
  // Validate backup before replacing.
  const raw = readFileSync(backupPath, "utf8");
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new StoreCorruptError(`Backup is not valid JSON: ${backupPath}`);
  }
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    !Array.isArray((parsed as StoreData).efforts) ||
    !Array.isArray((parsed as StoreData).sessions)
  ) {
    throw new StoreCorruptError(`Backup has invalid store schema: ${backupPath}`);
  }
  // Snapshot current before overwrite.
  const current = getStoreFilePath(storeDir);
  if (existsSync(current)) {
    backupStore(storeDir);
  }
  copyFileSync(backupPath, current);
  try {
    chmodSync(current, FILE_MODE);
  } catch {
    // ignore
  }
  return loadStore(storeDir);
}
