import {
  chmodSync,
  closeSync,
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
import type { StoreData } from "./types.js";

export const STORE_DIRNAME = ".agent-wallclock";
export const STORE_FILENAME = "store.json";
export const STORE_LOCK_FILENAME = "store.lock";

const DIR_MODE = 0o700;
const FILE_MODE = 0o600;

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

/**
 * Best-effort exclusive lock around store mutations.
 * Stale locks (dead pid) are cleared. If a live lock cannot be acquired
 * after a short wait, the callback still runs (documented last-write-wins fallback).
 */
export function withStoreLock<T>(storeDir: string, fn: () => T): T {
  ensureStoreDir(storeDir);
  const lockPath = getStoreLockPath(storeDir);
  const deadline = Date.now() + 1000;
  let fd: number | null = null;
  let acquired = false;

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
      const waitUntil = Date.now() + 25;
      while (Date.now() < waitUntil) {
        // brief spin while another process holds the lock
      }
    }
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

export function loadStore(storeDir: string = getDefaultStoreDir()): StoreData {
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
    throw new Error(
      `Corrupt Agent Wallclock store at ${file}. Fix the JSON or delete the file, then run \`wallclock init\`.`,
    );
  }

  if (
    typeof parsed !== "object" ||
    parsed === null ||
    (parsed as StoreData).version !== 1 ||
    !Array.isArray((parsed as StoreData).efforts) ||
    !Array.isArray((parsed as StoreData).sessions)
  ) {
    throw new Error(
      `Invalid Agent Wallclock store at ${file} (expected version 1 with efforts/sessions arrays). Fix or delete the file, then run \`wallclock init\`.`,
    );
  }

  const data = parsed as StoreData;
  return {
    version: 1,
    efforts: data.efforts,
    sessions: data.sessions,
    activeSessionId: data.activeSessionId ?? null,
    activeEffortId: data.activeEffortId ?? null,
  };
}

export function saveStore(data: StoreData, storeDir: string = getDefaultStoreDir()): void {
  ensureStoreDir(storeDir);
  const file = getStoreFilePath(storeDir);
  const tmp = `${file}.tmp`;
  writeFileSync(tmp, `${JSON.stringify(data, null, 2)}\n`, {
    encoding: "utf8",
    mode: FILE_MODE,
  });
  renameSync(tmp, file);
  try {
    chmodSync(file, FILE_MODE);
  } catch {
    // Best-effort.
  }
}

/**
 * Load → mutate → save under a best-effort store lock.
 */
export function updateStore(
  storeDir: string,
  updater: (store: StoreData) => StoreData,
): StoreData {
  return withStoreLock(storeDir, () => {
    const next = updater(loadStore(storeDir));
    saveStore(next, storeDir);
    return next;
  });
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
