import {
  chmodSync,
  existsSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { ensureStoreDir, getDefaultStoreDir } from "./store.js";

export const PREFS_FILENAME = "config.json";

const FILE_MODE = 0o600;

export interface WallclockPrefs {
  circadianEnabled: boolean;
}

export function defaultPrefs(): WallclockPrefs {
  return { circadianEnabled: false };
}

export function getPrefsFilePath(storeDir: string = getDefaultStoreDir()): string {
  return join(storeDir, PREFS_FILENAME);
}

export function loadPrefs(storeDir: string = getDefaultStoreDir()): WallclockPrefs {
  const file = getPrefsFilePath(storeDir);
  if (!existsSync(file)) {
    return defaultPrefs();
  }
  try {
    const raw = JSON.parse(readFileSync(file, "utf8")) as Partial<WallclockPrefs>;
    return {
      circadianEnabled: Boolean(raw.circadianEnabled),
    };
  } catch {
    return defaultPrefs();
  }
}

export function savePrefs(
  prefs: WallclockPrefs,
  storeDir: string = getDefaultStoreDir(),
): void {
  ensureStoreDir(storeDir);
  const file = getPrefsFilePath(storeDir);
  const tmp = `${file}.tmp`;
  const payload = `${JSON.stringify(
    { circadianEnabled: Boolean(prefs.circadianEnabled) },
    null,
    2,
  )}\n`;
  writeFileSync(tmp, payload, { encoding: "utf8", mode: FILE_MODE });
  renameSync(tmp, file);
  try {
    chmodSync(file, FILE_MODE);
  } catch {
    // Best-effort on platforms that ignore mode bits.
  }
}
