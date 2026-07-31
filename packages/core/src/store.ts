import { mkdirSync, readFileSync, renameSync, writeFileSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import type { StoreData } from "./types.js";

export const STORE_DIRNAME = ".agent-wallclock";
export const STORE_FILENAME = "store.json";

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

export function ensureStoreDir(storeDir: string = getDefaultStoreDir()): string {
  mkdirSync(storeDir, { recursive: true });
  return storeDir;
}

export function loadStore(storeDir: string = getDefaultStoreDir()): StoreData {
  const file = getStoreFilePath(storeDir);
  if (!existsSync(file)) {
    return emptyStore();
  }

  const raw = readFileSync(file, "utf8");
  const parsed = JSON.parse(raw) as StoreData;
  if (parsed.version !== 1 || !Array.isArray(parsed.efforts) || !Array.isArray(parsed.sessions)) {
    throw new Error(`Invalid Agent Wallclock store at ${file}`);
  }

  return {
    version: 1,
    efforts: parsed.efforts,
    sessions: parsed.sessions,
    activeSessionId: parsed.activeSessionId ?? null,
    activeEffortId: parsed.activeEffortId ?? null,
  };
}

export function saveStore(data: StoreData, storeDir: string = getDefaultStoreDir()): void {
  ensureStoreDir(storeDir);
  const file = getStoreFilePath(storeDir);
  const tmp = `${file}.tmp`;
  writeFileSync(tmp, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  renameSync(tmp, file);
}

export function initStore(storeDir: string = getDefaultStoreDir()): StoreData {
  ensureStoreDir(storeDir);
  const file = getStoreFilePath(storeDir);
  if (existsSync(file)) {
    return loadStore(storeDir);
  }
  const data = emptyStore();
  saveStore(data, storeDir);
  return data;
}
